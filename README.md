# 📚 Lorebook Ordering (A SillyTavern Extension)

A SillyTavern extension that adds lorebook-level priority management and budgeting to World Info. Allows complete control over which lorebooks activate first and allows limiting "hungry" lorebooks. Perfect for users with multiple lorebooks who need fine-grained control over World Info behavior. 

---

💡 **Want to unlock the full power of memory management?**
Use STLO together with [SillyTavern-MemoryBooks (STMB)](https://github.com/aikohanasaki/SillyTavern-MemoryBooks) for best results!  
See the [STMB + STLO Guide](guides/STMB%20and%20STLO%20-%20English.md) for setup tips and how to ensure your memories are prioritized correctly.

---

🌐 **Are you looking for documentation or guides in another language?**
Please check the [`/readmes/`](readmes/) folder for translated readmes, and the [`/guides/`](guides/) folder for translated guides in your language!

🆕 **Now supports character-specific overrides in group chats and precise order adjustment!**

**📋 [Version History & Changelog](CHANGELOG.md)**

## FAQ
Settings are accessed via the "Lorebook Ordering" button in the World Info panel (appears next to the search box when lorebooks are available).

![STLO Button](https://github.com/aikohanasaki/imagehost/blob/main/STLO.png)

Q: Is it actually working? Why do I see all the entries in World Info Info? 
A: Yes, it is working. If you look in Console (F12) you will see `[STLO] Trimmed WI entry` recording every single entry that was removed. 

---

## 📋 Prerequisites

- **SillyTavern:** 1.13.5+ (latest recommended)
- **World Info Strategy:** MUST use "evenly" insertion strategy for STLO to function
- **Multiple Lorebooks:** Extension is most useful when you have multiple lorebooks that need prioritization

## 💡 Recommended Global World Info/Lorebook Activation Settings
Tested with these settings:

- **Insertion Strategy:** "evenly" (required for STLO to work)
- **Max Recursion Steps:** 2 (general recommendation)

---

## 🚀 Getting Started

### 1. **Install & Configure**
- Install the extension in your SillyTavern extensions folder
- Ensure you have multiple lorebooks available
- Set World Info insertion strategy to "evenly" in SillyTavern settings

![Extension Button](https://github.com/aikohanasaki/imagehost/blob/main/settings.png)

### 2. **Access Settings**
- Open the World Info panel in SillyTavern
- Look for the "Lorebook Ordering" button next to the search box
- Click to open the lorebook management modal

### 3. **Configure Priorities**
- Select a lorebook from the dropdown
- Set priority level (1=Lowest to 5=Highest, 3=Default)
- Set budget (if desired)
- Configure order adjustment if needed
- Save and repeat for other lorebooks

![Basic (global) settings](https://github.com/aikohanasaki/imagehost/blob/main/STLO%20basic.png)

---

## ⌨️ Slash Command: /stlo

Open the STLO Priority & Budget modal for a specific lorebook directly from the chat input.

- Description: Quickly jump to STLO settings for a given lorebook
- Usage:
  ```
  /stlo <lorebook name>
  ```
- Argument:
  - lorebook name (case-insensitive). You can type names with spaces without quotes; quotes are optional.
- Examples:
  - `/stlo My Lorebook`
  - `/stlo "World Lore"`
  - `/stlo Alice`

What it does:
- Selects the matching lorebook in the World Info editor
- Opens the ST Lorebook Ordering modal for that lorebook

Notes:
- Requires an existing World Info file. If none is selected/available, you’ll see: “Create or select a World Info file first.”
- If the name doesn’t match any lorebook, you’ll see: “Lorebook not found: NAME”
- If you omit the lorebook name, you’ll see the usage hint: “Usage: /stlo <lorebook name>”
- STLO still requires the “evenly” insertion strategy for ordering and budgets to take effect

---

## 🎯 Priority Levels

### **Priority System**
- **Highest (5):** Lorebook entries activate first and get priority in budget allocation
- **High (4):** Higher than default priority
- **Default (3):** Standard SillyTavern behavior (unchanged from original)
- **Low (2):** Lower than default priority
- **Lowest (1):** Lorebook entries activate last

### **How It Works**
- Higher priority lorebooks are processed first during World Info activation
- Only works with "evenly" insertion strategy

---

## 📊 Order Adjustment System

### **Fine-Tuning Beyond Priority**
The Order Adjustment System allows precise control over lorebook entry processing order within the same priority level:

- **Adjustment Range:** -10,000 to +10,000 values added on top of priority calculations
- **Precise Control:** Fine-tune processing order without changing priority levels
- **Mathematical Formula:** `Final Order = Priority × 10,000 + Order Adjustment + Original Entry Order`

### **Example Usage**
```
Lorebook A: Priority 3, Order Adjustment +250
Lorebook B: Priority 3, Order Adjustment -100
Lorebook C: Priority 3, Order Adjustment 0 (default)

Final Processing Order:
1. Lorebook A: 30,250 + entry order (processes first)
2. Lorebook C: 30,000 + entry order (default)
3. Lorebook B: 29,900 + entry order (processes last)
```

### **Group Chat Controls**
- **Always Apply:** Order adjustment works in both single chats and group chats (default)
- **Group Chats Only:** Check this option to only apply order adjustment during group chats
- **Character Overrides:** Set different order adjustments for specific characters in group chats

### **When to Use Order Adjustment**
- **Character vs World:** Boost character-specific lorebooks slightly above general world info
- **Lore Hierarchy:** Ensure critical lore processes before supplementary information
- **Memory Management:** Fine-tune when memories/LTM entries activate relative to other content
- **Dialogue Priorities:** Control when dialogue-related lorebooks activate in conversations

---

## 🎭 Group Chat Character Overrides

![Group Chat Specific Settings](https://github.com/aikohanasaki/imagehost/blob/main/STLO%20group.png)

### **Per-Character Customization**
In group chats, different characters can now have different lorebook behaviors during their individual turns:

- **Character-Specific Priorities:** Alice might use a lorebook at Priority 5, while Bob uses the same lorebook at Priority 2
- **Individual Order Adjustment:** Each character can have custom order adjustment values for the same lorebook
- **Seamless Integration:** Works automatically during group chat generation - no additional setup required

### **How Group Chat Overrides Work**
1. **Configure Override:** In the lorebook settings, expand "Group Chat Overrides" section
2. **Select Characters:** Choose which characters get special settings for this lorebook
3. **Set Custom Values:** Each character can have unique priority and order adjustment settings
4. **Automatic Application:** During group chat, when it's Alice's turn, she uses her override settings; when it's Bob's turn, he uses his

### **Example Scenarios**
- **Character-Focused Lorebook:** Set character's personal lorebook to Priority 5 for them, Priority 1 for others
- **Lore Specialization:** Scholar character gets high priority on academic lorebooks, warrior gets low priority
- **Order Fine-tuning:** Boost character-specific content with positive order adjustments

### **Important Notes**
- **Single Chat Behavior:** Character overrides are ignored in single-character chats (uses default lorebook settings)
- **Fallback Logic:** Characters without specific overrides use the lorebook's default settings
- **No Conflicts:** Switching from group to single chat automatically clears override state

---


## ⚙️ Settings & Configuration

### **Per-Lorebook Settings**
- **Priority:** 1-5 scale with descriptive labels
- **Order Adjustment:** Fine-tune processing order within priority levels
- **Budget Controls:** Limit how much of the World Info/context budget each lorebook can use.
  - **Default:** No per-lorebook limit (no STLO trimming); SillyTavern decides. STLO only orders entries.
  - **% of World Info budget:** Restrict this lorebook to a percentage of the World Info token pool.
  - **% of Max Context:** Restrict by percentage of the model’s maximum usable context window.
  - **Fixed tokens:** Set a specific token limit for this lorebook.
  - Budgets are computed using the prevailing context size from `getMaxContextSize()`, and enforcement requires the “evenly” strategy.
  - **Tip:** Default (0) lets SillyTavern manage the budget. Fixed with 1 will choke off the lorebook.
- **Auto-save:** Settings are automatically saved when changed

### **Global Behavior**
- **Strategy Validation:** Automatically detects if "evenly" strategy is required
- **Smart Warnings:** Only shows compatibility warnings during actual generation (not on chat load)
- **Generation Tracking:** Distinguishes between automatic greetings and user-initiated generation

---

## 🚨 Compatibility & Warnings

### **Strategy Requirements**
STLO requires the "evenly" World Info insertion strategy to function. When the extension detects:
- Special lorebook settings are configured
- Strategy is NOT set to "evenly"

You'll see a warning popup with options to:
- **Stop Generation:** Halt generation to fix settings first
- **Disable STLO:** Continue without lorebook ordering

### **Best Practices**
- Always use "evenly" strategy when STLO is active
- Test priority settings with a small conversation first
- Use order adjustment sparingly for fine-tuning

---

## 🔧 Advanced Usage

### **Multi-Lorebook Scenarios**
- **Character + World:** Set character lorebook to High/Highest priority
- **Memories/LTM:** Set memories to lowest priority
- **Order Control:** Use order adjustment for fine-grained control within priority levels

### **Group Chat Advanced Strategies**
- **Character Specialization:** Give each character high priority on their relevant lorebooks
  - Scholar: High priority on "Magic Theory" lorebook, Normal priority on "Combat Tactics"
  - Warrior: High priority on "Combat Tactics" lorebook, Low priority on "Magic Theory"
- **Order Fine-tuning:** Use order adjustment to boost character-specific content
  - Character-specific lorebooks: +500 order adjustment for that character
  - General lorebooks: 0 order adjustment (default)
- **Lore Consistency:** Ensure character-specific information only appears during their turns
  - Character backstory lorebooks set to Priority 5 for that character, Priority 1 for others

---

*Vibe Coded with Cline and various LLMs.* 🎯✨
