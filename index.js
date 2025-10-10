import { event_types, eventSource } from '../../../events.js';
import { getContext } from '../../../extensions.js';
import { characters, stopGeneration } from '../../../../script.js';
import { loadWorldInfo, saveWorldInfo, worldInfoCache, world_info_character_strategy, world_info_insertion_strategy, world_names } from '../../../world-info.js';
import { POPUP_TYPE, Popup } from '../../../popup.js';

const EXTENSION_NAME = 'stlo';
const SELECTORS = {
    WORLD_INFO_SEARCH: 'world_info_search',
    LOREBOOK_ORDERING_BUTTON: 'lorebook_ordering_button',
    WORLD_EDITOR_SELECT: '#world_editor_select',
    LOREBOOK_PRIORITY_SELECT: 'lorebook_priority_select'
};

// Default settings for lorebooks
const DEFAULT_LOREBOOK_SETTINGS = {
    priority: null,     // null = default priority (3)
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
    isGenerating: false,
    generationsSinceChatChange: 0,
    currentSpeakingCharacter: null  // Track current speaking character for group chat overrides
};

// Utility functions

function cleanupListeners(listeners, listenerArray) {
    listeners.forEach(({ source, event, handler }) => {
        try {
            source.off(event, handler);
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

    // Track generation state to only show warnings during actual generation
    const generationStartHandler = () => {
        EXTENSION_STATE.isGenerating = true;
        EXTENSION_STATE.generationsSinceChatChange++;
    };
    const generationStopHandler = () => { EXTENSION_STATE.isGenerating = false; };
    const generationEndHandler = () => { EXTENSION_STATE.isGenerating = false; };
    const chatChangedHandler = () => {
        EXTENSION_STATE.generationsSinceChatChange = 0;
        EXTENSION_STATE.currentSpeakingCharacter = null;  // Clear character override state on chat change
    };

    // Group chat character override handler
    const groupMemberDraftedHandler = (chId) => {
        // Clear any stale state first, then set current speaking character
        EXTENSION_STATE.currentSpeakingCharacter = null;

        if (chId !== undefined && chId !== null && characters && characters[chId]) {
            const character = characters[chId];
            const characterName = character.avatar.replace(/\.[^/.]+$/, '') ?? character.name;
            EXTENSION_STATE.currentSpeakingCharacter = characterName;
        }
    };

    eventSource.on(event_types.GENERATION_STARTED, generationStartHandler);
    eventSource.on(event_types.GENERATION_STOPPED, generationStopHandler);
    eventSource.on(event_types.GENERATION_ENDED, generationEndHandler);
    eventSource.on(event_types.CHAT_CHANGED, chatChangedHandler);
    eventSource.on(event_types.GROUP_MEMBER_DRAFTED, groupMemberDraftedHandler);

    // Track for cleanup
    eventListeners.push(
        { source: eventSource, event: event_types.WORLDINFO_ENTRIES_LOADED, handler: handler },
        { source: eventSource, event: event_types.GENERATION_STARTED, handler: generationStartHandler },
        { source: eventSource, event: event_types.GENERATION_STOPPED, handler: generationStopHandler },
        { source: eventSource, event: event_types.GENERATION_ENDED, handler: generationEndHandler },
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
        button.title = 'Configure STLO Priority';

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
        // Check if insertion strategy is 'evenly'
        const isEvenlyStrategy = world_info_character_strategy === world_info_insertion_strategy.evenly;

        // Check if any lorebooks have special settings
        const hasSpecialLorebooks = await checkForSpecialLorebooks(eventData);

        // If not evenly strategy, handle warning and return
        if (!isEvenlyStrategy) {
            // Only show warning for user-initiated generation (skip automatic greeting generation)
            if (hasSpecialLorebooks && EXTENSION_STATE.generationsSinceChatChange > 1) {
                const result = await showStrategyWarning();
                if (result === 'abort') {
                    // User chose to stop generation to fix settings
                    toastr.warning('Generation stopped. Please switch to "evenly" strategy for STLO to work.', 'STLO', { timeOut: 5000 });
                    return; // Generation already stopped in the popup callback
                }
                if (result === 'disable') {
                    // User chose to continue without STLO
                    toastr.info('STLO disabled - not using "evenly" strategy', 'STLO', { timeOut: 3000 });
                    return; // Silently disable STLO without error
                }
            }
            return;
        }

        // Apply evenly strategy implementation with priority ordering only
        await applyPriorityOrdering(eventData);

    } catch (error) {
        toastr.warning('STLO encountered an error. Disabling STLO, returning to core ST function', 'Extension Warning');
        return;
    }
}

/**
 * Check if any lorebooks have special priority settings
 * @param {Object} eventData - Contains globalLore, characterLore, chatLore, personaLore arrays
 * @returns {boolean} True if any lorebook has non-default priority
 */
async function checkForSpecialLorebooks(eventData) {
    try {
        // Collect all unique lorebook names from all arrays
        const allEntries = [
            ...(eventData.globalLore || []),
            ...(eventData.characterLore || []),
            ...(eventData.chatLore || []),
            ...(eventData.personaLore || [])
        ];

        const uniqueWorlds = new Set(allEntries.map(entry => entry.world).filter(Boolean));

        if (uniqueWorlds.size === 0) {
            return false;
        }

        // Check each lorebook for special priority settings
        for (const worldName of uniqueWorlds) {
            try {
                const settings = await getLorebookSettings(worldName);

                // Check for non-default priority
                if (settings.priority !== null && settings.priority !== PRIORITY_LEVELS.DEFAULT) {
                    return true;
                }
            } catch (error) {
                console.error(`Error checking STLO settings for lorebook ${worldName}:`, error);
            }
        }

        return false;
    } catch (error) {
        console.error('Error in checkForSpecialLorebooks:', error);
        return false; // Assume no special settings on error
    }
}

/**
 * Show warning popup when strategy is not 'evenly' but special lorebooks exist
 * @returns {string} 'continue' or 'disable'
 */
async function showStrategyWarning() {
    return new Promise((resolve) => {
        const warningHtml = `
            <div style="text-align: left; line-height: 1.4;">
                <h4>⚠️ Caution</h4>
                <span>You have lorebooks with custom priority settings, but your World Info Insertion Strategy is not set to "Sorted Evenly". STLO requires the "Sorted Evenly" strategy to work properly. What would you like to do?</span>
            </div>
        `;

        const popup = new Popup(warningHtml, POPUP_TYPE.CONFIRM, '', {
            okButton: 'Disable STLO',
            cancelButton: 'Stop Generation',
            wide: true,
            large: false,
            onClosing: (popup) => {
                if (popup.result === 1) { // POPUP_RESULT.AFFIRMATIVE (OK) - "Disable STLO"
                    resolve('disable');
                } else { // POPUP_RESULT.NEGATIVE (Cancel) - "Stop Generation"
                    stopGeneration();
                    resolve('abort');
                }
                return true; // Allow popup to close
            }
        });

        popup.show();
    });
}

/**
 * Get settings for a specific lorebook
 * @param {string} worldName - Name of the lorebook
 * @returns {Object} Lorebook settings or defaults
 */
async function getLorebookSettings(worldName) {
    try {
        const worldData = await loadWorldInfo(worldName);

        if (!worldData) {
            return { ...DEFAULT_LOREBOOK_SETTINGS };
        }

        // Look for our extension data directly on the world data object
        const extensionData = worldData[EXTENSION_NAME];

        if (!extensionData || typeof extensionData !== 'object') {
            return { ...DEFAULT_LOREBOOK_SETTINGS };
        }

        // Merge with defaults to ensure all properties exist
        return { ...DEFAULT_LOREBOOK_SETTINGS, ...extensionData };
    } catch (error) {
        console.error(`Error loading settings for ${worldName}:`, error);
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
            toastr.error(`Could not load settings for lorebook: ${worldName}`, 'Settings Error');
            return false;
        }

        // Save extension settings directly on the world data object
        const finalSettings = { ...DEFAULT_LOREBOOK_SETTINGS, ...settings };
        worldData[EXTENSION_NAME] = finalSettings;

        // Save the world data back immediately
        await saveWorldInfo(worldName, worldData, true);

        // Clear cache to ensure fresh load next time
        worldInfoCache.delete(worldName);

        return true;
    } catch (error) {
        console.error(`Error saving settings for ${worldName}:`, error);
        toastr.error(`Error saving settings for ${worldName}`, 'Save Error');
        return false;
    }
}

/**
 * Get the priority for a lorebook (with default fallback)
 * @param {string} worldName - Name of the lorebook
 * @returns {number} Priority level (1-5, default 3)
 */
async function getLorebookPriority(worldName) {
    const settings = await getLorebookSettings(worldName);

    // Check for character-specific override in group chat
    if (EXTENSION_STATE.currentSpeakingCharacter && settings.characterOverrides) {
        const override = settings.characterOverrides[EXTENSION_STATE.currentSpeakingCharacter];
        if (override && typeof override.priority === 'number') {
            return override.priority;
        }
    }

    return settings.priority ?? PRIORITY_LEVELS.DEFAULT;
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
            toastr.info('Create or select a World Info file first.', 'World Info is not set', { timeOut: 10000, preventDuplicates: true });
            return;
        }

        // Get current settings
        const currentSettings = await getLorebookSettings(currentLorebook);

        // Create modal HTML - single vertical scrolling content
        const modalHtml = `
            <div class="world_entry_form_control MarginBot5 alignCenteritems">
                <h3 class="marginBot10">📚 ST Lorebook Ordering</h3>
                <h4>Lorebook Priority</h4>
                <small>Higher numbers (4-5) process first. Lower numbers (1-2) process last.</small>

                <select id="${SELECTORS.LOREBOOK_PRIORITY_SELECT}" class="text_pole textarea_compact">
                    <option value="5" ${currentSettings.priority === 5 ? 'selected' : ''}>5 - Highest Priority (Processes First)</option>
                    <option value="4" ${currentSettings.priority === 4 ? 'selected' : ''}>4 - High Priority</option>
                    <option value="null" ${currentSettings.priority === null ? 'selected' : ''}>3 - Normal (SillyTavern Default)</option>
                    <option value="2" ${currentSettings.priority === 2 ? 'selected' : ''}>2 - Low Priority</option>
                    <option value="1" ${currentSettings.priority === 1 ? 'selected' : ''}>1 - Lowest Priority (Processes Last)</option>
                </select>
            </div>

            <div class="world_entry_form_control MarginTop10">
                <label class="checkbox_label" for="lorebook-order-adjustment-enabled">
                    <input type="checkbox" id="lorebook-order-adjustment-enabled"
                           ${currentSettings.orderAdjustment !== 0 ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    Enable Order Adjustment
                </label>
                <small>Fine-tune processing order within this lorebook's priority level</small>

                <div class="world_entry_form_control MarginTop10${currentSettings.orderAdjustment !== 0 ? '' : ' hidden'}" id="lorebook-order-adjustment-container">
                    <h4>Order Adjustment</h4>
                    <small>Higher values process first. Examples: +250 for slight boost, -500 for lower priority.</small>
                    <div class="flexNoWrap flexGap5 justifyCenter">
                        <input type="number" id="lorebook-order-adjustment" class="text_pole textarea_compact"
                               value="${currentSettings.orderAdjustment}" min="-10000" max="10000" step="1"
                               placeholder="0" style="width: 100px;">
                        <small style="color: #888;">-10k to +10k</small>
                    </div>

                    <div class="MarginTop10">
                        <label class="checkbox_label" for="lorebook-order-adjustment-group-only">
                            <input type="checkbox" id="lorebook-order-adjustment-group-only"
                                   ${currentSettings.orderAdjustmentGroupOnly ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Group Chats Only
                        </label>
                        <small>Only apply order adjustment during group chats (ignored in single character chats)</small>
                    </div>
                </div>
            </div>

            <!-- Only When Speaking Toggle -->
            <div class="world_entry_form_control MarginTop10">
                <label class="checkbox_label" for="lorebook-only-when-speaking">
                    <input type="checkbox" id="lorebook-only-when-speaking"
                           ${currentSettings.onlyWhenSpeaking ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    Group chats: Only activate for specific characters (requires character assignments below)
                </label>
                <small>When enabled, this lorebook will only activate when characters assigned in Group Chat Overrides are speaking. <strong>If this box is checked but no characters are assigned below, this lorebook WILL NOT ACTIVATE during group chats.</strong></small>
            </div>

            <!-- Group Chat Overrides -->
            <div class="inline-drawer wide100p world_entry_form_control MarginTop10 MarginBot10">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Group Chat Overrides</b>
                    <div class="fa-solid fa-circle-chevron-down inline-drawer-icon down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="info-block warning MarginBot10">
                        <small>If a character is selected in here, the priority settings here will override the lorebook's default setting only during that character's speaking turns in a group chat.</small>
                    </div>
                    <div class="info-block MarginBot10">
                        <h4>Default Priority: <span id="default-priority-display">3 - Normal</span></h4>
                        <small>Characters not specifically listed will use the priority level set above. Single-character chats always use the default.</small>
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
                const orderAdjustmentEnabled = document.getElementById('lorebook-order-adjustment-enabled');
                const orderAdjustmentInput = document.getElementById('lorebook-order-adjustment');
                const orderAdjustmentGroupOnly = document.getElementById('lorebook-order-adjustment-group-only');
                const onlyWhenSpeaking = document.getElementById('lorebook-only-when-speaking');

                if (prioritySelect && orderAdjustmentEnabled && orderAdjustmentInput && orderAdjustmentGroupOnly && onlyWhenSpeaking) {
                    return {
                        priority: prioritySelect.value,
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
                    toastr.error('Settings form not properly loaded. Please try again.');
                    return null;
                }

                const priorityValue = formState.priority;

                // Validate priority parsing
                let validatedPriority = null;
                if (priorityValue !== '' && priorityValue !== 'null') {
                    const parsedPriority = parseInt(priorityValue);
                    if (isNaN(parsedPriority) || parsedPriority < 1 || parsedPriority > 5) {
                        toastr.error('Priority value must be between 1 and 5', 'Validation Error');
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
                        toastr.error('Order adjustment must be between -10000 and 10000', 'Validation Error');
                        return null;
                    }
                    validatedOrderAdjustment = parsed;
                }

                // Validate character overrides (this may return null if duplicates found)
                const characterOverrides = getCharacterOverrides();
                if (characterOverrides === null) {
                    return null; // Validation failed due to duplicate characters
                }

                const validatedForm = {
                    priority: validatedPriority,
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
                okButton: 'Save Settings',
                cancelButton: 'Cancel',
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
                    toastr.success(`STLO settings saved for ${currentLorebook}`);
                } else {
                    toastr.error(`Failed to save settings for ${currentLorebook}. Check console for details.`, 'Save Error');
                }
            } catch (saveError) {
                console.error('Exception during save operation:', saveError);
                toastr.error(`Failed to save settings for ${currentLorebook}: ${saveError.message}`, 'Save Error');
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

/**
 * Generate advanced mode priority sections
 * @returns {string} HTML string for priority sections
 */
function generateAdvancedContent() {
    const priorityLevels = [
        { level: 5, name: 'Highest', description: 'Processes first' },
        { level: 4, name: 'High', description: 'High priority processing' },
        { level: 3, name: 'Normal', description: 'Standard priority (SillyTavern default)' },
        { level: 2, name: 'Low', description: 'Lower priority processing' },
        { level: 1, name: 'Lowest', description: 'Processes last' }
    ];

    const createPrioritySection = (priority) => `
        <div class="priority-section world_entry_form_control MarginBot10" data-priority="${priority.level}">
            <h4>${priority.level} - ${priority.name} Priority</h4>
            <small>${priority.description}</small>

            <div class="flex1 range-block MarginTop10">
                <div class="range-block-title">
                    <div class="flex-container justifySpaceBetween">
                        <small>Characters</small>
                    </div>
                </div>
                <div class="range-block-range">
                    <select class="override-character-filter text_pole textarea_compact"
                            id="priority-${priority.level}-characters"
                            data-priority="${priority.level}"
                            multiple>
                        <option value="">-- Characters will be populated --</option>
                    </select>
                </div>
            </div>

            <div class="flex1 MarginTop10">
                <label class="checkbox_label" for="override-order-adjustment-enabled-${priority.level}">
                    <input type="checkbox" id="override-order-adjustment-enabled-${priority.level}"
                           class="override-order-adjustment-enabled" data-priority="${priority.level}">
                    <span class="checkmark"></span>
                    Enable Order Adjustment
                </label>
                <small>Fine-tune processing order within this priority level</small>

                <div class="override-order-adjustment-container" data-priority="${priority.level}"
                     style="display: none;">
                    <h5>Order Adjustment</h5>
                    <div class="flexNoWrap flexGap5 justifyCenter">
                        <input type="number" class="text_pole textarea_compact override-order-adjustment"
                               data-priority="${priority.level}" min="-10000" max="10000" step="1"
                               value="0" placeholder="0" style="width: 100px;">
                        <small style="color: #888;">-10k to +10k</small>
                    </div>
                    <small>Higher values process first. Example: +250 for slight boost, -500 for lower priority.</small>
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
                defaultOption.textContent = '-- No characters found --';
                selector.appendChild(defaultOption);
            } else {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = '-- Select characters --';
                selector.appendChild(defaultOption);

                // Add character options
                characters.forEach((character) => {
                    const option = document.createElement('option');
                    const name = character.avatar.replace(/\.[^/.]+$/, '') ?? character.name;
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
        if (selector && $(selector).length) {
            $(selector).select2({
                width: '100%',
                placeholder: 'Select characters for this priority level...',
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
            const char = context?.characters?.find(c => c.avatar === chid);
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
        5: 'Highest',
        4: 'High',
        3: 'Normal',
        2: 'Low',
        1: 'Lowest'
    };
    return names[priority] || 'Unknown';
}

/**
 * Apply priority ordering to all entries
 * @param {Object} eventData - Contains globalLore, characterLore, chatLore, personaLore arrays
 */
async function applyPriorityOrdering(eventData) {
    try {
        const { globalLore, characterLore, chatLore, personaLore } = eventData;

        // Apply priority-based ordering to all entries
        const allEntries = [
            ...(globalLore || []),
            ...(characterLore || []),
            ...(chatLore || []),
            ...(personaLore || [])
        ];

        // Process entries with filtering and optimization
        const processedEntries = [];

        for (const entry of allEntries) {
            try {
                if (!entry.world) {
                    // Entries without world name get default priority and are always included
                    const originalOrder = Math.min(entry.order ?? 100, 9999);
                    entry.order = PRIORITY_LEVELS.DEFAULT * 10000 + originalOrder;
                    processedEntries.push(entry);
                    continue;
                }

                // Load settings once per lorebook
                const settings = await getLorebookSettings(entry.world);

                // FILTERING LOGIC: Apply onlyWhenSpeaking rules
                if (settings.onlyWhenSpeaking) {
                    // Skip if not in group chat (currentSpeakingCharacter would be null)
                    if (!EXTENSION_STATE.currentSpeakingCharacter) {
                        continue; // Skip in single chats
                    }

                    // Skip if current speaker not in character overrides
                    const hasCharacterOverride = settings.characterOverrides?.hasOwnProperty(EXTENSION_STATE.currentSpeakingCharacter);
                    if (!hasCharacterOverride) {
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

            } catch (error) {
                console.warn(`Error setting priority for entry from ${entry.world}:`, error);
                // Keep original order on error and include entry
                processedEntries.push(entry);
            }
        }

        // Sort processed entries by new order (highest first)
        processedEntries.sort((a, b) => (b.order ?? 100) - (a.order ?? 100));

        // Clear all arrays
        globalLore.length = 0;
        characterLore.length = 0;
        chatLore.length = 0;
        personaLore.length = 0;

        // Put everything in globalLore
        globalLore.push(...processedEntries);

    } catch (error) {
        console.error('Error applying priority ordering:', error);
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
            addLorebookOrderingButton();

        } catch (error) {
            console.error('Failed to load STLO extension:', error);
        }
    };

    // Wait for SillyTavern to be ready
    eventSource.once(event_types.APP_READY, initializeExtension);
}

init();
