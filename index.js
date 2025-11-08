import { event_types, eventSource } from '../../../events.js';
import { getTokenCount } from '../../../tokenizers.js';
import { getContext } from '../../../extensions.js';
import { characters, getMaxContextSize } from '../../../../script.js';
import { loadWorldInfo, saveWorldInfo, worldInfoCache, world_info_character_strategy, world_info_insertion_strategy, world_info_budget, world_info_budget_cap, world_names } from '../../../world-info.js';
import { POPUP_TYPE, Popup } from '../../../popup.js';
import { addLocaleData, getCurrentLocale, translate, t, applyLocale } from '../../../i18n.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { ARGUMENT_TYPE, SlashCommandArgument } from '../../../slash-commands/SlashCommandArgument.js';

const EXTENSION_NAME = 'stlo';
const SELECTORS = {
    WORLD_INFO_SEARCH: 'world_info_search',
    LOREBOOK_ORDERING_BUTTON: 'lorebook_ordering_button',
    WORLD_EDITOR_SELECT: '#world_editor_select',
    LOREBOOK_PRIORITY_SELECT: 'lorebook_priority_select',
    LOREBOOK_BUDGET_MODE: 'lorebook_budget_mode',
    LOREBOOK_BUDGET_VALUE: 'lorebook_budget_value',
    LOREBOOK_BUDGET_VALUE_CONTAINER: 'lorebook_budget_value_container'
};

// Default settings for lorebooks
const DEFAULT_LOREBOOK_SETTINGS = {
    priority: null,     // null = default priority (3)
    budget: null,       // value semantics depend on budgetMode
    budgetMode: 'default', // 'default' | 'percentage_context' | 'percentage_budget' | 'fixed'
    orderAdjustment: 0, // Order adjustment value (-10000 to +10000, default 0)
    orderAdjustmentGroupOnly: false, // Only apply order adjustment in group chats
    characterOverrides: {},  // Character-specific priority overrides for group chats
    onlyWhenSpeaking: false  // Only activate in group chats when assigned characters are speaking
};

// Cleanup tracking
let eventListeners = [];

// Priority constants
const PRIORITY_LEVELS = {
    LOWEST: 1,
    LOW: 2,
    DEFAULT: 3,
    HIGH: 4,
    HIGHEST: 5
};

// Extension state tracking
const EXTENSION_STATE = {
    modalOpen: false,
    pendingAnimationFrame: null,
    currentSpeakingCharacter: null,  // Track current speaking character for group chat overrides
    budgetHandlersRegistered: false
};

// Debugging flag and helper
const DEBUG_STLO = false;
function stloDebug(...args) {
    if (DEBUG_STLO && typeof console !== 'undefined') {
        console.info('[STLO][DEBUG]', ...args);
    }
}

// Utility functions

// STLO i18n adapter: load extension locale and key-based interpolation
const EXT_BASE_URL = new URL('.', import.meta.url);
async function loadStloLocale() {
    try {
        const current = String(getCurrentLocale() || 'en').toLowerCase();
        const base = current.split('-')[0];
        const candidates = [current, base, 'en'];
        const TIMEOUT_MS = 3000;

        // Small helper for fetch timeouts
        const fetchWithTimeout = async (resource, ms) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), ms);
            try {
                return await fetch(resource, { signal: controller.signal });
            } finally {
                clearTimeout(id);
            }
        };

        console.info('[STLO i18n] current locale:', current, 'candidates:', candidates.join(', '));
        for (const code of candidates) {
            try {
                const url = new URL(`./locales/${code}.json`, EXT_BASE_URL);
                console.info('[STLO i18n] trying locale file:', url.href, `(timeout ${TIMEOUT_MS}ms)`);
                const res = await fetchWithTimeout(url, TIMEOUT_MS);
                if (res && res.ok) {
                    const data = await res.json();
                    addLocaleData(current, data);
                    console.info('[STLO i18n] loaded locale data for:', code, 'merged into:', current);
                    // Quick sanity check: this should print the localized value (e.g., Chinese) when locale is zh-cn
                    const sample = translate('Configure STLO Priority & Budget', 'stlo.button.configure');
                    console.info('[STLO i18n] sample stlo.button.configure =', sample);
                    break; // first available wins
                } else {
                    console.info('[STLO i18n] not found or not ok for:', code, 'status:', res?.status);
                }
            } catch (e) {
                if (e && (e.name === 'AbortError' || e.code === 'ABORT_ERR')) {
                    console.info('[STLO i18n] timeout while trying code:', code, '— moving to next candidate');
                } else {
                    console.info('[STLO i18n] error while trying code:', code, e);
                }
                // ignore and try next
            }
        }
        // Re-apply locale so existing DOM picks up newly injected keys
        try {
            applyLocale();
            console.info('[STLO i18n] applyLocale() completed');
            // Expose a debug helper in DevTools: run window.stloI18nStatus()
            try {
                // eslint-disable-next-line no-undef
                window.stloI18nStatus = () => {
                    const cur = String(getCurrentLocale() || 'en').toLowerCase();
                    const sample = translate('Configure STLO Priority & Budget', 'stlo.button.configure');
                    console.table({ currentLocale: cur, 'stlo.button.configure': sample });
                    return { currentLocale: cur, sample };
                };
            } catch (e2) {
                console.info('[STLO i18n] window not available to expose stloI18nStatus:', e2);
            }
        } catch (e) {
            console.warn('[STLO i18n] applyLocale() threw:', e);
        }
    } catch (e) {
        console.warn('[STLO] i18n load failed:', e);
    }
}

/**
 * Interpolate a translation string by stable key using ${index} placeholders.
 * Example: tKey('stlo.settings.saved', 'STLO settings saved for ${0}', currentLorebook)
 */
function tKey(key, fallback, ...values) {
    const template = translate(fallback, key);
    return template.replace(/\$\{(\d+)\}/g, (_, i) => String(values[i] ?? ''));
}

function cleanupListeners(listeners, listenerArray) {
    listeners.forEach(({ source, event, handler }) => {
        try {
            if (source && typeof source.off === 'function') {
                source.off(event, handler);
            } else if (source && typeof source.removeListener === 'function') {
                source.removeListener(event, handler);
            }
        } catch (error) {
            console.error('Error removing event listener:', error);
        }
    });
    listenerArray.length = 0;
}

/**
 * Set up event handlers for world info integration
 */
function setupEventHandlers() {
    // Clean up existing event listeners
    cleanupListeners(eventListeners, eventListeners);

    // Hook into world info entries loading to apply our sorting
    const handler = (data) => handleWorldInfoEntriesLoaded(data);
    eventSource.on(event_types.WORLDINFO_ENTRIES_LOADED, handler);

    const chatChangedHandler = () => {
        EXTENSION_STATE.currentSpeakingCharacter = null;  // Clear character override state on chat change
    };

    // Group chat character override handler
    const groupMemberDraftedHandler = (chId) => {
        // Clear any stale state first, then set current speaking character
        EXTENSION_STATE.currentSpeakingCharacter = null;

        if (chId !== undefined && chId !== null && characters && characters[chId]) {
            const character = characters[chId];
            const characterName = (character?.avatar?.replace(/\.[^/.]+$/, '') || character?.name || null);
            EXTENSION_STATE.currentSpeakingCharacter = characterName;
        }
    };

    eventSource.on(event_types.CHAT_CHANGED, chatChangedHandler);
    eventSource.on(event_types.GROUP_MEMBER_DRAFTED, groupMemberDraftedHandler);

    // Track for cleanup
    eventListeners.push(
        { source: eventSource, event: event_types.WORLDINFO_ENTRIES_LOADED, handler: handler },
        { source: eventSource, event: event_types.CHAT_CHANGED, handler: chatChangedHandler },
        { source: eventSource, event: event_types.GROUP_MEMBER_DRAFTED, handler: groupMemberDraftedHandler }
    );
}

/**
 * Add the lorebook ordering button to the world info panel
 */
function addLorebookOrderingButton() {
    const createButton = () => {
        const worldInfoSearch = document.getElementById(SELECTORS.WORLD_INFO_SEARCH);

        // Check if button already exists or world info search not available
        if (!worldInfoSearch || document.getElementById(SELECTORS.LOREBOOK_ORDERING_BUTTON)) {
            return false;
        }

        // Create the button
        const button = document.createElement('div');
        button.id = SELECTORS.LOREBOOK_ORDERING_BUTTON;
        button.className = 'menu_button fa-solid fa-bars-staggered';
        button.setAttribute('data-i18n', '[title]stlo.button.configure; [aria-label]stlo.button.configure');
        button.title = translate('Configure STLO Priority & Budget', 'stlo.button.configure');
        button.setAttribute('aria-label', translate('Configure STLO Priority & Budget', 'stlo.button.configure'));

        // Add click handler
        button.addEventListener('click', async () => {
            await openLorebookSettings();
        });

        worldInfoSearch.parentNode.insertBefore(button, worldInfoSearch);
        return true;
    };

    // Try to create button immediately (in case world info panel is already open)
    if (createButton()) {
        return;
    }

    // If immediate creation failed, wait for world info panel to be loaded
    const handleWorldInfoLoaded = () => {
        if (createButton()) {
            // Button created successfully, remove this listener
            eventSource.removeListener(event_types.WORLDINFO_UPDATED, handleWorldInfoLoaded);
            // Also remove from tracking array
            const index = eventListeners.findIndex(listener =>
                listener.source === eventSource &&
                listener.event === event_types.WORLDINFO_UPDATED &&
                listener.handler === handleWorldInfoLoaded
            );
            if (index !== -1) {
                eventListeners.splice(index, 1);
            }
        }
    };

    eventSource.on(event_types.WORLDINFO_UPDATED, handleWorldInfoLoaded);
    eventListeners.push({ source: eventSource, event: event_types.WORLDINFO_UPDATED, handler: handleWorldInfoLoaded });
}

/**
 * Handle the WORLDINFO_ENTRIES_LOADED event to apply our sorting
 * @param {Object} eventData - Contains globalLore, characterLore, chatLore, personaLore arrays
 */
async function handleWorldInfoEntriesLoaded(eventData) {
    try {
        // Validate payload early
        if (!eventData || typeof eventData !== 'object') return;

        // Ensure arrays exist on the original object (so mutations affect caller)
        const gl = Array.isArray(eventData.globalLore) ? eventData.globalLore : (eventData.globalLore = []);
        const cl = Array.isArray(eventData.characterLore) ? eventData.characterLore : (eventData.characterLore = []);
        const chat = Array.isArray(eventData.chatLore) ? eventData.chatLore : (eventData.chatLore = []);
        const persona = Array.isArray(eventData.personaLore) ? eventData.personaLore : (eventData.personaLore = []);

        // Decide target safely (guard enum access with optional chaining)
        const target = (world_info_character_strategy === (world_info_insertion_strategy?.character_first))
            ? cl
            : gl;

        if (!Array.isArray(target)) return;

        // Neutralize chat/persona precedence so core can't prepend them
        if (chat.length) {
            // Defend against rare aliasing (chat === target)
            if (chat !== target) target.push(...chat);
            chat.length = 0; // in-place clear
        }
        if (persona.length) {
            if (persona !== target) target.push(...persona);
            persona.length = 0; // in-place clear
        }

        // Optional stability: keep local order stable
        if (target.length) {
            target.sort((a, b) => ((b?.order ?? 100) - (a?.order ?? 100)));
        }

        // Always apply STLO ordering across strategies
        await applyPriorityOrdering(eventData);
        await enforceBudgetPreScan(eventData);
    } catch (error) {
        console.warn('[STLO] handleWorldInfoEntriesLoaded error:', error);
    }
}

/**
 * Get settings for a specific lorebook
 * @param {string} worldName - Name of the lorebook
 * @returns {Object} Lorebook settings or defaults
 */
async function getLorebookSettings(worldName) {
    try {
        // Cache-first: avoid backend fetches that may be gated by permissions/visibility
        if (worldInfoCache.has(worldName)) {
            const worldData = worldInfoCache.get(worldName);
            const extensionData = worldData && typeof worldData === 'object' ? worldData[EXTENSION_NAME] : null;
            return { ...DEFAULT_LOREBOOK_SETTINGS, ...(extensionData || {}) };
        }

        // Not in cache: intentionally return defaults without fetching
        return { ...DEFAULT_LOREBOOK_SETTINGS };
    } catch (error) {
        console.error(`Error reading STLO settings for ${worldName} from cache:`, error);
        return { ...DEFAULT_LOREBOOK_SETTINGS };
    }
}

/**
 * Save settings for a specific lorebook
 * @param {string} worldName - Name of the lorebook
 * @param {Object} settings - Settings to save
 */
async function setLorebookSettings(worldName, settings) {
    try {
        const worldData = await loadWorldInfo(worldName);

        if (!worldData) {
            toastr.error(tKey('stlo.settings.loadError.body', 'Could not load settings for lorebook: ${0}', worldName), translate('Settings Error', 'stlo.settings.loadError.title'));
            return false;
        }

        // Save extension settings directly on the world data object (preserve existing keys)
        const existing = (worldData[EXTENSION_NAME] && typeof worldData[EXTENSION_NAME] === 'object') ? worldData[EXTENSION_NAME] : {};
        const finalSettings = { ...DEFAULT_LOREBOOK_SETTINGS, ...existing, ...settings };
        worldData[EXTENSION_NAME] = finalSettings;

        // Save the world data back immediately
        await saveWorldInfo(worldName, worldData, true);

        // Hot-update cache so subsequent reads see fresh settings immediately
        try {
            worldInfoCache.set(worldName, worldData);
        } catch (e) {
            console.warn('STLO: Failed to update worldInfoCache after save:', e);
        }

        // Reset budget-related state so new budgets apply on next generation
        try {
            EXTENSION_STATE.dropSet = null;
            EXTENSION_STATE.dropEntries = [];
        } catch (e) {
            console.warn('STLO: Failed to reset budget state after save:', e);
        }

        // Notify UI/listeners that World Info has updated so panels can re-render
        try {
            if (typeof eventSource?.emit === 'function') {
                eventSource.emit(event_types.WORLDINFO_UPDATED);
            }
        } catch (e) {
            console.warn('STLO: Failed to emit WORLDINFO_UPDATED after save:', e);
        }

        return true;
    } catch (error) {
        console.error(`Error saving settings for ${worldName}:`, error);
        toastr.error(tKey('stlo.settings.saveError.body', 'Error saving settings for ${0}', worldName), translate('Save Error', 'stlo.settings.saveError.title'));
        return false;
    }
}

/**
 * Get the currently active/selected lorebook name
 * @returns {string|null} Name of the active lorebook
 */
function getCurrentLorebookName() {
    // Check if we're in the world info editor (matching SillyTavern's pattern)
    const worldSelect = document.querySelector(SELECTORS.WORLD_EDITOR_SELECT);
    if (worldSelect && worldSelect.value !== '' && worldSelect.value !== 'none') {
        const selectedIndex = parseInt(worldSelect.value);
        if (!isNaN(selectedIndex) && world_names && Array.isArray(world_names) &&
            selectedIndex >= 0 && selectedIndex < world_names.length &&
            world_names[selectedIndex]) { // Ensure array element exists
            const selectedName = world_names[selectedIndex];
            // Ensure the selected name is a valid non-empty string
            if (selectedName && typeof selectedName === 'string' && selectedName.trim() !== '') {
                return selectedName;
            }
        }
    }

    return null;
}

// Case-insensitive lorebook index lookup
function findLorebookIndexByName(name) {
    try {
        if (!name) return -1;
        const target = String(name).trim().toLowerCase();
        if (!Array.isArray(world_names)) return -1;
        return world_names.findIndex(n => typeof n === 'string' && n.trim().toLowerCase() === target);
    } catch {
        return -1;
    }
}

// Select a lorebook by index in the World Info selector
async function selectLorebookByIndex(index) {
    const worldSelect = document.querySelector(SELECTORS.WORLD_EDITOR_SELECT);
    if (!worldSelect) return false;
    if (!Array.isArray(world_names) || index < 0 || index >= world_names.length) return false;
    worldSelect.value = String(index);
    worldSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 1));
    return true;
}

// Open STLO modal for a specific lorebook name (required, case-insensitive)
async function openStloForLorebook(name) {
    const trimmed = String(name ?? '').trim();
    if (!trimmed) {
        toastr.warning(translate('Usage: /stlo <lorebook name>', 'stlo.cmd.usage'));
        return '';
    }

    const idx = findLorebookIndexByName(trimmed);
    if (idx === -1) {
        toastr.warning(tKey('stlo.cmd.notfound', 'Lorebook not found: ${0}', trimmed));
        return '';
    }

    // Attempt selection (silently continue if not possible), then open modal
    await selectLorebookByIndex(idx);
    await openLorebookSettings();
    return '';
}

// Register the /stlo slash command
function registerStloSlashCommand() {
    try {
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'stlo',
            callback: async (_args, value) => {
                return await openStloForLorebook(typeof value === 'string' ? value : '');
            },
            unnamedArgumentList: [
                SlashCommandArgument.fromProps({
                    description: translate('lorebook name (case-insensitive)', 'stlo.cmd.arg.name'),
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: `
                <div>${translate('Open STLO Priority & Budget for a specific lorebook.', 'stlo.cmd.help')}</div>
                <div><code>/stlo My Lorebook</code></div>
            `,
        }));
    } catch (e) {
        console.warn('[STLO] Failed to register /stlo command:', e);
    }
}

/**
 * Open the lorebook settings modal
 */
async function openLorebookSettings() {
    // Use try-finally to ensure modal state is always reset
    try {
        // Atomic lock to prevent race conditions
        if (EXTENSION_STATE.modalOpen) {
            return;
        }

        EXTENSION_STATE.modalOpen = true;

        // Settings opening

        const currentLorebook = getCurrentLorebookName();
        if (!currentLorebook) {
            EXTENSION_STATE.modalOpen = false;
            toastr.info(
                translate('Create or select a World Info file first.', 'stlo.info.noLorebook'),
                translate('World Info is not set', 'stlo.info.noLorebookTitle'),
                { timeOut: 10000, preventDuplicates: true }
            );
            return;
        }

        // Get current settings
        const currentSettings = await getLorebookSettings(currentLorebook);

        // Create modal HTML - single vertical scrolling content
        const modalHtml = `
            <div class="world_entry_form_control MarginBot5 alignCenteritems">
                <h3 class="marginBot10" data-i18n="stlo.modal.title">📚 ST Lorebook Ordering</h3>
                <h4 data-i18n="stlo.modal.priority.title">Lorebook Priority</h4>
                <small data-i18n="stlo.modal.priority.help">Higher numbers (4-5) process first. Lower numbers (1-2) process last.</small>

                <select id="${SELECTORS.LOREBOOK_PRIORITY_SELECT}" class="text_pole textarea_compact">
                    <option value="5" ${currentSettings.priority === 5 ? 'selected' : ''} data-i18n="stlo.modal.priority.option.5">5 - Highest Priority (Processes First)</option>
                    <option value="4" ${currentSettings.priority === 4 ? 'selected' : ''} data-i18n="stlo.modal.priority.option.4">4 - High Priority</option>
                    <option value="null" ${currentSettings.priority === null ? 'selected' : ''} data-i18n="stlo.modal.priority.option.3">3 - Normal (SillyTavern Default)</option>
                    <option value="2" ${currentSettings.priority === 2 ? 'selected' : ''} data-i18n="stlo.modal.priority.option.2">2 - Low Priority</option>
                    <option value="1" ${currentSettings.priority === 1 ? 'selected' : ''} data-i18n="stlo.modal.priority.option.1">1 - Lowest Priority (Processes Last)</option>
                </select>
            </div>

            <div class="world_entry_form_control MarginTop10">
                <label class="checkbox_label" for="lorebook-order-adjustment-enabled">
                    <input type="checkbox" id="lorebook-order-adjustment-enabled"
                           ${currentSettings.orderAdjustment !== 0 ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    <span data-i18n="stlo.modal.order.enableLabel">Enable Order Adjustment</span>
                </label>
                <small data-i18n="stlo.modal.order.help">Fine-tune processing order within this lorebook's priority level</small>

                <div class="world_entry_form_control MarginTop10${currentSettings.orderAdjustment !== 0 ? '' : ' hidden'}" id="lorebook-order-adjustment-container">
                    <h4 data-i18n="stlo.modal.order.title">Order Adjustment</h4>
                    <small data-i18n="stlo.modal.order.explain">Higher values process first. Examples: +250 for slight boost, -500 for lower priority.</small>
                    <div class="flexNoWrap flexGap5 justifyCenter">
                        <input type="number" id="lorebook-order-adjustment" class="text_pole textarea_compact"
                               value="${currentSettings.orderAdjustment}" min="-10000" max="10000" step="1"
                               placeholder="0" style="width: 100px;">
                        <small style="color: #888;" data-i18n="stlo.modal.order.range">-10k to +10k</small>
                    </div>

                    <div class="MarginTop10">
                        <label class="checkbox_label" for="lorebook-order-adjustment-group-only">
                            <input type="checkbox" id="lorebook-order-adjustment-group-only"
                                   ${currentSettings.orderAdjustmentGroupOnly ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            <span data-i18n="stlo.modal.order.groupOnly.label">Group Chats Only</span>
                        </label>
                        <small data-i18n="stlo.modal.order.groupOnly.help">Only apply order adjustment during group chats (ignored in single character chats)</small>
                    </div>
                </div>
            </div>

            <div class="world_entry_form_control MarginBot5">
                ${createBudgetControls('lorebook', currentSettings)}
            </div>

            <!-- Only When Speaking Toggle -->
            <div class="world_entry_form_control MarginTop10">
                <label class="checkbox_label" for="lorebook-only-when-speaking">
                    <input type="checkbox" id="lorebook-only-when-speaking"
                           ${currentSettings.onlyWhenSpeaking ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    <span data-i18n="stlo.modal.onlyWhenSpeaking.label">Group chats: Only activate for specific characters (requires character assignments below)</span>
                </label>
                <small>
                    <span data-i18n="stlo.modal.onlyWhenSpeaking.help.1">When enabled, this lorebook will only activate when characters assigned in Group Chat Overrides are speaking.</span>
                    <strong data-i18n="stlo.modal.onlyWhenSpeaking.help.2">If this box is checked but no characters are assigned below, this lorebook WILL NOT ACTIVATE during group chats.</strong>
                </small>
            </div>

            <!-- Group Chat Overrides -->
            <div class="inline-drawer wide100p world_entry_form_control MarginTop10 MarginBot10">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b data-i18n="stlo.modal.groupOverrides.title">Group Chat Overrides</b>
                    <div class="fa-solid fa-circle-chevron-down inline-drawer-icon down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="info-block warning MarginBot10">
                        <small data-i18n="stlo.modal.groupOverrides.info">If a character is selected in here, the priority settings here will override the lorebook's default setting only during that character's speaking turns in a group chat.</small>
                    </div>
                    <div class="info-block MarginBot10">
                        <h4><span data-i18n="stlo.modal.groupOverrides.defaultPriority.title">Default Priority:</span> <span id="default-priority-display" data-i18n="stlo.modal.groupOverrides.defaultPriority.value">3 - Normal</span></h4>
                        <small data-i18n="stlo.modal.groupOverrides.defaultPriority.help">Characters not specifically listed will use the priority level set above. Single-character chats always use the default.</small>
                    </div>
                    <div id="advanced-priority-sections">
                        <!-- Priority sections will be inserted here -->
                    </div>
                </div>
            </div>
        `;

        // Show the modal and set up behavior
        const result = await new Promise((resolve) => {
            let modalEventListeners = [];

            // Function to capture current form state
            const captureFormState = () => {
                const prioritySelect = document.getElementById(SELECTORS.LOREBOOK_PRIORITY_SELECT);
                const budgetModeSelect = document.getElementById(SELECTORS.LOREBOOK_BUDGET_MODE);
                const budgetValueInput = document.getElementById(SELECTORS.LOREBOOK_BUDGET_VALUE);
                const orderAdjustmentEnabled = document.getElementById('lorebook-order-adjustment-enabled');
                const orderAdjustmentInput = document.getElementById('lorebook-order-adjustment');
                const orderAdjustmentGroupOnly = document.getElementById('lorebook-order-adjustment-group-only');
                const onlyWhenSpeaking = document.getElementById('lorebook-only-when-speaking');

                if (prioritySelect && budgetModeSelect && budgetValueInput && orderAdjustmentEnabled && orderAdjustmentInput && orderAdjustmentGroupOnly && onlyWhenSpeaking) {
                    return {
                        priority: prioritySelect.value,
                        budgetMode: budgetModeSelect.value,
                        budget: budgetValueInput.value,
                        orderAdjustmentEnabled: orderAdjustmentEnabled.checked,
                        orderAdjustment: orderAdjustmentInput.value,
                        orderAdjustmentGroupOnly: orderAdjustmentGroupOnly.checked,
                        onlyWhenSpeaking: onlyWhenSpeaking.checked,
                        timestamp: Date.now()
                    };
                }
                return null;
            };

            // Function to validate and process form data
            const validateAndProcessForm = (formState) => {
                if (!formState) {
                    toastr.error(translate('Settings form not properly loaded. Please try again.', 'stlo.validation.formNotLoaded'));
                    return null;
                }

                const priorityValue = formState.priority;

                // Validate priority parsing
                let validatedPriority = null;
                if (priorityValue !== '' && priorityValue !== 'null') {
                    const parsedPriority = parseInt(priorityValue);
                    if (isNaN(parsedPriority) || parsedPriority < 1 || parsedPriority > 5) {
                        toastr.error(translate('Priority value must be between 1 and 5', 'stlo.validation.priorityRange'), 'Validation Error');
                        return null;
                    }
                    validatedPriority = parsedPriority;
                } else if (priorityValue === 'null') {
                    validatedPriority = null; // Explicitly set to null for default
                }

                // Validate order adjustment
                let validatedOrderAdjustment = 0;
                if (formState.orderAdjustmentEnabled && formState.orderAdjustment !== '') {
                    const parsed = parseInt(formState.orderAdjustment);
                    if (isNaN(parsed) || parsed < -10000 || parsed > 10000) {
                        toastr.error(translate('Order adjustment must be between -10000 and 10000', 'stlo.validation.orderAdjustmentRange'), 'Validation Error');
                        return null;
                    }
                    validatedOrderAdjustment = parsed;
                }

                // Validate character overrides (this may return null if duplicates found)
                const characterOverrides = getCharacterOverrides();
                if (characterOverrides === null) {
                    return null; // Validation failed due to duplicate characters
                }

                // Validate budget settings
                const mode = formState.budgetMode || 'default';
                let validatedBudget = 0;

                if (mode === 'percentage_context' || mode === 'percentage_budget') {
                    const p = parseInt(formState.budget, 10);
                    if (isNaN(p) || p < 1 || p > 100) {
                        toastr.error(translate('Budget percent must be between 1 and 100', 'stlo.validation.budgetPercentRange'), 'Validation Error');
                        return null;
                    }
                    validatedBudget = p;
                } else if (mode === 'fixed') {
                    const v = parseInt(formState.budget, 10);
                    if (isNaN(v) || v <= 0) {
                        toastr.error(translate('Fixed budget must be a positive integer', 'stlo.validation.fixedBudgetPositive'), 'Validation Error');
                        return null;
                    }
                    validatedBudget = v;
                } else {
                    validatedBudget = 0; // default mode
                }

                const validatedForm = {
                    priority: validatedPriority,
                    budgetMode: mode,
                    budget: validatedBudget,
                    orderAdjustment: validatedOrderAdjustment,
                    orderAdjustmentGroupOnly: formState.orderAdjustmentGroupOnly || false,
                    characterOverrides: characterOverrides,
                    onlyWhenSpeaking: formState.onlyWhenSpeaking || false
                };

                return validatedForm;
            };

            // Function to clean up modal event listeners
            const cleanupModalListeners = () => {
                modalEventListeners.forEach(({ element, event, handler }, index) => {
                    try {
                        element.removeEventListener(event, handler);
                    } catch (error) {
                        console.error(`Error removing modal event listener ${index}:`, error);
                    }
                    // Null out references immediately after removal
                    modalEventListeners[index].element = null;
                    modalEventListeners[index].handler = null;
                });
                modalEventListeners.length = 0;

                // Cancel pending animation frame if it exists
                if (EXTENSION_STATE.pendingAnimationFrame) {
                    const frameId = EXTENSION_STATE.pendingAnimationFrame;
                    EXTENSION_STATE.pendingAnimationFrame = null;
                    cancelAnimationFrame(frameId);
                }
            };

            // Create popup with onClosing callback to capture form data
            const popup = new Popup(modalHtml, POPUP_TYPE.CONFIRM, '', {
                okButton: translate('Save Settings', 'stlo.modal.save.ok'),
                cancelButton: translate('Cancel', 'stlo.modal.cancel'),
                wide: false,
                large: false,
                allowVerticalScrolling: true,
                onClosing: (popup) => {

                    // Only process form if user clicked OK/Save (POPUP_RESULT.AFFIRMATIVE = 1)
                    if (popup.result === 1) { // POPUP_RESULT.AFFIRMATIVE
                        const formState = captureFormState();
                        const validatedFormData = validateAndProcessForm(formState);


                        if (validatedFormData) {
                            resolve(validatedFormData);
                            cleanupModalListeners();
                            return true; // Allow popup to close
                        } else {
                            return false; // Prevent popup from closing
                        }
                    } else {
                        resolve(null);
                        cleanupModalListeners();
                        return true; // Allow popup to close
                    }
                }
            });

            // Show the popup
            popup.show();

            // Set up modal behavior immediately after popup creation
            // Use requestAnimationFrame to ensure DOM is ready
            EXTENSION_STATE.pendingAnimationFrame = requestAnimationFrame(() => {
                EXTENSION_STATE.pendingAnimationFrame = null;
                setupModalBehavior(modalEventListeners, currentSettings);
            });
        });

        // Save the settings if we got them
        if (result) {
            try {
                const saved = await setLorebookSettings(currentLorebook, result);

                if (saved) {
                    toastr.success(tKey('stlo.settings.saved', 'STLO settings saved for ${0}', currentLorebook));
                } else {
                    toastr.error(tKey('stlo.settings.saveFailed', 'Failed to save settings for ${0}. Check console for details.', currentLorebook), 'Save Error');
                }
            } catch (saveError) {
                console.error('Exception during save operation:', saveError);
                toastr.error(tKey('stlo.settings.saveException', 'Failed to save settings for ${0}: ${1}', currentLorebook, saveError.message), 'Save Error');
            }
        }

    } catch (error) {
        console.error('Error opening lorebook settings:', error);
    } finally {
        // Always reset modal state when function exits
        EXTENSION_STATE.modalOpen = false;
    }
}

/**
 * Set up interactive behavior for the modal
 * @param {Array} modalEventListeners - Array to track event listeners for cleanup
 * @param {Object} currentSettings - Current lorebook settings
 */
function setupModalBehavior(modalEventListeners = [], currentSettings = {}) {
    // Set up order adjustment behavior for main settings
    const orderAdjustmentEnabled = document.getElementById('lorebook-order-adjustment-enabled');
    const orderAdjustmentContainer = document.getElementById('lorebook-order-adjustment-container');
    const orderAdjustmentInput = document.getElementById('lorebook-order-adjustment');

    if (orderAdjustmentEnabled && orderAdjustmentContainer && orderAdjustmentInput) {
        const orderAdjustmentChangeHandler = () => {
            if (orderAdjustmentEnabled.checked) {
                orderAdjustmentContainer.classList.remove('hidden');
                if (orderAdjustmentInput.value === '' || orderAdjustmentInput.value === '0') {
                    orderAdjustmentInput.value = '0';
                }
            } else {
                orderAdjustmentContainer.classList.add('hidden');
                orderAdjustmentInput.value = '0';
            }
        };

        // Add input validation handler for order adjustment
        const orderAdjustmentInputHandler = () => {
            const value = parseInt(orderAdjustmentInput.value);
            if (value < -10000) {
                orderAdjustmentInput.value = '-10000';
            } else if (value > 10000) {
                orderAdjustmentInput.value = '10000';
            }
        };

        orderAdjustmentEnabled.addEventListener('change', orderAdjustmentChangeHandler);
        orderAdjustmentInput.addEventListener('input', orderAdjustmentInputHandler);

        modalEventListeners.push(
            { element: orderAdjustmentEnabled, event: 'change', handler: orderAdjustmentChangeHandler },
            { element: orderAdjustmentInput, event: 'input', handler: orderAdjustmentInputHandler }
        );

        // Set initial state
        orderAdjustmentChangeHandler();
    }

    // Set up Budget controls
    setupBudgetControls(modalEventListeners, currentSettings);

    // Set up Group Chat Overrides behavior
    setupAdvancedBehavior(modalEventListeners, currentSettings);
}

/**
 * Set up priority display synchronization
 * @param {Array} modalEventListeners - Array to track event listeners for cleanup
 */
function setupPriorityDisplaySync(modalEventListeners = []) {
    const prioritySelect = document.getElementById(SELECTORS.LOREBOOK_PRIORITY_SELECT);
    const priorityDisplay = document.getElementById('default-priority-display');

    if (prioritySelect && priorityDisplay) {
        const updatePriorityDisplay = () => {
            const selectedOption = prioritySelect.options[prioritySelect.selectedIndex];
            if (selectedOption) {
                // Extract just the display text (e.g., "5 - Highest Priority (Processes First)" -> "5 - Highest Priority")
                const displayText = selectedOption.textContent.replace(/ \(.*\)$/, '');
                priorityDisplay.textContent = displayText;
            }
        };

        prioritySelect.addEventListener('change', updatePriorityDisplay);

        // Track listener for cleanup
        modalEventListeners.push(
            { element: prioritySelect, event: 'change', handler: updatePriorityDisplay }
        );

        // Set initial display
        updatePriorityDisplay();
    }
}

/**
 * Set up simple drawer toggle behavior
 * @param {Array} modalEventListeners - Array to track event listeners for cleanup
 */
function setupDrawerBehavior(modalEventListeners = []) {
    const drawer = document.querySelector('.inline-drawer');
    const drawerIcon = document.querySelector('.inline-drawer-icon');
    const drawerToggle = document.querySelector('.inline-drawer-toggle');

    if (drawer && drawerIcon && drawerToggle) {
        const drawerToggleHandler = (e) => {
            e.preventDefault();
            drawer.classList.toggle('openDrawer');
            drawerIcon.classList.toggle('down');
            drawerIcon.classList.toggle('up');
        };

        drawerToggle.addEventListener('click', drawerToggleHandler);

        // Track listener for cleanup
        modalEventListeners.push(
            { element: drawerToggle, event: 'click', handler: drawerToggleHandler }
        );
    }
}

// Render budget controls (mode + value)
function createBudgetControls(scope, currentSettings = {}) {
    const mode = currentSettings.budgetMode || 'default';
    const value = (typeof currentSettings.budget === 'number' ? currentSettings.budget : (currentSettings.budget || 0));
    return `
        <h4 data-i18n="stlo.budget.title">Budget</h4>
        <small data-i18n="stlo.budget.help">Control how much of the context or World Info budget this lorebook may use.</small>
        <div class="flexNoWrap flexGap5 justifyCenter">
            <select id="${SELECTORS.LOREBOOK_BUDGET_MODE}" class="text_pole textarea_compact">
                <option value="default" ${mode === 'default' ? 'selected' : ''} data-i18n="stlo.budget.mode.default">Use ST World Info Budget (default)</option>
                <option value="percentage_budget" ${mode === 'percentage_budget' ? 'selected' : ''} data-i18n="stlo.budget.mode.percentBudget">% of World Info budget</option>
                <option value="percentage_context" ${mode === 'percentage_context' ? 'selected' : ''} data-i18n="stlo.budget.mode.percentContext">% of Max Context</option>
                <option value="fixed" ${mode === 'fixed' ? 'selected' : ''} data-i18n="stlo.budget.mode.fixed">Fixed tokens</option>
            </select>
            <div id="${SELECTORS.LOREBOOK_BUDGET_VALUE_CONTAINER}" class="flexNoWrap flexGap5 justifyCenter" style="${mode === 'default' ? 'display:none;' : ''}">
                <input type="number" id="${SELECTORS.LOREBOOK_BUDGET_VALUE}" class="text_pole textarea_compact"
                       value="${value || 0}" placeholder="0" style="width: 120px;">
                <small id="${SELECTORS.LOREBOOK_BUDGET_VALUE_CONTAINER}-hint"></small>
            </div>
            <small data-i18n="stlo.budget.tip">Tip: default (0) lets ST decide; Fixed with 1 effectively chokes off this lorebook.</small>
        </div>
    `;
}

// Wire up budget controls (visibility + clamping)
function setupBudgetControls(modalEventListeners = [], currentSettings = {}) {
    const modeSelect = document.getElementById(SELECTORS.LOREBOOK_BUDGET_MODE);
    const valueContainer = document.getElementById(SELECTORS.LOREBOOK_BUDGET_VALUE_CONTAINER);
    const valueInput = document.getElementById(SELECTORS.LOREBOOK_BUDGET_VALUE);
    const hint = document.getElementById(`${SELECTORS.LOREBOOK_BUDGET_VALUE_CONTAINER}-hint`);

    if (!modeSelect || !valueContainer || !valueInput) return;

    const applyMode = () => {
        const mode = modeSelect.value;
        if (mode === 'default') {
            valueContainer.style.display = 'none';
            valueInput.value = '0';
            if (hint) hint.textContent = '';
        } else if (mode === 'percentage_budget' || mode === 'percentage_context') {
            valueContainer.style.display = 'flex';
            valueInput.min = '1';
            valueInput.max = '100';
            valueInput.step = '1';
            if (hint) hint.textContent = (mode === 'percentage_budget'
                ? translate('% of World Info budget (1–100)', 'stlo.budget.hint.percentBudget')
                : translate('% of Max Context (1–100)', 'stlo.budget.hint.percentContext'));
            if (valueInput.value === '' || Number(valueInput.value) === 0) valueInput.value = '25';
        } else {
            // fixed
            valueContainer.style.display = 'flex';
            valueInput.min = '1';
            valueInput.removeAttribute('max');
            valueInput.step = '1';
            if (hint) hint.textContent = translate('tokens (>= 1)', 'stlo.budget.hint.fixed');
            if (valueInput.value === '' || Number(valueInput.value) === 0) valueInput.value = '500';
        }
    };

    const clampInput = () => {
        const mode = modeSelect.value;
        let v = parseInt(valueInput.value, 10);
        if (isNaN(v)) v = 0;
        if (mode === 'percentage_budget' || mode === 'percentage_context') {
            if (v < 1) v = 1;
            if (v > 100) v = 100;
        } else if (mode === 'fixed') {
            if (v < 1) v = 1;
        }
        valueInput.value = String(v);
    };

    modeSelect.addEventListener('change', applyMode);
    valueInput.addEventListener('input', clampInput);

    modalEventListeners.push(
        { element: modeSelect, event: 'change', handler: applyMode },
        { element: valueInput, event: 'input', handler: clampInput },
    );

    applyMode();
}

/**
 * Generate advanced mode priority sections
 * @returns {string} HTML string for priority sections
 */
function generateAdvancedContent() {
    const priorityLevels = [
        { level: 5 },
        { level: 4 },
        { level: 3 },
        { level: 2 },
        { level: 1 }
    ];

    const createPrioritySection = (priority) => `
        <div class="priority-section world_entry_form_control MarginBot10" data-priority="${priority.level}">
            <h4>${priority.level} - ${getPriorityName(priority.level)} ${translate('Priority', 'stlo.priority.label')}</h4>
            <small>${getPriorityDescription(priority.level)}</small>

            <div class="flex1 range-block MarginTop10">
                <div class="range-block-title">
                    <div class="flex-container justifySpaceBetween">
                        <small data-i18n="stlo.modal.groupOverrides.characters">Characters</small>
                    </div>
                </div>
                <div class="range-block-range">
                    <select class="override-character-filter text_pole textarea_compact"
                            id="priority-${priority.level}-characters"
                            data-priority="${priority.level}"
                            multiple>
                        <option value="" data-i18n="stlo.modal.groupOverrides.placeholderPopulated">-- Characters will be populated --</option>
                    </select>
                </div>
            </div>

            <div class="flex1 MarginTop10">
                <label class="checkbox_label" for="override-order-adjustment-enabled-${priority.level}">
                    <input type="checkbox" id="override-order-adjustment-enabled-${priority.level}"
                           class="override-order-adjustment-enabled" data-priority="${priority.level}">
                    <span class="checkmark"></span>
                    <span data-i18n="stlo.modal.order.enableLabel">Enable Order Adjustment</span>
                </label>
                <small data-i18n="stlo.modal.order.help">Fine-tune processing order within this priority level</small>

                <div class="override-order-adjustment-container" data-priority="${priority.level}"
                     style="display: none;">
                    <h5 data-i18n="stlo.modal.order.title">Order Adjustment</h5>
                    <div class="flexNoWrap flexGap5 justifyCenter">
                        <input type="number" class="text_pole textarea_compact override-order-adjustment"
                               data-priority="${priority.level}" min="-10000" max="10000" step="1"
                               value="0" placeholder="0" style="width: 100px;">
                        <small style="color: #888;" data-i18n="stlo.modal.order.range">-10k to +10k</small>
                    </div>
                    <small data-i18n="stlo.modal.order.explain">Higher values process first. Example: +250 for slight boost, -500 for lower priority.</small>
                </div>
            </div>
        </div>
    `;

    return priorityLevels.map(createPrioritySection).join('');
}

/**
 * Set up behavior for advanced mode
 * @param {Array} modalEventListeners - Array to track event listeners for cleanup
 * @param {Object} currentSettings - Current lorebook settings
 */
function setupAdvancedBehavior(modalEventListeners = [], currentSettings = {}) {
    // Generate and insert advanced content first
    const advancedSectionsContainer = document.getElementById('advanced-priority-sections');
    if (advancedSectionsContainer) {
        advancedSectionsContainer.innerHTML = generateAdvancedContent();
    }

    // Set up priority display sync
    setupPriorityDisplaySync(modalEventListeners);

    // Set up drawer behavior
    setupDrawerBehavior(modalEventListeners);

    // Set up override behavior for all priority levels
    setupOverrideBehavior(modalEventListeners);

    // Populate character selectors
    populateCharacterSelectors();

    // Initialize Select2
    initializeSelect2();

    // Populate saved character overrides
    populateCharacterOverrides(currentSettings.characterOverrides || {});
}

/**
 * Set up override behavior for character-specific priority settings
 * @param {Array} modalEventListeners - Array to track event listeners for cleanup
 */
function setupOverrideBehavior(modalEventListeners = []) {
    const priorityLevels = [1, 2, 3, 4, 5];

    for (const priority of priorityLevels) {
        // Order adjustment behavior
        const orderAdjustmentEnabled = document.querySelector(`.override-order-adjustment-enabled[data-priority="${priority}"]`);
        const orderAdjustmentContainer = document.querySelector(`.override-order-adjustment-container[data-priority="${priority}"]`);
        const orderAdjustmentInput = document.querySelector(`.override-order-adjustment[data-priority="${priority}"]`);

        if (orderAdjustmentEnabled && orderAdjustmentContainer && orderAdjustmentInput) {
            const orderAdjustmentChangeHandler = () => {
                if (orderAdjustmentEnabled.checked) {
                    orderAdjustmentContainer.style.display = 'block';
                    if (orderAdjustmentInput.value === '' || orderAdjustmentInput.value === '0') {
                        orderAdjustmentInput.value = '0';
                    }
                } else {
                    orderAdjustmentContainer.style.display = 'none';
                    orderAdjustmentInput.value = '0';
                }
            };

            // Add input validation handler for order adjustment
            const orderAdjustmentInputHandler = () => {
                const value = parseInt(orderAdjustmentInput.value);
                if (value < -10000) {
                    orderAdjustmentInput.value = '-10000';
                } else if (value > 10000) {
                    orderAdjustmentInput.value = '10000';
                }
            };

            orderAdjustmentEnabled.addEventListener('change', orderAdjustmentChangeHandler);
            orderAdjustmentInput.addEventListener('input', orderAdjustmentInputHandler);

            modalEventListeners.push(
                { element: orderAdjustmentEnabled, event: 'change', handler: orderAdjustmentChangeHandler },
                { element: orderAdjustmentInput, event: 'input', handler: orderAdjustmentInputHandler }
            );

            // Set initial state
            orderAdjustmentChangeHandler();
        }
    }
}

/**
 * Populate character selectors with available characters
 */
function populateCharacterSelectors() {
    const context = getContext();
    const characters = context?.characters || [];

    const priorityLevels = [1, 2, 3, 4, 5];

    for (const priority of priorityLevels) {
        const selector = document.querySelector(`.override-character-filter[data-priority="${priority}"]`);
        if (selector) {
            // Clear existing options except the placeholder
            selector.innerHTML = '';

            // Add default option
            if (characters.length === 0) {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = translate('-- No characters found --', 'stlo.modal.groupOverrides.noChars');
                selector.appendChild(defaultOption);
            } else {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = translate('-- Select characters --', 'stlo.modal.groupOverrides.placeholderSelect');
                selector.appendChild(defaultOption);

                // Add character options
                characters.forEach((character) => {
                    const option = document.createElement('option');
                    const name = (character?.avatar?.replace(/\.[^/.]+$/, '') || character?.name || '');
                    option.value = name;
                    option.textContent = name;
                    option.setAttribute('data-type', 'character');
                    selector.appendChild(option);
                });
            }
        }
    }
}

/**
 * Populate character overrides from saved settings
 * @param {Object} characterOverrides - Saved character overrides
 */
function populateCharacterOverrides(characterOverrides = {}) {
    // Iterate through saved overrides and populate the form
    Object.entries(characterOverrides).forEach(([character, settings]) => {
        const priority = settings.priority;
        if (!priority || priority < 1 || priority > 5) return;

        // Find the character selector for this priority level
        const characterSelect = document.querySelector(`.override-character-filter[data-priority="${priority}"]`);
        if (characterSelect) {
            // Add the character to the selection
            $(characterSelect).val([...($(characterSelect).val() || []), character]).trigger('change');

            // Set order adjustment if it exists and is not 0
            if (settings.orderAdjustment !== undefined && settings.orderAdjustment !== 0) {
                const orderAdjustmentEnabled = document.querySelector(`.override-order-adjustment-enabled[data-priority="${priority}"]`);
                const orderAdjustmentInput = document.querySelector(`.override-order-adjustment[data-priority="${priority}"]`);
                const orderAdjustmentContainer = document.querySelector(`.override-order-adjustment-container[data-priority="${priority}"]`);

                if (orderAdjustmentEnabled) {
                    orderAdjustmentEnabled.checked = true;
                    // Trigger change event to update UI
                    orderAdjustmentEnabled.dispatchEvent(new Event('change'));
                }

                if (orderAdjustmentInput) {
                    orderAdjustmentInput.value = settings.orderAdjustment;
                }

                if (orderAdjustmentContainer) {
                    orderAdjustmentContainer.style.display = 'block';
                }
            }
        }
    });
}

/**
 * Initialize Select2 for character selectors in override popup
 */
function initializeSelect2() {
    const priorityLevels = [1, 2, 3, 4, 5];

    for (const priority of priorityLevels) {
        const selector = document.querySelector(`.override-character-filter[data-priority="${priority}"]`);
        if (selector && typeof $ === 'function' && $.fn?.select2 && $(selector).length) {
            $(selector).select2({
                width: '100%',
                placeholder: translate('Select characters for this priority level...', 'stlo.modal.groupOverrides.selectPlaceholder'),
                allowClear: true,
                closeOnSelect: false,
                dropdownParent: $(selector).closest('.popup-content, .popup-body, [role="dialog"]').first()
            });
        }
    }
}

/**
 * Get character overrides from form
 * @returns {Object} Character overrides object
 */
function getCharacterOverrides() {
    const overrides = {};
    const characterAssignments = {}; // Track which priorities each character is assigned to
    const prioritySections = document.querySelectorAll('.priority-section');

    prioritySections.forEach(section => {
        const priority = section.getAttribute('data-priority');
        const characterSelect = section.querySelector('select[data-priority="' + priority + '"].override-character-filter');

        if (characterSelect && characterSelect.value) {
            const selectedChars = $(characterSelect).val() || [];

            selectedChars.forEach(chid => {
                // Track priority assignments for duplicate detection
                if (!characterAssignments[chid]) {
                    characterAssignments[chid] = [];
                }
                characterAssignments[chid].push(parseInt(priority));

                // Get order adjustment values
                const orderAdjustmentEnabled = section.querySelector(`input[data-priority="${priority}"].override-order-adjustment-enabled`);
                const orderAdjustmentInput = section.querySelector(`input[data-priority="${priority}"].override-order-adjustment`);
                const orderAdjustment = (orderAdjustmentEnabled && orderAdjustmentEnabled.checked && orderAdjustmentInput)
                    ? parseInt(orderAdjustmentInput.value) || 0
                    : 0;

                overrides[chid] = {
                    priority: parseInt(priority),
                    orderAdjustment: orderAdjustment
                };
            });
        }
    });

    // Check for duplicates and block saving if found
    const duplicates = Object.entries(characterAssignments).filter(([chid, priorities]) => priorities.length > 1);

    if (duplicates.length > 0) {
        const context = getContext();
        const duplicateMessages = duplicates.map(([chid, priorities]) => {
            const char = context?.characters?.find(c => ((c?.avatar?.replace(/\.[^/.]+$/, '')) || c?.name) === chid);
            const charName = char?.name || chid;
            const priorityNames = priorities.map(p => `${p} - ${getPriorityName(p)}`).join(', ');
            return `• ${charName}: assigned to priorities ${priorityNames}`;
        });

        const errorMessage = `Cannot save: Characters assigned to multiple priority levels.\n\n${duplicateMessages.join('\n')}\n\nPlease assign each character to only one priority level.`;

        toastr.error(errorMessage, 'Duplicate Character Assignments', { timeOut: 8000 });
        return null; // Return null to indicate validation failure
    }

    return overrides;
}

/**
 * Get priority level name for display
 * @param {number} priority - Priority level (1-5)
 * @returns {string} Priority name
 */
function getPriorityName(priority) {
    const names = {
        5: translate('Highest', 'stlo.priority.name.5'),
        4: translate('High', 'stlo.priority.name.4'),
        3: translate('Normal', 'stlo.priority.name.3'),
        2: translate('Low', 'stlo.priority.name.2'),
        1: translate('Lowest', 'stlo.priority.name.1')
    };
    return names[priority] || 'Unknown';
}

/**
 * Get priority level description for display
 * @param {number} priority - Priority level (1-5)
 * @returns {string} Priority description
 */
function getPriorityDescription(priority) {
    const descriptions = {
        5: translate('Processes first', 'stlo.priority.desc.5'),
        4: translate('High priority processing', 'stlo.priority.desc.4'),
        3: translate('Standard priority (SillyTavern default)', 'stlo.priority.desc.3'),
        2: translate('Lower priority processing', 'stlo.priority.desc.2'),
        1: translate('Processes last', 'stlo.priority.desc.1')
    };
    return descriptions[priority] || 'Unknown';
}

/**
 * Apply priority ordering to all entries
 * @param {Object} eventData - Contains globalLore, characterLore, chatLore, personaLore arrays
 */
async function applyPriorityOrdering(eventData) {
    try {
        // Robust payload/arrays
        if (!eventData || typeof eventData !== 'object') return;

        const gl = Array.isArray(eventData.globalLore) ? eventData.globalLore : (eventData.globalLore = []);
        const cl = Array.isArray(eventData.characterLore) ? eventData.characterLore : (eventData.characterLore = []);
        const chat = Array.isArray(eventData.chatLore) ? eventData.chatLore : (eventData.chatLore = []);
        const persona = Array.isArray(eventData.personaLore) ? eventData.personaLore : (eventData.personaLore = []);

        const allEntries = [...gl, ...cl, ...chat, ...persona];

        // Cache settings by world to avoid per-entry awaits
        const settingsCache = new Map();
        const getSettings = async (world) => {
            if (!world) return null;
            if (settingsCache.has(world)) return settingsCache.get(world);
            const s = await getLorebookSettings(world);
            settingsCache.set(world, s);
            return s;
        };

        // Process entries with filtering and optimization
        const processedEntries = [];
        let skippedOnlyWhenSpeaking = 0;

        for (const entry of allEntries) {
            try {
                if (!entry?.world) {
                    // Entries without world name get default priority and are always included
                    const originalOrder = Math.min(entry?.order ?? 100, 9999);
                    entry.order = PRIORITY_LEVELS.DEFAULT * 10000 + originalOrder;
                    processedEntries.push(entry);
                    continue;
                }

                const settings = await getSettings(entry.world) || {};

                // FILTERING LOGIC: Apply onlyWhenSpeaking rules
                if (settings.onlyWhenSpeaking) {
                    // Skip if not in group chat (currentSpeakingCharacter would be null)
                    if (!EXTENSION_STATE.currentSpeakingCharacter) {
                        skippedOnlyWhenSpeaking++;
                        continue; // Skip in single chats
                    }

                    // Skip if current speaker not in character overrides
                    const hasOverride = settings.characterOverrides
                        ? Object.prototype.hasOwnProperty.call(settings.characterOverrides, EXTENSION_STATE.currentSpeakingCharacter)
                        : false;
                    if (!hasOverride) {
                        skippedOnlyWhenSpeaking++;
                        continue; // Skip - character not assigned
                    }
                }

                // PRIORITY LOGIC: Get priority/adjustment from cached settings
                let priority = settings.priority ?? PRIORITY_LEVELS.DEFAULT;
                let orderAdjustment = settings.orderAdjustment ?? 0;

                // Apply character overrides if in group chat
                if (EXTENSION_STATE.currentSpeakingCharacter && settings.characterOverrides) {
                    const override = settings.characterOverrides[EXTENSION_STATE.currentSpeakingCharacter];
                    if (override) {
                        priority = override.priority ?? priority;
                        orderAdjustment = override.orderAdjustment ?? orderAdjustment;
                    }
                }

                // Apply order adjustment group-only setting
                if (settings.orderAdjustmentGroupOnly && !EXTENSION_STATE.currentSpeakingCharacter) {
                    orderAdjustment = 0;
                }

                // Apply order calculation
                const originalOrder = Math.min(entry.order ?? 100, 9999);
                entry.order = priority * 10000 + orderAdjustment + originalOrder;

                processedEntries.push(entry);

            } catch (innerErr) {
                console.warn(`Error setting priority for entry from ${entry?.world}:`, innerErr);
                // Keep original order on error and include entry
                processedEntries.push(entry);
            }
        }

        // Sort processed entries by new order (highest first) with deterministic tie-breakers
        processedEntries.sort((a, b) => {
            const ao = (a?.order ?? 100);
            const bo = (b?.order ?? 100);
            if (bo !== ao) return bo - ao;
            const au = (a?.uid ?? 0);
            const bu = (b?.uid ?? 0);
            if (au !== bu) return au - bu;
            const aw = String(a?.world ?? '');
            const bw = String(b?.world ?? '');
            if (aw !== bw) return aw.localeCompare(bw);
            return 0;
        });

        const preCounts = {
            global: gl.length,
            character: cl.length,
            chat: chat.length,
            persona: persona.length
        };

        // Clear all arrays then put everything in globalLore
        gl.length = 0;
        cl.length = 0;
        chat.length = 0;
        persona.length = 0;
        gl.push(...processedEntries);

        if (DEBUG_STLO) {
            stloDebug('applyPriorityOrdering summary:', { preCounts, processed: processedEntries.length, skippedOnlyWhenSpeaking });
        }

    } catch (error) {
        console.error('Error applying priority ordering:', error);
    }
}

/**
 * Budget pre-scan enforcement: disable overflow entries based on total WI budget.
 * Runs at WORLDINFO_ENTRIES_LOADED, before the core scan loop. This allows budget
 * enforcement without modifying base code. Ignores entries with ignoreBudget=true.
 */
async function enforceBudgetPreScan(eventData) {
    try {
        const { globalLore = [], characterLore = [], chatLore = [], personaLore = [] } = eventData || {};
        // After applyPriorityOrdering, everything resides in globalLore; keep defensive support for others.
        const ordered = [
            ...(globalLore || []),
            ...(characterLore || []),
            ...(chatLore || []),
            ...(personaLore || []),
        ];

        const totalBudget = calculateTotalWIBudget();
        if (!(totalBudget > 0)) return;

        let used = 0;
        for (const e of ordered) {
            if (!e) continue;
            if (e.ignoreBudget === true) continue; // keep without consuming budget
            const tokens = Number(getTokenCount(e.content || '')) || 0;
            if ((used + tokens) <= totalBudget) {
                used += tokens;
            } else {
                e.disable = true; // respected by core checkWorldInfo
            }
        }
    } catch (err) {
        console.warn('[STLO] enforceBudgetPreScan error:', err);
    }
}

// Extension initialization
async function init() {
    const initializeExtension = async () => {
        try {
            // Initialize extension
            const context = getContext();
            if (!context) {
                throw new Error('Failed to get SillyTavern context');
            }

            setupEventHandlers();
            await loadStloLocale();
            addLorebookOrderingButton();
            registerStloSlashCommand();
            registerBudgetEnforcementHandlers();

        } catch (error) {
            console.error('Failed to load STLO extension:', error);
        }
    };

    // Wait for SillyTavern to be ready
    eventSource.once(event_types.APP_READY, initializeExtension);
}

init();

// ================== STLO: Per-lorebook Budget Markers & Trimming ==================

// Lazy-initialize extension state for budget enforcement
if (!EXTENSION_STATE.dropSet) EXTENSION_STATE.dropSet = null;

/**
 * WORLD_INFO_ACTIVATED handler: compute per-lorebook drop set (entry count budget).
 * Activated entries are structured; sorting by order desc mirrors final assembly.
 */
async function onWorldInfoActivated(activatedEntries) {
    try {
        const byWorld = new Map();
        for (const e of (activatedEntries || [])) {
            if (!e?.world) continue;
            if (!byWorld.has(e.world)) byWorld.set(e.world, []);
            byWorld.get(e.world).push(e);
        }

        const dropSet = new Set();
        const dropEntries = [];

        // Compute total WI budget in tokens aligned with base ST config
        const totalBudget = calculateTotalWIBudget();
        const tokenCache = new Map();

        for (const [world, list] of byWorld.entries()) {
            // Load per-lorebook settings to determine mode/value
            const settings = await getLorebookSettings(world);
            const perBudget = await calculateLorebookBudget(settings, totalBudget);
            if (!(perBudget > 0)) continue;

            // Sort by new order (desc), fallback to 100 if undefined
            list.sort((a, b) => (b.order ?? 100) - (a.order ?? 100));

            let usedTokens = 0;

            for (const e of list) {
                const ignore = e?.ignoreBudget === true;
                let tokens;
                const uid = e?.uid;
                if (uid && tokenCache.has(uid)) {
                    tokens = tokenCache.get(uid);
                } else {
                    tokens = Number(getTokenCount(e?.content || '')) || 0;
                    if (uid) tokenCache.set(uid, tokens);
                }

                if (ignore) {
                    // keep entry; do not consume budget
                    continue;
                }

                if ((usedTokens + tokens) <= perBudget) {
                    usedTokens += tokens;
                } else {
                    dropSet.add(`${world}:${e.uid}`);
                    if (typeof e.content === 'string' && e.content.length) {
                        dropEntries.push({ world: e.world, uid: e.uid, content: e.content });
                        console.info('[STLO] Trimmed WI entry:', { world: e.world, uid: e.uid, comment: e?.comment ?? null, tokens });
                    }
                }
            }
        }

        EXTENSION_STATE.dropSet = dropSet;
        EXTENSION_STATE.dropEntries = dropEntries;

        if (DEBUG_STLO) {
            const totals = {};
            for (const [w, l] of byWorld.entries()) totals[w] = l.length;
            stloDebug('onWorldInfoActivated summary:', { totalsByWorld: totals, droppedCount: dropEntries.length });
        }
    } catch (e) {
        console.warn('[STLO] onWorldInfoActivated error:', e);
        EXTENSION_STATE.dropSet = null;
        EXTENSION_STATE.dropEntries = [];
    }
}

/**
 * CHAT_COMPLETION_PROMPT_READY handler: remove over-budget entry contents (no markers; Option A).
 */
function onChatCompletionPromptReady(eventData) {
    try {
        const { chat, dryRun } = eventData || {};
        if (dryRun) return;

        const dropEntries = EXTENSION_STATE.dropEntries;
        if (!Array.isArray(dropEntries) || dropEntries.length === 0 || !Array.isArray(chat)) return;

        for (const msg of chat) {
            if (!msg || msg.role !== 'system' || typeof msg.content !== 'string') continue;

            let content = msg.content;
            let changed = false;

            // remove all occurrences of each over-budget entry.content
            for (const e of dropEntries) {
                const slice = e?.content;
                if (typeof slice !== 'string' || !slice.length) continue;

                let idx = content.indexOf(slice);
                if (idx !== -1) {
                    while (idx !== -1) {
                        content = content.slice(0, idx) + content.slice(idx + slice.length);
                        changed = true;
                        idx = content.indexOf(slice);
                    }
                }
            }

            if (changed) {
                // Tidy excessive blank lines after removals; do not trim leading whitespace
                msg.content = content
                    .replace(/\n{3,}/g, '\n\n')
                    .replace(/[ \t]+\n/g, '\n');
            }
        }
    } catch (e) {
        console.warn('[STLO] onChatCompletionPromptReady error:', e);
    }
}

/**
 * Reset per-generation state.
 */
function resetBudgetState() {
    EXTENSION_STATE.dropSet = null;
    EXTENSION_STATE.dropEntries = [];
}

// Compute total World Info budget (tokens) from base ST config
function calculateTotalWIBudget() {
    try {
        const usableContext = Number(typeof getMaxContextSize === 'function' ? getMaxContextSize() : 0);
        if (!Number.isFinite(usableContext) || usableContext <= 0) {
            return 0; // no trimming without a valid prevailing context
        }

        const wiPercent = (typeof world_info_budget === 'number' && world_info_budget > 0) ? world_info_budget : 25;
        let totalBudget = Math.round(usableContext * (wiPercent / 100));

        const cap = (typeof world_info_budget_cap === 'number' && world_info_budget_cap > 0) ? world_info_budget_cap : 0;
        if (cap > 0 && totalBudget > cap) totalBudget = cap;

        return (Number.isFinite(totalBudget) && totalBudget > 0) ? totalBudget : 0;
    } catch (e) {
        console.warn('[STLO] calculateTotalWIBudget error:', e);
        return 0;
    }
}

// Resolve per-lorebook token budget by mode (default | %budget | %context | fixed)
// Applies character-specific overrides when present
async function calculateLorebookBudget(settings, totalBudget) {
    try {
        const usableContext = Number(typeof getMaxContextSize === 'function' ? getMaxContextSize() : 0);

        let budgetMode = settings?.budgetMode || 'default';
        let budgetValue = Number(settings?.budget || 0) || 0;

        // Apply character override if present
        if (EXTENSION_STATE.currentSpeakingCharacter && settings?.characterOverrides) {
            const override = settings.characterOverrides[EXTENSION_STATE.currentSpeakingCharacter];
            if (override && override.budgetMode && override.budgetMode !== 'default') {
                budgetMode = override.budgetMode;
                budgetValue = Number(override.budget || 0) || 0;
            }
        }

        switch (budgetMode) {
            case 'percentage_context':
                if (budgetValue >= 1 && budgetValue <= 100) {
                    return Math.floor((budgetValue / 100) * usableContext);
                }
                break;
            case 'percentage_budget':
                if (budgetValue >= 1 && budgetValue <= 100) {
                    return Math.floor((budgetValue / 100) * totalBudget);
                }
                break;
            case 'fixed':
                if (budgetValue > 0) {
                    return budgetValue;
                }
                break;
            default:
                break;
        }

        // default mode → no per-lorebook limit; defer to SillyTavern's global WI handling
        return 0;
    } catch (e) {
        console.warn('[STLO] calculateLorebookBudget error:', e);
        return 0;
    }
}

/**
 * Register handlers (kept separate from existing setupEventHandlers to minimize intrusion)
 */
function registerBudgetEnforcementHandlers() {
    try {
        if (EXTENSION_STATE.budgetHandlersRegistered) return;

        // Post-activation decision (drop set)
        const activatedHandler = onWorldInfoActivated;
        eventSource.on(event_types.WORLD_INFO_ACTIVATED, activatedHandler);
        eventListeners.push({ source: eventSource, event: event_types.WORLD_INFO_ACTIVATED, handler: activatedHandler });

        // Post-combine surgery (strip/trim)
        const promptReadyHandler = onChatCompletionPromptReady;
        eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, promptReadyHandler);
        eventListeners.push({ source: eventSource, event: event_types.CHAT_COMPLETION_PROMPT_READY, handler: promptReadyHandler });

        // Reset state when gen ends or chat changes
        const resetGenHandler = resetBudgetState;
        eventSource.on(event_types.GENERATION_ENDED, resetGenHandler);
        eventListeners.push({ source: eventSource, event: event_types.GENERATION_ENDED, handler: resetGenHandler });

        const chatChangedResetHandler = resetBudgetState;
        eventSource.on(event_types.CHAT_CHANGED, chatChangedResetHandler);
        eventListeners.push({ source: eventSource, event: event_types.CHAT_CHANGED, handler: chatChangedResetHandler });

        EXTENSION_STATE.budgetHandlersRegistered = true;
        console.debug('[STLO] Budget enforcement handlers registered');
    } catch (e) {
        console.warn('[STLO] Failed to register budget enforcement handlers:', e);
    }
}
