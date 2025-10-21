[Link to ST Memory Books (STMB)](https://github.com/aikohanasaki/SillyTavern-MemoryBooks) | [Link to ST Lorebook Ordering (STLO)](https://github.com/aikohanasaki/SillyTavern-LorebookOrdering)

# 🧠 The Ultimate Memory Guide: STMB + STLO

ST Memory Books (STMB) is essential for **generating memory content**, and ST Lorebook Ordering (STLO) is essential for **guaranteeing that content is actually used** by the AI. When used together, they solve the core problem of **Memory Exclusion**.

## Step 1: Set the Stage (The Foundation)

**Force "Sorted Evenly":** You must first ensure SillyTavern's default World Info (WI) setup is configured to allow STLO to take control. In your SillyTavern **World Info Settings**, set the **World Info Insertion Strategy** to **"Sorted Evenly."** STLO requires this strategy to bypass SillyTavern's base code's rigid category sorting (Chat $\rightarrow$ Persona $\rightarrow$ etc.).

## Step 2: Create the Memory Content (STMB's Job)

Use STMB to automatically create your long-term memories.

1.  **Enable Auto-Summary:** Go to the STMB panel (the magic wand 🪄) and turn **Auto-Summary** ON. Set your preferred interval (e.g., **30 messages**).
2.  **Bind/Create Memory Book:** Ensure your chat has a dedicated Lorebook for memories. STMB will typically place memories in a Global-type book, but often uses the Chat-bound lorebook for simplicity.
3.  **Chat Normally:** As your chat progresses, STMB automatically generates dense, high-quality, structured summaries. These memories are now the "passengers" trying to get onto the AI's limited context "flight."

## Step 3: Guarantee the Priority (STLO's Job)

This is the most critical step. You must use STLO to manually lower the priority of your **Chat-bound STMB book** while elevating your **Character Essentials**.

### A. Break the "Chat-First" Trap
By default, a chat-bound memory book is given the **highest priority** (Chat-First), risking it using too much context space and locking out other World, Character and/or Persona lorebooks. STLO lets you fix this by reassigning a custom, specific priority level.

### B. The Recommended Priority Stack

Use STLO to set custom priorities for all relevant lorebooks:

### Understanding Priority vs Position

**Position** determines *where* content appears in context (Char up, Char down, AN up/down, @D).  
**Priority** determines *budget protection* - what survives when context limits are reached.

Higher priority number = more protected from truncation. Priority works **within each position**, not across positions.

---

### Recommended STLO Priority Settings

| Lorebook/Memory Type | Recommended Priority | Justification |
|:---------------------|:---------------------|:--------------|
| **Character Essentials** (Personality, Description, Core Traits) | **Priority 5** (Highest) | **Maximum budget protection.** Character card information is the foundation of the bot's identity and behavior. This content must never be truncated or the character breaks entirely. Position is typically set by the botmaker (Char/AN down or @D). |
| **World Lore** (Setting, Factions, Locations, Rules) | **Priority 4** (High, with budget limits) | **High protection but controllable.** World-building provides essential context for the bot to function properly. Should be budgeted/limited to prevent bloat, but protected enough that core world information isn't lost. Gets cut before character essentials if needed. |
| **Persona** (Your Identity) | **Priority 2-3** (Medium) | **Moderate protection.** User identity information is important for personalized responses, but the bot can function if some persona details are trimmed. Less critical than character or world foundation. |
| **Commands/General Instructions** | **Priority 2-3** (Medium) | **Moderate protection.** General behavioral instructions and formatting commands. Important for response quality, especially if placed at @D by the botmaker, but not as critical as character integrity. |
| **Memories** (STMB, Recalled Events) | **Priority 1** (Lowest, with budget limits) | **Minimal protection, aggressive budgeting.** Memories should typically be positioned at Char up (early in context) and serve as enrichment rather than essential information. When many memories trigger, most can be safely truncated without breaking the bot. Budget limits prevent memory bloat from crowding out critical information. |

---

### Key Principles

1. **Protect what's irreplaceable**: Character essentials cannot be reconstructed if lost.
2. **Budget what can bloat**: World lore and memories can trigger dozens of entries - limit them.
3. **Position is separate**: A Priority 1 item at @D still appears at the bottom; it just gets cut first if context is full.
4. **Trust the botmaker**: Well-made bots place their most critical instructions at @D regardless of your priority settings.

---

## C. Set a Budget Cap

- **Character Essentials**: No limit (usually compact anyway)
- **World Lore**: 15000-25000 tokens max
- **Persona**: No limit (usually compact)
- **Commands/General**: No limit (usually compact)
- **Memories**: 5000-15000 tokens max (aggressive trimming)

1.  Open the STLO config for your STMB lorebook.
2.  Set a **Budget** cap (e.g., **Fixed tokens** like `5000`, or **Percentage of Context** like `15%`).
3.  This guarantees that even when the lorebook is processed early, it **trims itself** automatically to respect your capacity cap, leaving room for all other Priority 3, 2, and 1 lorebooks.