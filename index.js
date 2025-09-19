import { event_types, eventSource } from '../../../events.js';
import { getTokenCount } from '../../../tokenizers.js';
import { getContext } from '../../../extensions.js';
import {
    loadWorldInfo,
    saveWorldInfo,
    world_names
} from '../../../world-info.js';
import { callGenericPopup, POPUP_TYPE, Popup } from '../../../popup.js';
import { debounce } from '../../../utils.js';

// Note: toastr is available globally in SillyTavern

// Extension constants
const EXTENSION_NAME = 'lorebook_ordering';
const EXTENSION_DISPLAY_NAME = 'Lorebook Ordering';


// UI element selectors
const SELECTORS = {
    WORLD_INFO_SEARCH: 'world_info_search',
    LOREBOOK_ORDERING_BUTTON: 'lorebook_ordering_button',
    WORLD_EDITOR_SELECT: '#world_editor_select',
    LOREBOOK_PRIORITY_SELECT: 'lorebook_priority_select',
    LOREBOOK_BUDGET_MODE: 'lorebook_budget_mode',
    LOREBOOK_BUDGET_VALUE: 'lorebook_budget_value',
    LOREBOOK_BUDGET_VALUE_CONTAINER: 'lorebook_budget_value_container',
    BUDGET_HINT_TEXT: 'budget_hint_text',
    BUDGET_VALUE_HINT: 'budget_value_hint'
};

// Default settings for lorebooks
const DEFAULT_LOREBOOK_SETTINGS = {
    priority: null,     // null = default priority (3)
    budget: null,       // null = use ST default budget allocation
    budgetMode: 'default'  // 'default' | 'percentage_context' | 'percentage_budget' | 'fixed'
};

// Cleanup tracking
let eventListeners = [];

// Priority constants
const PRIORITY_LEVELS = {
    BACKGROUND: 1,
    LOW: 2,
    DEFAULT: 3,
    HIGH: 4,
    CRITICAL: 5
};


// Extension state tracking
const EXTENSION_STATE = {
    isReady: false,
    modalOpen: false,
    modalLock: false, // Atomic lock for modal operations
    priorityCache: new Map(), // Cache entries: {priority, timestamp}
    priorityCacheMaxSize: 100,
    priorityCacheTTL: 5 * 60 * 1000, // 5 minutes
    lastCacheClean: 0,
    cacheCleanThrottle: 30 * 1000, // 30 seconds
    cacheCleanInProgress: false, // Mutex for cache cleanup
    budgetManager: null,
    pendingAnimationFrame: null,
    uiElements: new Map() // Track UI elements for cleanup
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

function calculatePercentageBudget(budgetValue, totalValue, budgetType) {
    // Inline percentage validation
    if (typeof budgetValue !== 'number' || isNaN(budgetValue) || budgetValue < 1 || budgetValue > 100) {
        return null;
    }
    const calculatedBudget = Math.floor((budgetValue / 100) * totalValue);

    return {
        allocated: Math.max(calculatedBudget, 0),
        description: `${budgetValue}% of ${budgetType} (${calculatedBudget} tokens)`
    };
}

// Extension initialization
jQuery(async () => {

    try {
        // Clean up any previous instance
        if (window[`${EXTENSION_NAME}_cleanup`]) {
            try {
                await window[`${EXTENSION_NAME}_cleanup`]();
            } catch (error) {
                console.warn('Error cleaning up previous instance:', error);
            }
        }

        // Initialize extension
        const context = getContext();
        if (!context) {
            throw new Error('Failed to get SillyTavern context');
        }

        // Initialize extension settings if not present
        if (!context.extensionSettings) {
            context.extensionSettings = {};
        }

        if (!context.extensionSettings[EXTENSION_NAME]) {
            context.extensionSettings[EXTENSION_NAME] = {};
        }

        // Set up event handlers
        setupEventHandlers();

        // Set up UI
        addLorebookOrderingButton();

        // Register cleanup handlers (remove any existing ones first)
        const asyncCleanup = () => cleanup().catch(error =>
            console.error('Cleanup error:', error)
        );

        // Clean up any existing cleanup handlers with consistent references
        const existingAsyncCleanup = window[`${EXTENSION_NAME}_asyncCleanup`];
        const existingCleanup = window[`${EXTENSION_NAME}_cleanup`];

        if (existingAsyncCleanup) {
            window.removeEventListener('beforeunload', existingAsyncCleanup);
            window.removeEventListener('unload', existingAsyncCleanup);
        }

        // Add new async cleanup handlers
        window.addEventListener('beforeunload', asyncCleanup);
        window.addEventListener('unload', asyncCleanup);
        window[`${EXTENSION_NAME}_asyncCleanup`] = asyncCleanup;
        window[`${EXTENSION_NAME}_cleanup`] = cleanup;

        // Mark extension as ready
        EXTENSION_STATE.isReady = true;

    } catch (error) {
        console.error('Failed to load extension:', error);

        // Attempt graceful degradation
        try {

            // Mark extension as partially ready for cleanup purposes
            EXTENSION_STATE.isReady = true;

            // Try to set up basic UI if possible
            addLorebookOrderingButton();

            // Try to set up at least basic event handlers for core functionality
            try {
                const handler = (data) => {
                    console.warn('Processing entries in degraded mode');
                    // Only do basic sorting without advanced features
                    handleWorldInfoEntriesLoaded(data);
                };
                eventSource.on(event_types.WORLDINFO_ENTRIES_LOADED, handler);
                eventListeners.push({
                    source: eventSource,
                    event: event_types.WORLDINFO_ENTRIES_LOADED,
                    handler: handler
                });
            } catch (handlerError) {
            }

            // Register basic cleanup
            window[`${EXTENSION_NAME}_cleanup`] = cleanup;

        } catch (recoveryError) {
            console.error('Recovery failed:', recoveryError);
            // Show user notification about extension failure
            if (typeof toastr !== 'undefined') {
                toastr.error(`Lorebook Ordering extension failed to load. Check console for details.`, 'Extension Error');
            }
        }
    }
});


/**
 * Set up event handlers for world info integration
 */
function setupEventHandlers() {
    // Clean up existing event listeners
    cleanupListeners(eventListeners, eventListeners);

    // Hook into world info entries loading to apply our sorting
    const handler = (data) => handleWorldInfoEntriesLoaded(data);
    eventSource.on(event_types.WORLDINFO_ENTRIES_LOADED, handler);

    // Track for cleanup
    eventListeners.push({
        source: eventSource,
        event: event_types.WORLDINFO_ENTRIES_LOADED,
        handler: handler
    });

}


/**
 * Clean up all resources
 */
async function cleanup() {
    try {
        // Extension unloading
        if (EXTENSION_STATE.isReady) {
            // Extension was ready, now unloading
        }

        // Clean up all state
        EXTENSION_STATE.isReady = false;
        EXTENSION_STATE.modalOpen = false;
        EXTENSION_STATE.modalLock = false;
        EXTENSION_STATE.priorityCache.clear();
        EXTENSION_STATE.budgetManager = null;

        // Clean up UI elements
        for (const [elementId, elementData] of EXTENSION_STATE.uiElements.entries()) {
            if (elementData.element && elementData.clickHandler) {
                elementData.element.removeEventListener('click', elementData.clickHandler);
            }
        }
        EXTENSION_STATE.uiElements.clear();

        // Cancel any pending animation frames
        if (EXTENSION_STATE.pendingAnimationFrame) {
            cancelAnimationFrame(EXTENSION_STATE.pendingAnimationFrame);
            EXTENSION_STATE.pendingAnimationFrame = null;
        }

        cleanupListeners(eventListeners, eventListeners);

    } catch (error) {
        console.error('Error during cleanup:', error);
    }
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
        button.title = 'Configure Lorebook Priority & Budget';

        // Add click handler
        const clickHandler = async () => {
            await openLorebookSettings();
        };
        button.addEventListener('click', clickHandler);

        // Track for cleanup
        EXTENSION_STATE.uiElements.set(SELECTORS.LOREBOOK_ORDERING_BUTTON, {
            element: button,
            clickHandler: clickHandler
        });

        // Validate parent node before insertion
        const parentNode = worldInfoSearch.parentNode;
        if (parentNode && typeof parentNode.insertBefore === 'function') {
            // Insert before the search input
            parentNode.insertBefore(button, worldInfoSearch);
        } else {
            console.error('Invalid parent node for button insertion');
            return false;
        }

        return true;
    };

    // Try to create button immediately
    if (createButton()) {
        return;
    }

    // If immediate creation failed, listen for world info events
    let listenersRemoved = false;
    const handleWorldInfoEvent = () => {
        if (createButton() && !listenersRemoved) {
            // Button created successfully, remove these listeners
            try {
                eventSource.removeListener(event_types.WORLDINFO_UPDATED, handleWorldInfoEvent);
                eventSource.removeListener(event_types.WORLDINFO_SETTINGS_UPDATED, handleWorldInfoEvent);

                // Remove from tracking array safely
                eventListeners = eventListeners.filter(listener =>
                    listener.handler !== handleWorldInfoEvent
                );

                // Set flag after successful removal to prevent re-entry
                listenersRemoved = true;
            } catch (error) {
                console.error('Error removing world info event listeners:', error);
            }
        }
    };

    // Listen for world info events that indicate UI is ready
    try {
        eventSource.on(event_types.WORLDINFO_UPDATED, handleWorldInfoEvent);
        eventSource.on(event_types.WORLDINFO_SETTINGS_UPDATED, handleWorldInfoEvent);

        // Only track listeners after successful registration
        const worldInfoListeners = [
            { source: eventSource, event: event_types.WORLDINFO_UPDATED, handler: handleWorldInfoEvent },
            { source: eventSource, event: event_types.WORLDINFO_SETTINGS_UPDATED, handler: handleWorldInfoEvent }
        ];
        eventListeners.push(...worldInfoListeners);
    } catch (error) {
        console.error('Error registering world info event listeners:', error);
    }

    // Also try on APP_READY using event-driven approach instead of timeout
    const appReadyHandler = () => {
        // Use requestAnimationFrame for DOM readiness instead of setTimeout
        requestAnimationFrame(() => {
            try {
                createButton();
            } catch (error) {
                console.error('Error creating button on APP_READY:', error);
            }
        });
    };

    try {
        eventSource.on(event_types.APP_READY, appReadyHandler);
        // Track the APP_READY listener for cleanup only after successful registration
        eventListeners.push({ source: eventSource, event: event_types.APP_READY, handler: appReadyHandler });
    } catch (error) {
        console.error('Error registering APP_READY event listener:', error);
    }
}

/**
 * Handle the WORLDINFO_ENTRIES_LOADED event to apply our sorting
 * @param {Object} eventData - Contains globalLore, characterLore, chatLore, personaLore arrays
 */
async function handleWorldInfoEntriesLoaded(eventData) {
    try {

        // Apply lorebook priority sorting to the arrays
        await sortEntriesByLorebookPriority(eventData);

        // Apply budget management if any lorebooks have custom budget settings
        await applyBudgetManagement(eventData);

    } catch (error) {
        console.error('Error processing world info entries:', error);
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

        // Get extension settings from world data with deeper validation
        const extensions = worldData.extensions;
        if (!extensions || typeof extensions !== 'object') {
            return { ...DEFAULT_LOREBOOK_SETTINGS };
        }

        const extensionData = extensions[EXTENSION_NAME];
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


        // Ensure extensions object exists
        if (!worldData.extensions) {
            worldData.extensions = {};
        }

        // Save extension settings
        const finalSettings = { ...DEFAULT_LOREBOOK_SETTINGS, ...settings };
        worldData.extensions[EXTENSION_NAME] = finalSettings;


        // Save the world data back immediately
        try {
            await saveWorldInfo(worldName, worldData, true);

            // Use event-based verification instead of immediate reload
            return new Promise((resolve, reject) => {
                let isResolved = false;
                let verifyHandler = null;
                let verificationTimeout = null;

                const cleanupVerification = () => {
                    if (verifyHandler) {
                        try {
                            eventSource.removeListener(event_types.WORLDINFO_UPDATED, verifyHandler);
                        } catch (error) {
                            console.error('Error removing verification handler:', error);
                        }
                        verifyHandler = null;
                    }
                    if (verificationTimeout) {
                        clearTimeout(verificationTimeout);
                        verificationTimeout = null;
                    }
                };

                verificationTimeout = setTimeout(() => {
                    if (!isResolved) {
                        isResolved = true;
                        cleanupVerification();
                        const timeoutError = new Error(`Settings save timeout for ${worldName}`);
                        toastr.error(timeoutError.message, 'Save Error');
                        reject(timeoutError);
                    }
                }, 5000);

                verifyHandler = async (eventWorldName, eventWorldData) => {
                    try {
                        // Check if this is the world we're waiting for
                        if (eventWorldName === worldName && !isResolved) {
                            isResolved = true;
                            cleanupVerification();

                            const savedSettings = eventWorldData?.extensions?.[EXTENSION_NAME];
                            if (savedSettings && JSON.stringify(savedSettings) === JSON.stringify(finalSettings)) {
                                resolve(true);
                            } else {
                                const verificationError = new Error(`Settings verification failed for ${worldName}`);
                                toastr.error(verificationError.message, 'Save Error');
                                reject(verificationError);
                            }
                        }
                    } catch (error) {
                        if (!isResolved) {
                            isResolved = true;
                            cleanupVerification();
                            reject(error);
                        }
                    }
                };

                try {
                    // Use on instead of once so we can manually remove it
                    eventSource.on(event_types.WORLDINFO_UPDATED, verifyHandler);
                } catch (error) {
                    isResolved = true;
                    cleanupVerification();
                    reject(error);
                }
            });
        } catch (saveError) {
            toastr.error(`Save operation failed for ${worldName}`, 'Save Error');
            return false;
        }
    } catch (error) {
        toastr.error(`Error saving settings for ${worldName}`, 'Save Error');
        return false;
    }
}

/**
 * Clean expired entries from priority cache
 */
function cleanPriorityCache() {
    const now = Date.now();
    let cleaned = 0;

    // Convert to array to avoid modifying Map during iteration
    const cacheEntries = Array.from(EXTENSION_STATE.priorityCache.entries());
    const entriesToDelete = [];

    // First pass: identify expired and invalid entries
    for (const [worldName, cacheEntry] of cacheEntries) {
        // Validate cache entry structure
        if (!cacheEntry || typeof cacheEntry !== 'object' ||
            typeof cacheEntry.timestamp !== 'number' ||
            typeof cacheEntry.priority !== 'number' ||
            isNaN(cacheEntry.timestamp) || isNaN(cacheEntry.priority)) {
            entriesToDelete.push(worldName);
            continue;
        }

        if (now - cacheEntry.timestamp > EXTENSION_STATE.priorityCacheTTL) {
            entriesToDelete.push(worldName);
        }
    }

    // Delete identified entries
    entriesToDelete.forEach(worldName => {
        EXTENSION_STATE.priorityCache.delete(worldName);
        cleaned++;
    });

    // If cache is still too large after TTL cleanup, remove oldest entries
    if (EXTENSION_STATE.priorityCache.size > EXTENSION_STATE.priorityCacheMaxSize) {
        const remainingEntries = Array.from(EXTENSION_STATE.priorityCache.entries());
        remainingEntries.sort((a, b) => a[1].timestamp - b[1].timestamp); // Sort by timestamp (oldest first)

        // Calculate how many entries to remove to get back to max size
        const excessCount = EXTENSION_STATE.priorityCache.size - EXTENSION_STATE.priorityCacheMaxSize;
        if (excessCount > 0 && excessCount <= remainingEntries.length) {
            const toRemove = remainingEntries.slice(0, excessCount);
            toRemove.forEach(([worldName]) => {
                EXTENSION_STATE.priorityCache.delete(worldName);
                cleaned++;
            });
        }
    }

    if (cleaned > 0) {
    }
}

/**
 * Get the priority for a lorebook (with default fallback)
 * @param {string} worldName - Name of the lorebook
 * @returns {number} Priority level (1-5, default 3)
 */
async function getLorebookPriority(worldName) {
    // Let null/invalid world names crash to expose bugs

    // Clean cache periodically (throttled with mutex)
    const now = Date.now();
    if (now - EXTENSION_STATE.lastCacheClean > EXTENSION_STATE.cacheCleanThrottle &&
        !EXTENSION_STATE.cacheCleanInProgress) {
        EXTENSION_STATE.cacheCleanInProgress = true;
        try {
            cleanPriorityCache();
            EXTENSION_STATE.lastCacheClean = now;
        } finally {
            EXTENSION_STATE.cacheCleanInProgress = false;
        }
    }

    // Check cache first to prevent duplicate loads
    const cacheEntry = EXTENSION_STATE.priorityCache.get(worldName);
    if (cacheEntry) {
        // Check if cache entry is still valid (reuse 'now' from above)
        if (now - cacheEntry.timestamp <= EXTENSION_STATE.priorityCacheTTL) {
            return cacheEntry.priority;
        } else {
            // Remove expired entry
            EXTENSION_STATE.priorityCache.delete(worldName);
        }
    }

    // Load settings and cache priority
    const settings = await getLorebookSettings(worldName);
    const priority = settings.priority ?? PRIORITY_LEVELS.DEFAULT;

    // Cache the result with timestamp, checking size limit first
    const currentTime = Date.now();
    if (EXTENSION_STATE.priorityCache.size >= EXTENSION_STATE.priorityCacheMaxSize) {
        // Remove oldest entry before adding new one
        const oldestEntry = Array.from(EXTENSION_STATE.priorityCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
        if (oldestEntry) {
            EXTENSION_STATE.priorityCache.delete(oldestEntry[0]);
        }
    }

    EXTENSION_STATE.priorityCache.set(worldName, {
        priority: priority,
        timestamp: currentTime
    });

    // Priority loaded (no events to emit)

    return priority;
}

/**
 * Sort entries by lorebook priority using bucket sorting
 * @param {Object} eventData - Contains globalLore, characterLore, chatLore, personaLore arrays
 */
async function sortEntriesByLorebookPriority(eventData) {
    try {
        // Begin sorting process

        const { globalLore, characterLore, chatLore, personaLore } = eventData;

        // Process each lore array separately
        await sortLoreArrayByPriority(globalLore, 'global');
        await sortLoreArrayByPriority(characterLore, 'character');

        // Chat and persona lore maintain their special priority, but we still sort within them
        await sortLoreArrayByPriority(chatLore, 'chat');
        await sortLoreArrayByPriority(personaLore, 'persona');


        // Sorting completed
    } catch (error) {
        console.error('Error in sortEntriesByLorebookPriority:', error);
        // Sorting failed
    }
}

/**
 * Sort a single lore array by lorebook priority
 * @param {Array} loreArray - Array of world info entries
 * @param {string} loreType - Type of lore for debugging
 */
async function sortLoreArrayByPriority(loreArray, loreType) {
    // Let null/undefined arrays crash to expose bugs

    // Group entries by their lorebook and priority
    const priorityBuckets = new Map();

    // Get priority for each unique lorebook in this array (parallel execution)
    const lorebookPriorities = new Map();
    const uniqueLorebooks = [...new Set(loreArray.map(entry => entry.world).filter(Boolean))];

    // Fetch all priorities in parallel to improve performance
    const priorityPromises = uniqueLorebooks.map(async (worldName) => {
        try {
            const priority = await getLorebookPriority(worldName);
            return { worldName, priority, error: null };
        } catch (error) {
            console.error(`Error fetching priority for lorebook ${worldName}:`, error);
            return { worldName, priority: PRIORITY_LEVELS.DEFAULT, error };
        }
    });

    try {
        const priorityResults = await Promise.all(priorityPromises);
        let errorCount = 0;
        priorityResults.forEach(result => {
            lorebookPriorities.set(result.worldName, result.priority);
            if (result.error) {
                errorCount++;
            }
        });

        // Log summary if there were errors
        if (errorCount > 0) {
            console.warn(`Failed to fetch priorities for ${errorCount} out of ${uniqueLorebooks.length} lorebooks, using defaults`);
        }
    } catch (error) {
        console.error('Critical error in priority fetching:', error);
        // Fallback: set all unknown lorebooks to default priority
        uniqueLorebooks.forEach(worldName => {
            if (!lorebookPriorities.has(worldName)) {
                lorebookPriorities.set(worldName, PRIORITY_LEVELS.DEFAULT);
            }
        });
    }

    // Sort each entry into priority buckets
    for (const entry of loreArray) {
        const worldName = entry.world || 'unknown';
        const priority = lorebookPriorities.get(worldName) || PRIORITY_LEVELS.DEFAULT;

        if (!priorityBuckets.has(priority)) {
            priorityBuckets.set(priority, []);
        }
        priorityBuckets.get(priority).push(entry);
    }

    // Sort buckets by priority (5 = highest, 1 = lowest)
    const sortedPriorities = Array.from(priorityBuckets.keys()).sort((a, b) => b - a);

    // Build complete sorted array before modifying original
    const sortedEntries = [];
    for (const priority of sortedPriorities) {
        const bucket = priorityBuckets.get(priority);

        // Within each bucket, sort by original entry order (descending, higher order = higher priority)
        // Create a copy to avoid mutating the bucket during sort
        const sortedBucket = [...bucket].sort((a, b) => (b.order ?? 100) - (a.order ?? 100));
        sortedEntries.push(...sortedBucket);
    }

    // Atomically replace array contents only after all processing is complete
    // Create a new array and assign it back to preserve reference integrity
    loreArray.length = 0; // Clear array
    loreArray.push(...sortedEntries); // Add sorted entries

    // Verify the operation completed successfully
    if (loreArray.length !== sortedEntries.length) {
        console.error(`Array replacement verification failed: expected ${sortedEntries.length}, got ${loreArray.length}`);
    }

}

/**
 * Filter entries by budget constraints
 * @param {Array} loreArray - Array of world info entries
 * @param {LorebookBudgetManager} budgetManager - Budget manager instance
 */
function filterEntriesByBudget(loreArray, budgetManager) {
    if (!budgetManager || !budgetManager.isInitialized) {
        return;
    }
    // Let null/undefined arrays crash to expose bugs

    // Validate that this is the current budget manager instance and still valid
    const currentBudgetManager = EXTENSION_STATE.budgetManager;
    if (!currentBudgetManager || budgetManager !== currentBudgetManager) {
        return;
    }

    // Additional null safety check before using the manager
    if (!currentBudgetManager.canAddEntry || !currentBudgetManager.recordUsage) {
        return;
    }

    const filteredEntries = [];
    let totalTokensUsed = 0;

    for (const entry of loreArray) {
        // Calculate token count for this entry
        let entryTokens = 0; // Initialize to 0
        try {
            const rawTokenCount = getTokenCount(entry.content || '');
            // Validate token count result - allow 0 for empty entries but ensure it's a valid number
            // Zero-token entries are valid and represent empty content entries which should still be processed
            if (typeof rawTokenCount === 'number' && !isNaN(rawTokenCount) && rawTokenCount >= 0) {
                entryTokens = Math.floor(rawTokenCount); // Ensure integer
            }
            // Note: Zero-token entries are intentionally allowed as they represent empty content
            // These entries may still have triggers and should be included in budget calculations
        } catch (error) {
            console.error('Error calculating token count for entry:', error);
            entryTokens = 0; // Default to 0 on error
        }

        // Check if this entry can be added within budget (atomic operation)
        if (budgetManager.canAddEntry(entry, entryTokens)) {
            filteredEntries.push(entry);
            budgetManager.recordUsage(entry, entryTokens);
            totalTokensUsed += entryTokens;

            // Entry accepted
        } else {

            // Entry rejected due to budget
        }
    }

    // Replace array contents with filtered entries atomically
    loreArray.length = 0;
    loreArray.push(...filteredEntries);

    // Verify the filtering operation
    if (loreArray.length !== filteredEntries.length) {
        console.error(`Budget filtering verification failed: expected ${filteredEntries.length}, got ${loreArray.length}`);
    }

}

/**
 * Apply budget management to world info entries
 * @param {Object} eventData - Contains globalLore, characterLore, chatLore, personaLore arrays
 */
async function applyBudgetManagement(eventData) {
    try {
        // Get all unique lorebook names from all arrays
        const allEntries = [
            ...(eventData.globalLore || []),
            ...(eventData.characterLore || []),
            ...(eventData.chatLore || []),
            ...(eventData.personaLore || [])
        ];

        const uniqueWorlds = new Set(allEntries.map(entry => entry.world).filter(Boolean));
        const worldNames = Array.from(uniqueWorlds);

        if (worldNames.length === 0) {
            return;
        }

        // Check if any lorebooks have custom budget settings
        let hasCustomBudgets = false;
        for (const worldName of worldNames) {
            const settings = await getLorebookSettings(worldName);
            if (settings.budgetMode !== 'default') {
                hasCustomBudgets = true;
                break;
            }
        }

        if (!hasCustomBudgets) {
            return;
        }

        // Initialize budget manager with current context settings
        const context = getContext();
        if (!context) {
            return;
        }
        const maxContext = (typeof context.maxContext === 'number' && context.maxContext > 0)
            ? context.maxContext
            : 8192;
        const totalBudget = Math.floor(maxContext * 0.8); // Reserve 20% for non-WI content

        // Always create a fresh budget manager for each generation to reset usage
        let budgetManager = null;
        try {
            budgetManager = new LorebookBudgetManager(totalBudget, maxContext);
            await budgetManager.initializeBudgets(worldNames);
            // Only assign to global state after successful initialization
            EXTENSION_STATE.budgetManager = budgetManager;
        } catch (error) {
            console.error('Failed to initialize budget manager:', error);
            // Clean up partial state on initialization failure
            if (budgetManager) {
                try {
                    budgetManager.resetUsage();
                } catch (cleanupError) {
                    console.error('Error during budget manager cleanup:', cleanupError);
                }
            }
            // Ensure budget manager is null on failure
            EXTENSION_STATE.budgetManager = null;
            return; // Skip budget management if initialization fails
        }

        // Budget initialized

        // Apply budget filtering to all entry arrays
        filterEntriesByBudget(eventData.globalLore, EXTENSION_STATE.budgetManager);
        filterEntriesByBudget(eventData.characterLore, EXTENSION_STATE.budgetManager);
        filterEntriesByBudget(eventData.chatLore, EXTENSION_STATE.budgetManager);
        filterEntriesByBudget(eventData.personaLore, EXTENSION_STATE.budgetManager);

    } catch (error) {
        console.error('Error applying budget management:', error);
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

/**
 * Open the lorebook settings modal
 */
async function openLorebookSettings() {
    // Use try-finally to ensure modal state is always reset
    try {
        // Atomic lock to prevent race conditions
        if (EXTENSION_STATE.modalLock || EXTENSION_STATE.modalOpen) {
            return;
        }

        // Set both lock and modal state atomically
        EXTENSION_STATE.modalLock = true;
        EXTENSION_STATE.modalOpen = true;

        // Settings opening

        const currentLorebook = getCurrentLorebookName();
        if (!currentLorebook) {
            EXTENSION_STATE.modalLock = false;
            toastr.info('Create or select a World Info file first.', 'World Info is not set', { timeOut: 10000, preventDuplicates: true });
            return;
        }


        // Get current settings
        const currentSettings = await getLorebookSettings(currentLorebook);

        // Create modal HTML
        const modalHtml = `
            <div class="world_entry_form_control">
                <label for="${SELECTORS.LOREBOOK_PRIORITY_SELECT}">Lorebook Priority:</label>
                <select id="${SELECTORS.LOREBOOK_PRIORITY_SELECT}" class="text_pole textarea_compact">
                    <option value="5" ${currentSettings.priority === 5 ? 'selected' : ''}>5 - Critical (Always First)</option>
                    <option value="4" ${currentSettings.priority === 4 ? 'selected' : ''}>4 - High Priority</option>
                    <option value="null" ${currentSettings.priority === null ? 'selected' : ''}>3 - Default (SillyTavern Normal)</option>
                    <option value="2" ${currentSettings.priority === 2 ? 'selected' : ''}>2 - Low Priority</option>
                    <option value="1" ${currentSettings.priority === 1 ? 'selected' : ''}>1 - Background (Always Last)</option>
                </select>
                <div class="range-block">
                    <span>All entries from higher priority lorebooks will activate before lower priority ones.</span>
                </div>
            </div>

            <div class="world_entry_form_control">
                <label for="${SELECTORS.LOREBOOK_BUDGET_MODE}">Budget Mode:</label>
                <select id="${SELECTORS.LOREBOOK_BUDGET_MODE}" class="text_pole textarea_compact">
                    <option value="default" ${currentSettings.budgetMode === 'default' ? 'selected' : ''}>Default (Use SillyTavern Settings)</option>
                    <option value="percentage_context" ${currentSettings.budgetMode === 'percentage_context' ? 'selected' : ''}>Percentage of Max Context</option>
                    <option value="percentage_budget" ${currentSettings.budgetMode === 'percentage_budget' ? 'selected' : ''}>Percentage of WI Budget</option>
                    <option value="fixed" ${currentSettings.budgetMode === 'fixed' ? 'selected' : ''}>Fixed Token Count</option>
                </select>
            </div>

            <div class="world_entry_form_control${currentSettings.budgetMode === 'default' ? ' hidden' : ''}" id="${SELECTORS.LOREBOOK_BUDGET_VALUE_CONTAINER}">
                <label for="${SELECTORS.LOREBOOK_BUDGET_VALUE}">Budget Value:</label>
                <input type="number" id="${SELECTORS.LOREBOOK_BUDGET_VALUE}" class="text_pole textarea_compact"
                       value="${String(currentSettings.budget || '')}" min="0" max="10000" step="1"
                       placeholder="Enter value...">
                <div class="range-block" id="${SELECTORS.BUDGET_VALUE_HINT}">
                    <span id="${SELECTORS.BUDGET_HINT_TEXT}">Enter the budget value for this lorebook.</span>
                </div>
            </div>
        `;

        // Show the modal and set up behavior
        const result = await new Promise((resolve) => {
            let formValues = null;
            let modalEventListeners = [];
            let formStateSnapshot = null;
            const lorebookName = currentLorebook; // Capture in closure scope

            // Create a custom popup that captures form values before closing
            const popup = new Popup(modalHtml, POPUP_TYPE.CONFIRM, '', {
                okButton: 'Save Settings',
                cancelButton: 'Cancel',
                wide: false,
                large: false
            });

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

            // Override the popup's confirm behavior to capture form values
            const originalConfirm = popup.ok;
            popup.ok = () => {
                // Take a snapshot of current form state
                formStateSnapshot = captureFormState();

                if (!formStateSnapshot) {
                    toastr.error('Settings form not properly loaded. Please try again.');
                    return false;
                }

                // Use snapshot for validation and processing
                const priorityValue = formStateSnapshot.priority;
                const budgetModeValue = formStateSnapshot.budgetMode;
                const budgetValue = formStateSnapshot.budgetValue;


                // Validate budget value if not default mode
                let validatedBudgetValue = null;
                if (budgetModeValue !== 'default') {
                    const rawValue = budgetValue.trim();
                    if (rawValue === '') {
                        toastr.error('Budget value is required when not using default mode', 'Validation Error');
                        return false; // Prevent modal close
                    }

                    const parsed = parseInt(rawValue);
                    if (isNaN(parsed) || parsed < 1) {
                        toastr.error('Budget value must be a positive integer', 'Validation Error');
                        return false; // Prevent modal close
                    }

                    // Additional validation based on budget mode with proper range checking
                    if (budgetModeValue === 'percentage_context' || budgetModeValue === 'percentage_budget') {
                        if (parsed < 1 || parsed > 100) {
                            toastr.error('Percentage values must be between 1 and 100', 'Validation Error');
                            return false; // Prevent modal close
                        }
                    } else if (budgetModeValue === 'fixed') {
                        if (parsed > 50000) { // Reasonable upper limit for fixed token count
                            toastr.error('Fixed token count cannot exceed 50,000', 'Validation Error');
                            return false; // Prevent modal close
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
                        return false; // Prevent modal close
                    }
                    validatedPriority = parsedPriority;
                } else if (priorityValue === 'null') {
                    validatedPriority = null; // Explicitly set to null for default
                }

                formValues = {
                    priority: validatedPriority,
                    budgetMode: budgetModeValue,
                    budget: validatedBudgetValue
                };

                // Call original confirm
                return originalConfirm.call(this);
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
            };

            // Show the popup and handle result
            popup.show().then(async (modalResult) => {
                cleanupModalListeners(); // Clean up when modal closes

                // Cancel pending animation frame if modal closes early (atomic operation)
                if (EXTENSION_STATE.pendingAnimationFrame) {
                    const frameId = EXTENSION_STATE.pendingAnimationFrame;
                    EXTENSION_STATE.pendingAnimationFrame = null;
                    cancelAnimationFrame(frameId);
                }

                // Settings opened

                if (modalResult && formValues) {
                    resolve(formValues);
                } else {
                    resolve(null);
                }
            });

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
                    toastr.success(`Lorebook settings saved for ${currentLorebook}`);

                    // Invalidate priority cache for this lorebook
                    EXTENSION_STATE.priorityCache.delete(currentLorebook);

                    // Settings saved
                } else {
                    toastr.error(`Failed to save settings for ${currentLorebook}. Check console for details.`, 'Save Error');
                }
            } catch (saveError) {
                console.error('Error saving lorebook settings:', saveError);
                toastr.error(`Failed to save settings for ${currentLorebook}: ${saveError.message}`, 'Save Error');
            }
        }

    } catch (error) {
        console.error('Error opening lorebook settings:', error);
    } finally {
        // Always reset both modal states when function exits
        EXTENSION_STATE.modalOpen = false;
        EXTENSION_STATE.modalLock = false;
    }
}

/**
 * Set up interactive behavior for the modal
 * @param {Array} modalEventListeners - Array to track event listeners for cleanup
 */
function setupModalBehavior(modalEventListeners = []) {
    const budgetModeSelect = document.getElementById(SELECTORS.LOREBOOK_BUDGET_MODE);
    const budgetValueContainer = document.getElementById(SELECTORS.LOREBOOK_BUDGET_VALUE_CONTAINER);
    const budgetHintText = document.getElementById(SELECTORS.BUDGET_HINT_TEXT);

    // Validate DOM elements are actual HTMLElements
    if (budgetModeSelect && budgetValueContainer && budgetHintText &&
        budgetModeSelect instanceof HTMLElement &&
        budgetValueContainer instanceof HTMLElement &&
        budgetHintText instanceof HTMLElement) {
        const changeHandler = () => {
            const mode = budgetModeSelect.value;

            if (mode === 'default') {
                budgetValueContainer.classList.add('hidden');
            } else {
                budgetValueContainer.classList.remove('hidden');

                // Update hint text based on mode
                switch (mode) {
                    case 'percentage_context':
                        budgetHintText.textContent = 'Percentage of total context length (1-100).';
                        break;
                    case 'percentage_budget':
                        budgetHintText.textContent = 'Percentage of allocated World Info budget (1-100).';
                        break;
                    case 'fixed':
                        budgetHintText.textContent = 'Fixed number of tokens this lorebook can use.';
                        break;
                }
            }
        };

        budgetModeSelect.addEventListener('change', changeHandler);

        // Track this listener for cleanup
        modalEventListeners.push({
            element: budgetModeSelect,
            event: 'change',
            handler: changeHandler
        });

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
}

/**
 * Manages budget allocation and tracking for lorebooks
 */
class LorebookBudgetManager {
    constructor(totalBudget, maxContext) {
        this.totalBudget = totalBudget;
        this.maxContext = maxContext;
        this.budgets = new Map(); // worldName -> {allocated, used, mode, value}
        this.isInitialized = false;
    }

    /**
     * Initialize budgets for all active lorebooks
     * @param {string[]} worldNames - Array of active lorebook names
     */
    async initializeBudgets(worldNames) {
        this.budgets.clear();

        for (const worldName of worldNames) {
            const settings = await getLorebookSettings(worldName);
            const budgetInfo = this.calculateBudgetForLorebook(settings);

            this.budgets.set(worldName, {
                allocated: budgetInfo.allocated,
                used: 0,
                mode: settings.budgetMode,
                value: settings.budget,
                settings: settings
            });
        }

        this.isInitialized = true;
    }

    /**
     * Calculate budget allocation for a specific lorebook
     * @param {Object} settings - Lorebook settings
     * @returns {Object} Budget allocation info
     */
    calculateBudgetForLorebook(settings) {
        const budgetValue = settings.budget || 0;

        switch (settings.budgetMode) {
            case 'percentage_context':
                const contextResult = calculatePercentageBudget(budgetValue, this.maxContext, 'context');
                return contextResult || {
                    allocated: this.totalBudget,
                    description: 'Default (SillyTavern budget)'
                };

            case 'percentage_budget':
                const budgetResult = calculatePercentageBudget(budgetValue, this.totalBudget, 'WI budget');
                return budgetResult || {
                    allocated: this.totalBudget,
                    description: 'Default (SillyTavern budget)'
                };

            case 'fixed':
                if (budgetValue <= 0) {
                    console.warn(`Invalid fixed value: ${budgetValue}, using default`);
                    return {
                        allocated: this.totalBudget,
                        description: 'Default (SillyTavern budget)'
                    };
                }
                return {
                    allocated: Math.max(budgetValue, 0),
                    description: `${budgetValue} tokens (fixed)`
                };

            case 'default':
            default:
                return {
                    allocated: this.totalBudget,
                    description: 'Default (SillyTavern budget)'
                };
        }
    }


    /**
     * Check if an entry can be added within its lorebook's budget
     * @param {Object} entry - World info entry
     * @param {number} tokenCount - Token count for the entry
     * @returns {boolean} Whether the entry can be added
     */
    canAddEntry(entry, tokenCount) {
        if (!this.isInitialized) {
            return true; // Allow if not initialized (fallback to ST behavior)
        }

        const worldName = entry.world || 'unknown';
        if (!worldName || worldName === 'unknown') {
            return true; // Allow if no world name (fallback)
        }

        const budgetInfo = this.budgets.get(worldName);

        if (!budgetInfo) {
            return true; // Allow if no budget info (fallback)
        }

        // For default mode, don't enforce budget limits (use ST's logic)
        if (budgetInfo.mode === 'default') {
            return true;
        }

        const wouldExceed = (budgetInfo.used + tokenCount) > budgetInfo.allocated;

        if (wouldExceed) {
        }

        return !wouldExceed;
    }

    /**
     * Record token usage for a lorebook
     * @param {Object} entry - World info entry
     * @param {number} tokenCount - Token count used
     */
    recordUsage(entry, tokenCount) {
        if (!this.isInitialized) {
            return;
        }

        const worldName = entry.world || 'unknown';
        if (!worldName || worldName === 'unknown') {
            return; // Skip if no world name
        }

        const budgetInfo = this.budgets.get(worldName);

        if (budgetInfo) {
            budgetInfo.used += tokenCount;
        }
    }


    /**
     * Reset usage counters
     */
    resetUsage() {
        for (const budgetInfo of this.budgets.values()) {
            budgetInfo.used = 0;
        }
    }
}

// Export for potential external use
export {
    EXTENSION_NAME,
    EXTENSION_DISPLAY_NAME,
    PRIORITY_LEVELS,
    DEFAULT_LOREBOOK_SETTINGS,
    EXTENSION_STATE
};