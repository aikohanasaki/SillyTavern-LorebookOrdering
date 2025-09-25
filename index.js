import { event_types, eventSource } from '../../../events.js';
import { getTokenCount } from '../../../tokenizers.js';
import { getContext } from '../../../extensions.js';
import { loadWorldInfo, saveWorldInfo, worldInfoCache, world_info_character_strategy, world_info_insertion_strategy, world_info_budget, world_info_budget_cap, world_names } from '../../../world-info.js';
import { POPUP_TYPE, Popup } from '../../../popup.js';
import { stopGeneration } from '../../../../script.js';

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
    budget: null,       // null = use ST default budget allocation
    budgetMode: 'default',  // 'default' | 'percentage_context' | 'percentage_budget' | 'fixed'
    characterOverrides: {}  // Character-specific priority overrides for group chats
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
    generationsSinceChatChange: 0
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
    const chatChangedHandler = () => { EXTENSION_STATE.generationsSinceChatChange = 0; };

    eventSource.on(event_types.GENERATION_STARTED, generationStartHandler);
    eventSource.on(event_types.GENERATION_STOPPED, generationStopHandler);
    eventSource.on(event_types.GENERATION_ENDED, generationEndHandler);
    eventSource.on(event_types.CHAT_CHANGED, chatChangedHandler);

    // Track for cleanup
    eventListeners.push(
        { source: eventSource, event: event_types.WORLDINFO_ENTRIES_LOADED, handler: handler },
        { source: eventSource, event: event_types.GENERATION_STARTED, handler: generationStartHandler },
        { source: eventSource, event: event_types.GENERATION_STOPPED, handler: generationStopHandler },
        { source: eventSource, event: event_types.GENERATION_ENDED, handler: generationEndHandler },
        { source: eventSource, event: event_types.CHAT_CHANGED, handler: chatChangedHandler }
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
        button.title = 'Configure STLO Priority & Budget';

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

        // Apply evenly strategy implementation

        // Identify lorebooks with custom budgets
        const budgetedLorebooks = await identifyBudgetedLorebooks(eventData);

        // Pre-activate entries for budgeted lorebooks
        const preActivatedEntries = await preActivateBudgetedEntries(eventData, budgetedLorebooks);

        // Remove original entries from budgeted lorebooks
        removeOriginalBudgetedEntries(eventData, budgetedLorebooks);

        // Combine all arrays into globalLore with priority ordering
        await combineIntoGlobalLore(eventData, preActivatedEntries, budgetedLorebooks);

    } catch (error) {
        toastr.warning('STLO encountered an error. Disabling STLO, returning to core ST function', 'Extension Warning');
        return;
    }
}

/**
 * Check if any lorebooks have special priority or budget settings
 * @param {Object} eventData - Contains globalLore, characterLore, chatLore, personaLore arrays
 * @returns {boolean} True if any lorebook has non-default settings
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

        // Check each lorebook for special settings
        for (const worldName of uniqueWorlds) {
            try {
                const settings = await getLorebookSettings(worldName);

                // Check for non-default priority
                if (settings.priority !== null && settings.priority !== PRIORITY_LEVELS.DEFAULT) {
                    return true;
                }

                // Check for custom budget mode
                if (settings.budgetMode !== 'default') {
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
                <span>You have lorebooks with custom priority or budget settings, but your World Info Insertion Strategy is not set to "Sorted Evenly". STLO requires the "Sorted Evenly" strategy to work properly. What would you like to do?</span>
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
 * Identify lorebooks with custom budget settings
 * @param {Object} eventData - Contains globalLore, characterLore, chatLore, personaLore arrays
 * @returns {string[]} Array of lorebook names with custom budgets
 */
async function identifyBudgetedLorebooks(eventData) {
    try {
        // Collect all unique lorebook names
        const allEntries = [
            ...(eventData.globalLore || []),
            ...(eventData.characterLore || []),
            ...(eventData.chatLore || []),
            ...(eventData.personaLore || [])
        ];

        const uniqueWorlds = new Set(allEntries.map(entry => entry.world).filter(Boolean));
        const budgetedLorebooks = [];

        // Check each lorebook for custom budget settings
        for (const worldName of uniqueWorlds) {
            try {
                const settings = await getLorebookSettings(worldName);
                if (settings.budgetMode !== 'default') {
                    budgetedLorebooks.push(worldName);
                }
            } catch (error) {
                console.warn(`Error checking budget settings for lorebook ${worldName}:`, error);
            }
        }


        return budgetedLorebooks;
    } catch (error) {
        console.error('Error identifying budgeted lorebooks:', error);
        return [];
    }
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
        const saveResult = await saveWorldInfo(worldName, worldData, true);

        // Clear cache and verify save
        worldInfoCache.delete(worldName);
        await new Promise(resolve => setTimeout(resolve, 100));

        const verifyData = await loadWorldInfo(worldName);
        const savedSettings = verifyData?.[EXTENSION_NAME];

        if (savedSettings && JSON.stringify(finalSettings) === JSON.stringify(savedSettings)) {
            return true;
        } else {
            console.error(`Settings verification failed for ${worldName}:`, {
                expected: finalSettings,
                actual: savedSettings
            });
            toastr.error(`Settings verification failed for ${worldName}`, 'Save Error');
            return false;
        }
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
                <small>Higher numbers (4-5) process first and get budget priority. Lower numbers (1-2) process last.</small>

                <select id="${SELECTORS.LOREBOOK_PRIORITY_SELECT}" class="text_pole textarea_compact">
                    <option value="5" ${currentSettings.priority === 5 ? 'selected' : ''}>5 - Highest Priority (Processes First)</option>
                    <option value="4" ${currentSettings.priority === 4 ? 'selected' : ''}>4 - High Priority</option>
                    <option value="null" ${currentSettings.priority === null ? 'selected' : ''}>3 - Normal (SillyTavern Default)</option>
                    <option value="2" ${currentSettings.priority === 2 ? 'selected' : ''}>2 - Low Priority</option>
                    <option value="1" ${currentSettings.priority === 1 ? 'selected' : ''}>1 - Lowest Priority (Processes Last)</option>
                </select>
            </div>

            <div class="world_entry_form_control MarginBot5">
                ${createBudgetControls('lorebook', currentSettings)}
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
                const budgetModeSelect = document.getElementById(SELECTORS.LOREBOOK_BUDGET_MODE);
                const budgetValueInput = document.getElementById(SELECTORS.LOREBOOK_BUDGET_VALUE);

                if (prioritySelect && budgetModeSelect && budgetValueInput) {
                    return {
                        priority: prioritySelect.value,
                        budgetMode: budgetModeSelect.value,
                        budgetValue: budgetValueInput.value,
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
                const budgetModeValue = formState.budgetMode;
                const budgetValue = formState.budgetValue;


                // Validate budget value if not default mode
                let validatedBudgetValue = null;
                if (budgetModeValue !== 'default') {
                    const rawValue = budgetValue.trim();
                    if (rawValue === '') {
                        toastr.error('Budget value is required when not using default mode', 'Validation Error');
                        return null;
                    }

                    const parsed = parseInt(rawValue);
                    if (isNaN(parsed) || parsed < 1) {
                        toastr.error('Budget value must be a positive integer', 'Validation Error');
                        return null;
                    }

                    // Additional validation based on budget mode with proper range checking
                    if (budgetModeValue === 'percentage_context' || budgetModeValue === 'percentage_budget') {
                        if (parsed < 1 || parsed > 100) {
                            toastr.error('Percentage values must be between 1 and 100', 'Validation Error');
                            return null;
                        }
                    } else if (budgetModeValue === 'fixed') {
                        if (parsed > 250000) { // Reasonable upper limit for fixed token count
                            toastr.error('Fixed token count cannot exceed 250,000', 'Validation Error');
                            return null;
                        }
                    }

                    validatedBudgetValue = parsed;
                }

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

                // Validate character overrides (this may return null if duplicates found)
                const characterOverrides = getCharacterOverrides();
                if (characterOverrides === null) {
                    return null; // Validation failed due to duplicate characters
                }

                const validatedForm = {
                    priority: validatedPriority,
                    budgetMode: budgetModeValue,
                    budget: validatedBudgetValue,
                    characterOverrides: characterOverrides
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
                setupModalBehavior(modalEventListeners);
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
 */
function setupModalBehavior(modalEventListeners = []) {
    const budgetModeSelect = document.getElementById(SELECTORS.LOREBOOK_BUDGET_MODE);
    const budgetValueContainer = document.getElementById(SELECTORS.LOREBOOK_BUDGET_VALUE_CONTAINER);
    const budgetHintText = document.getElementById('budget-hint');
    const budgetUnit = document.getElementById('budget-unit');
    const budgetValueInput = document.getElementById(SELECTORS.LOREBOOK_BUDGET_VALUE);

    // Validate DOM elements are actual HTMLElements
    if (budgetModeSelect && budgetValueContainer && budgetHintText && budgetUnit && budgetValueInput &&
        budgetModeSelect instanceof HTMLElement &&
        budgetValueContainer instanceof HTMLElement &&
        budgetHintText instanceof HTMLElement &&
        budgetUnit instanceof HTMLElement &&
        budgetValueInput instanceof HTMLElement) {

        // Store values for each mode type to preserve when switching
        const currentMode = budgetModeSelect.value;
        const currentValue = budgetValueInput.value || '';
        const isCurrentModePercentage = currentMode === 'percentage_context' || currentMode === 'percentage_budget';

        const storedValues = {
            percentage: isCurrentModePercentage ? currentValue : '',
            fixed: (currentMode === 'fixed') ? currentValue : ''
        };

        const updateValidation = (mode) => {
            const isPercentage = mode === 'percentage_context' || mode === 'percentage_budget';
            budgetValueInput.max = isPercentage ? '100' : '10000';
        };

        const changeHandler = () => {
            const mode = budgetModeSelect.value;
            const previousMode = budgetModeSelect.dataset.previousMode || mode;

            if (mode === 'default') {
                budgetValueContainer.classList.add('hidden');
            } else {
                budgetValueContainer.classList.remove('hidden');

                // Store current value for the previous mode before switching
                if (previousMode !== mode) {
                    const wasPreviousPercentage = previousMode === 'percentage_context' || previousMode === 'percentage_budget';
                    if (wasPreviousPercentage) {
                        storedValues.percentage = budgetValueInput.value;
                    } else if (previousMode === 'fixed') {
                        storedValues.fixed = budgetValueInput.value;
                    }
                }

                // Update unit and hint text based on mode
                switch (mode) {
                    case 'percentage_context':
                        budgetUnit.textContent = '%';
                        budgetHintText.textContent = 'Percentage of total context length (1-100).';
                        // Restore percentage value or clamp if switching from fixed
                        budgetValueInput.value = storedValues.percentage || (parseInt(storedValues.fixed) > 100 ? '100' : storedValues.fixed);
                        break;
                    case 'percentage_budget':
                        budgetUnit.textContent = '%';
                        budgetHintText.textContent = 'Percentage of allocated World Info budget (1-100).';
                        // Restore percentage value or clamp if switching from fixed
                        budgetValueInput.value = storedValues.percentage || (parseInt(storedValues.fixed) > 100 ? '100' : storedValues.fixed);
                        break;
                    case 'fixed':
                        budgetUnit.textContent = 'tokens';
                        budgetHintText.textContent = 'Fixed number of tokens this lorebook can use.';
                        // Restore fixed value
                        budgetValueInput.value = storedValues.fixed;
                        break;
                }

                updateValidation(mode);
                budgetModeSelect.dataset.previousMode = mode;
            }
        };

        // Add input validation handler
        const inputHandler = () => {
            const mode = budgetModeSelect.value;
            const value = parseInt(budgetValueInput.value);
            const isPercentage = mode === 'percentage_context' || mode === 'percentage_budget';

            if (isPercentage && value > 100) {
                budgetValueInput.value = '100';
            }

            // Update stored value for current mode
            if (isPercentage) {
                storedValues.percentage = budgetValueInput.value;
            } else if (mode === 'fixed') {
                storedValues.fixed = budgetValueInput.value;
            }
        };

        budgetModeSelect.addEventListener('change', changeHandler);
        budgetValueInput.addEventListener('input', inputHandler);

        // Track listeners for cleanup
        modalEventListeners.push(
            { element: budgetModeSelect, event: 'change', handler: changeHandler },
            { element: budgetValueInput, event: 'input', handler: inputHandler }
        );

        // Trigger the change event to set initial state
        try {
            budgetModeSelect.dispatchEvent(new Event('change'));
        } catch (error) {
            console.error('Error dispatching change event:', error);
            // Manually trigger the change handler as fallback
            try {
                changeHandler();
            } catch (handlerError) {
                console.error('Error in manual change handler fallback:', handlerError);
            }
        }
    }

    // Set up Group Chat Overrides behavior
    setupAdvancedBehavior(modalEventListeners);
}

/**
 * Create budget control HTML section
 * @param {string} prefix - CSS class prefix for selectors
 * @param {Object} settings - Budget settings with budgetMode and budget properties
 * @param {number|null} [priorityLevel=null] - Priority level for override controls
 * @returns {string} HTML string for budget controls
 */
function createBudgetControls(prefix, settings = {}, priorityLevel = null) {
    const budgetMode = settings.budgetMode || 'default';
    const budgetValue = settings.budget || '';
    const isHidden = budgetMode === 'default';
    const isOverride = prefix.includes('override');

    if (isOverride && priorityLevel) {
        return `
        <div class="flex-container flexGap10 MarginTop5">
            <div class="flex2">
                <h5>Budget Mode</h5>
                <select class="text_pole textarea_compact ${prefix}-budget-mode" data-priority="${priorityLevel}">
                    <option value="default" ${budgetMode === 'default' ? 'selected' : ''}>Default (Use Lorebook Settings)</option>
                    <option value="percentage_context" ${budgetMode === 'percentage_context' ? 'selected' : ''}>Percentage of Max Context</option>
                    <option value="percentage_budget" ${budgetMode === 'percentage_budget' ? 'selected' : ''}>Percentage of WI Budget</option>
                    <option value="fixed" ${budgetMode === 'fixed' ? 'selected' : ''}>Fixed Token Count</option>
                </select>
            </div>

            <div class="flex1 ${prefix}-budget-value-container" data-priority="${priorityLevel}" style="display: ${isHidden ? 'none' : 'block'};">
                <h5>Budget Value</h5>
                <div class="flexNoWrap flexGap5 justifyCenter">
                    <input type="number" class="text_pole textarea_compact ${prefix}-budget-value"
                           data-priority="${priorityLevel}" min="0" max="10000" step="1"
                           value="${budgetValue}" placeholder="Value..." style="width: 80px;">
                    <span class="${prefix}-budget-unit" data-priority="${priorityLevel}">%</span>
                </div>
            </div>
        </div>`;
    } else {
        return `
        <h4>Budget Mode</h4>
        <select id="${SELECTORS.LOREBOOK_BUDGET_MODE}" class="text_pole textarea_compact">
            <option value="default" ${budgetMode === 'default' ? 'selected' : ''}>Default (Use SillyTavern Settings)</option>
            <option value="percentage_context" ${budgetMode === 'percentage_context' ? 'selected' : ''}>Percentage of Max Context</option>
            <option value="percentage_budget" ${budgetMode === 'percentage_budget' ? 'selected' : ''}>Percentage of WI Budget</option>
            <option value="fixed" ${budgetMode === 'fixed' ? 'selected' : ''}>Fixed Token Count</option>
        </select>
    </div>

    <div class="world_entry_form_control${isHidden ? ' hidden' : ''}" id="${SELECTORS.LOREBOOK_BUDGET_VALUE_CONTAINER}">
        <h4>Budget Value</h4>
        <small id="budget-hint">Enter the budget value for this lorebook.</small>
        <div class="flexNoWrap flexGap5 justifyCenter">
            <input type="number" id="${SELECTORS.LOREBOOK_BUDGET_VALUE}" class="text_pole textarea_compact"
                   value="${budgetValue}" min="0" max="10000" step="1"
                   placeholder="Enter value..." style="width: 100px;">
            <span id="budget-unit">%</span>
        </div>
    </div>`;
    }
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
        { level: 5, name: 'Highest', description: 'Processes first, gets budget priority' },
        { level: 4, name: 'High', description: 'High priority processing' },
        { level: 3, name: 'Normal', description: 'Standard priority (SillyTavern default)' },
        { level: 2, name: 'Low', description: 'Lower priority processing' },
        { level: 1, name: 'Lowest', description: 'Processes last' }
    ];

    const createPrioritySection = (priority) => `
        <div class="priority-section world_entry_form_control MarginBot10" data-priority="${priority.level}">
            <h4>${priority.level} - ${priority.name} Priority</h4>
            <small>${priority.description}</small>

            ${createBudgetControls('override', {}, priority.level)}

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
        </div>
    `;

    return priorityLevels.map(createPrioritySection).join('');
}

/**
 * Set up behavior for advanced mode
 * @param {Array} modalEventListeners - Array to track event listeners for cleanup
 */
function setupAdvancedBehavior(modalEventListeners = []) {
    // Generate and insert advanced content first
    const advancedSectionsContainer = document.getElementById('advanced-priority-sections');
    if (advancedSectionsContainer) {
        advancedSectionsContainer.innerHTML = generateAdvancedContent();
    }

    // Set up priority display sync
    setupPriorityDisplaySync(modalEventListeners);

    // Set up drawer behavior
    setupDrawerBehavior(modalEventListeners);

    // Set up budget behavior for all priority levels
    setupOverrideBudgetBehavior(modalEventListeners);

    // Populate character selectors
    populateCharacterSelectors();

    // Initialize Select2
    initializeSelect2();
}

/**
 * Set up budget behavior for override modal
 * @param {Array} modalEventListeners - Array to track event listeners for cleanup
 */
function setupOverrideBudgetBehavior(modalEventListeners = []) {
    const priorityLevels = [1, 2, 3, 4, 5];

    for (const priority of priorityLevels) {
        const budgetModeSelect = document.querySelector(`.override-budget-mode[data-priority="${priority}"]`);
        const budgetValueContainer = document.querySelector(`.override-budget-value-container[data-priority="${priority}"]`);
        const budgetUnit = document.querySelector(`.override-budget-unit[data-priority="${priority}"]`);
        const budgetValueInput = document.querySelector(`.override-budget-value[data-priority="${priority}"]`);

        if (budgetModeSelect && budgetValueContainer && budgetUnit && budgetValueInput) {
            const changeHandler = () => {
                const mode = budgetModeSelect.value;

                if (mode === 'default') {
                    budgetValueContainer.style.display = 'none';
                } else {
                    budgetValueContainer.style.display = 'block';

                    // Update unit and validation based on mode
                    if (mode === 'percentage_context' || mode === 'percentage_budget') {
                        budgetUnit.textContent = '%';
                        budgetValueInput.max = '100';
                    } else if (mode === 'fixed') {
                        budgetUnit.textContent = 'tokens';
                        budgetValueInput.max = '10000';
                    }
                }
            };

            // Add input validation handler for clamping percentage values
            const inputHandler = () => {
                const mode = budgetModeSelect.value;
                const value = parseInt(budgetValueInput.value);
                const isPercentage = mode === 'percentage_context' || mode === 'percentage_budget';

                if (isPercentage && value > 100) {
                    budgetValueInput.value = '100';
                }
            };

            budgetModeSelect.addEventListener('change', changeHandler);
            budgetValueInput.addEventListener('input', inputHandler);

            modalEventListeners.push(
                { element: budgetModeSelect, event: 'change', handler: changeHandler },
                { element: budgetValueInput, event: 'input', handler: inputHandler }
            );

            // Set initial state
            changeHandler();
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
        const budgetModeSelect = section.querySelector('select[data-priority="' + priority + '"].override-budget-mode');
        const budgetValueInput = section.querySelector('input[data-priority="' + priority + '"].override-budget-value');

        if (characterSelect && characterSelect.value) {
            const selectedChars = $(characterSelect).val() || [];
            const budgetMode = budgetModeSelect?.value || 'default';
            const budgetValue = budgetValueInput?.value || '';

            // Validate budget value for this priority section
            if (selectedChars.length > 0 && budgetMode !== 'default') {
                const rawValue = budgetValue.trim();
                if (rawValue === '') {
                    const priorityName = getPriorityName(parseInt(priority));
                    toastr.error(`Budget value is required for Priority ${priority} - ${priorityName} when not using default budget mode`, 'Validation Error');
                    return null;
                }

                const parsed = parseFloat(rawValue);
                if (isNaN(parsed) || parsed < 1) {
                    const priorityName = getPriorityName(parseInt(priority));
                    toastr.error(`Budget value must be a positive number for Priority ${priority} - ${priorityName}`, 'Validation Error');
                    return null;
                }

                // Additional validation based on budget mode
                if (budgetMode === 'percentage_context' || budgetMode === 'percentage_budget') {
                    if (parsed < 1 || parsed > 100) {
                        const priorityName = getPriorityName(parseInt(priority));
                        toastr.error(`Percentage values must be between 1 and 100 for Priority ${priority} - ${priorityName}`, 'Validation Error');
                        return null;
                    }
                } else if (budgetMode === 'fixed') {
                    if (parsed > 250000) {
                        const priorityName = getPriorityName(parseInt(priority));
                        toastr.error(`Fixed token count cannot exceed 250,000 for Priority ${priority} - ${priorityName}`, 'Validation Error');
                        return null;
                    }
                }
            }

            selectedChars.forEach(chid => {
                // Track priority assignments for duplicate detection
                if (!characterAssignments[chid]) {
                    characterAssignments[chid] = [];
                }
                characterAssignments[chid].push(parseInt(priority));

                overrides[chid] = {
                    priority: parseInt(priority),
                    budgetMode: budgetMode,
                    budget: budgetValue === '' ? null : parseFloat(budgetValue)
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
 * Pre-activate entries for budgeted lorebooks
 * @param {Object} eventData - Contains globalLore, characterLore, chatLore, personaLore arrays
 * @param {string[]} budgetedLorebooks - Array of lorebook names with custom budgets
 * @returns {Array} Array of pre-activated entries
 */
async function preActivateBudgetedEntries(eventData, budgetedLorebooks) {
    if (!budgetedLorebooks || budgetedLorebooks.length === 0) {
        return [];
    }

    const preActivatedEntries = [];

    try {
        for (const lorebookName of budgetedLorebooks) {

            // Collect all entries from this lorebook
            const lorebookEntries = collectLorebookEntries(eventData, lorebookName);

            if (lorebookEntries.length === 0) {
                continue;
            }

            // Get budget for this lorebook
            const settings = await getLorebookSettings(lorebookName);
            const budget = await calculateLorebookBudget(settings);


            // Apply priority-based ordering to entries from this lorebook
            const lorebookPriority = await getLorebookPriority(lorebookName);
            for (const entry of lorebookEntries) {
                const originalOrder = Math.min(entry.order ?? 100, 9999);
                entry.order = lorebookPriority * 10000 + originalOrder;
            }

            // Sort entries by priority-modified order (highest first)
            lorebookEntries.sort((a, b) => (b.order ?? 100) - (a.order ?? 100));

            // Apply budget filtering with simplified activation check
            let usedTokens = 0;
            const activatedEntries = [];

            for (const entry of lorebookEntries) {
                // Simplified activation check (includes disable check)
                if (!wouldActivate(entry)) {
                    continue;
                }

                // Check budget (skip budget check if entry has ignoreBudget flag)
                const rawTokens = getTokenCount(entry.content || '');
                const entryTokens = (typeof rawTokens === 'number' && !isNaN(rawTokens) && rawTokens >= 0) ? rawTokens : 0;
                if (entry.ignoreBudget || usedTokens + entryTokens <= budget) {
                    activatedEntries.push(entry);
                    // Only count tokens toward budget if entry doesn't ignore budget
                    if (!entry.ignoreBudget) {
                        usedTokens += entryTokens;
                    }

                } else {
                    break; // Budget exceeded
                }
            }

            preActivatedEntries.push(...activatedEntries);

        }

        return preActivatedEntries;
    } catch (error) {
        console.error('Error in preActivateBudgetedEntries:', error);
        return [];
    }
}

/**
 * Collect all entries belonging to a specific lorebook from all arrays
 * @param {Object} eventData - Contains globalLore, characterLore, chatLore, personaLore arrays
 * @param {string} lorebookName - Name of the lorebook
 * @returns {Array} Array of entries from the specified lorebook
 */
function collectLorebookEntries(eventData, lorebookName) {
    const allEntries = [
        ...(eventData.globalLore || []),
        ...(eventData.characterLore || []),
        ...(eventData.chatLore || []),
        ...(eventData.personaLore || [])
    ];

    return allEntries.filter(entry => entry.world === lorebookName);
}

/**
 * Calculate budget for a specific lorebook
 * @param {Object} settings - Lorebook settings
 * @returns {number} Budget in tokens
 */
async function calculateLorebookBudget(settings) {
    try {
        const context = getContext();
        const maxContext = (typeof context.maxContext === 'number' && context.maxContext > 0)
            ? context.maxContext
            : 8192;

        const wiBudgetPercentage = (typeof world_info_budget === 'number' && world_info_budget > 0)
            ? world_info_budget
            : 25;
        let totalBudget = Math.round(wiBudgetPercentage * maxContext / 100) || 1;

        const budgetCap = (typeof world_info_budget_cap === 'number' && world_info_budget_cap > 0)
            ? world_info_budget_cap
            : 0;
        if (budgetCap > 0 && totalBudget > budgetCap) {
            totalBudget = budgetCap;
        }

        const budgetValue = settings.budget || 0;

        switch (settings.budgetMode) {
            case 'percentage_context':
                if (budgetValue >= 1 && budgetValue <= 100) {
                    return Math.floor((budgetValue / 100) * maxContext);
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
        }

        // Default fallback
        return totalBudget;
    } catch (error) {
        console.error('Error calculating lorebook budget:', error);
        return 1000; // Safe fallback
    }
}

/**
 * Simplified activation check for pre-activation
 * @param {Object} entry - World info entry
 * @returns {boolean} Whether the entry would likely activate
 */
function wouldActivate(entry) {
    // Skip disabled entries
    if (entry.disable) {
        return false;
    }

    // Must have keys to activate
    if (!Array.isArray(entry.key) || entry.key.length === 0) {
        return false;
    }

    // For pre-activation, assume entries with keys would activate
    // NOTE: This is intentionally simplified. We don't check probability, depth, or actual keyword matching
    // because this function is only used during pre-activation for budgeted lorebooks.
    // SillyTavern will perform the full activation checks (including probability/depth) later
    // when processing the final ordered entries. Our goal here is just priority ordering.
    return true;
}

/**
 * Remove original entries from budgeted lorebooks after pre-activation
 * @param {Object} eventData - Contains globalLore, characterLore, chatLore, personaLore arrays
 * @param {string[]} budgetedLorebooks - Array of lorebook names with custom budgets
 */
function removeOriginalBudgetedEntries(eventData, budgetedLorebooks) {
    if (!budgetedLorebooks || budgetedLorebooks.length === 0) {
        return;
    }

    try {
        const arrays = [eventData.globalLore, eventData.characterLore, eventData.chatLore, eventData.personaLore];

        for (const array of arrays) {
            if (!Array.isArray(array)) continue;

            // Remove entries from budgeted lorebooks
            for (let i = array.length - 1; i >= 0; i--) {
                const entry = array[i];
                if (entry && budgetedLorebooks.includes(entry.world)) {
                    array.splice(i, 1);
                }
            }
        }

    } catch (error) {
        console.error('Error removing original budgeted entries:', error);
    }
}

/**
 * Combine all arrays into globalLore with priority-based ordering
 * @param {Object} eventData - Contains globalLore, characterLore, chatLore, personaLore arrays
 * @param {Array} preActivatedEntries - Pre-activated entries from budgeted lorebooks
 * @param {string[]} budgetedLorebooks - Array of lorebook names with custom budgets
 */
async function combineIntoGlobalLore(eventData, preActivatedEntries, budgetedLorebooks) {
    try {
        const { globalLore, characterLore, chatLore, personaLore } = eventData;

        // Apply priority-based ordering to entries from non-budgeted lorebooks
        // (Pre-activated entries already have priority ordering applied)
        const nonPreActivatedEntries = [
            ...(globalLore || []),
            ...(characterLore || []),
            ...(chatLore || []),
            ...(personaLore || [])
        ];

        for (const entry of nonPreActivatedEntries) {
            try {
                // Entries without world name get default priority
                const priority = entry.world ? await getLorebookPriority(entry.world) : PRIORITY_LEVELS.DEFAULT;
                const originalOrder = Math.min(entry.order ?? 100, 9999); // Cap to prevent overflow

                // Formula: priority * 10000 + originalOrder
                // Priority 1 → order 10000+ (processes last)
                // Priority 5 → order 50000+ (processes first)
                entry.order = priority * 10000 + originalOrder;

            } catch (error) {
                console.warn(`Error setting priority for entry from ${entry.world}:`, error);
                // Keep original order on error
            }
        }

        // Now collect all entries (after modification)
        const allEntries = [
            ...(globalLore || []),
            ...(characterLore || []),
            ...(chatLore || []),
            ...(personaLore || []),
            ...(preActivatedEntries || [])
        ];

        // Sort entries by new order (highest first)
        allEntries.sort((a, b) => (b.order ?? 100) - (a.order ?? 100));

        // Clear all arrays
        globalLore.length = 0;
        characterLore.length = 0;
        chatLore.length = 0;
        personaLore.length = 0;

        // Put everything in globalLore
        globalLore.push(...allEntries);

    } catch (error) {
        console.error('Error combining into globalLore:', error);
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
