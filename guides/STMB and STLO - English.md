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

| Lorebook/Memory | Custom STLO Priority | Why? (The STACK) |
| :--- | :--- | :--- |
| **Character Essentials** (Personality, Description) | **Priority 5** (Highest) | **Loads First** to lock in the core character identity and voice before anything else loads. |
| **STMB Memory Book** (Your Memories) | **Priority 4** (High) | **Loads Second.** High enough to ensure memory is included, but low enough to guarantee essentials load first. |
| **Persona Lore** (Your Identity) | **Priority 3** (Default/Normal) | **Loads Third.** User identity information is seen after the character's core setup and critical memories. |
| **General/Random Lore** (Event Memories, World Lore) | **Priority 1-2** (Lowest) | **Loads Last.** Less critical information is only included if space remains. |

### C. Set a Budget Cap
For the STMB Memory Book (and any other dense lorebook), use STLO's **Budget** function to prevent it from consuming all space, even if the priority is high.

1.  Open the STLO config for your STMB lorebook.
2.  Set a **Budget** cap (e.g., **Fixed tokens** like `5000`, or **Percentage of Context** like `15%`).
3.  This guarantees that even when the lorebook is processed early, it **trims itself** automatically to respect your capacity cap, leaving room for all other Priority 3, 2, and 1 lorebooks.