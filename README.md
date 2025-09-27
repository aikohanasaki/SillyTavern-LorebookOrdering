# 📚 Lorebook Ordering (A SillyTavern Extension)

A SillyTavern extension that adds lorebook-level priority and budget management to World Info. Allows complete control over which lorebooks activate first and how much context budget each lorebook can consume. Perfect for users with multiple lorebooks who need fine-grained control over World Info behavior. **Now supports character-specific overrides in group chats and precise order adjustment!**

**📋 [Version History & Changelog](CHANGELOG.md)**

## FAQ
Settings are accessed via the "Lorebook Ordering" button in the World Info panel (appears next to the search box when lorebooks are available).

---

## 🚦 What's New (v1.2.0)

- **📊 Order Adjustment System:** Fine-tune lorebook entry processing order with precision
- **🎯 Custom Adjustment Values:** Add -10,000 to +10,000 adjustment on top of priority levels
- **🎭 Group Chat Controls:** "Group Chats Only" option for selective order adjustment application
- **🔧 Character Override Support:** Order adjustment available in both main settings and character overrides
- **📋 Seamless Integration:** Works perfectly with existing priority system - no breaking changes

### Previous Release (v1.1.0)
- **🎭 Group Chat Character Overrides:** Different characters can now have different lorebook priorities during their turns in group chats
- **⚡ Smart State Management:** Automatic cleanup when switching between chats with robust error handling
- **🔧 Enhanced Integration:** Improved event handling and optimized performance
- **📋 Backward Compatible:** All existing functionality preserved - no breaking changes

### Earlier Release (v1.0.0)
- **Initial Release:** Complete lorebook priority and budget management system
- **Priority Control:** Set custom priority levels (1-5) for each lorebook with Highest, High, Default, Low, and Lowest options
- **Budget Management:** Four budget modes including percentage-based and fixed token allocations
- **Evenly Strategy Integration:** Works seamlessly with SillyTavern's "evenly" World Info insertion strategy
- **Real-time Warnings:** Intelligent warnings when incompatible settings are detected during generation
- **Per-Lorebook Configuration:** Individual settings saved and restored for each lorebook

---

## 📋 Prerequisites

- **SillyTavern:** 1.13.4+ (latest recommended)
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
- Configure budget settings if needed
- Save and repeat for other lorebooks

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
- Entries from higher priority lorebooks get preference in context budget allocation
- Only works with "evenly" insertion strategy

---

## 📊 Order Adjustment System (NEW!)

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

## 🎭 Group Chat Character Overrides (NEW!)

### **Per-Character Customization**
In group chats, different characters can now have different lorebook behaviors during their individual turns:

- **Character-Specific Priorities:** Alice might use a lorebook at Priority 5, while Bob uses the same lorebook at Priority 2
- **Individual Budget Overrides:** Each character can have custom budget allocation for the same lorebook
- **Seamless Integration:** Works automatically during group chat generation - no additional setup required

### **How Group Chat Overrides Work**
1. **Configure Override:** In the lorebook settings, expand "Group Chat Overrides" section
2. **Select Characters:** Choose which characters get special settings for this lorebook
3. **Set Custom Values:** Each character can have unique priority and budget settings
4. **Automatic Application:** During group chat, when it's Alice's turn, she uses her override settings; when it's Bob's turn, he uses his

### **Example Scenarios**
- **Character-Focused Lorebook:** Set character's personal lorebook to Priority 5 for them, Priority 1 for others
- **Lore Specialization:** Scholar character gets high priority on academic lorebooks, warrior gets low priority
- **Budget Management:** Verbose character gets larger budget allocation, quiet character gets smaller allocation

### **Important Notes**
- **Single Chat Behavior:** Character overrides are ignored in single-character chats (uses default lorebook settings)
- **Fallback Logic:** Characters without specific overrides use the lorebook's default settings
- **No Conflicts:** Switching from group to single chat automatically clears override state

---

## 💰 Budget Management

### **Budget Modes**

1. **Default:** Uses SillyTavern's standard budget allocation (no override)
2. **Percentage of Context:** Allocate a specific percentage of total context window
3. **Percentage of Budget:** Allocate a specific percentage of World Info budget
4. **Fixed Tokens:** Set an exact token limit for the lorebook

### **Budget Examples**
- **Percentage of Context (20%):** If context is 8000 tokens, lorebook gets 1600 tokens
- **Percentage of Budget (50%):** If WI budget is 2000 tokens, lorebook gets 1000 tokens
- **Fixed Tokens (500):** Lorebook gets exactly 500 tokens regardless of other settings

---

## ⚙️ Settings & Configuration

### **Per-Lorebook Settings**
- **Priority:** 1-5 scale with descriptive labels
- **Budget Mode:** Choose from four allocation strategies
- **Budget Value:** Numerical value for percentage or fixed modes
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
- Configure budget percentages that don't exceed 100% total
- Test priority settings with a small conversation first

---

## 🔧 Advanced Usage

### **Multi-Lorebook Scenarios**
- **Character + World:** Set character lorebook to High/Highest priority
- **Memories/LTM:** Set memories to lowest priority and set a specific budget for memories
- **Budget Control:** Prevent any single lorebook from dominating context

### **Group Chat Advanced Strategies**
- **Character Specialization:** Give each character high priority on their relevant lorebooks
  - Scholar: High priority on "Magic Theory" lorebook, Normal priority on "Combat Tactics"
  - Warrior: High priority on "Combat Tactics" lorebook, Low priority on "Magic Theory"
- **Dynamic Budget Allocation:** Adjust token limits based on character verbosity
  - Chatty character: 800 token budget on dialogue lorebooks
  - Quiet character: 400 token budget on same lorebooks
- **Lore Consistency:** Ensure character-specific information only appears during their turns
  - Character backstory lorebooks set to Priority 5 for that character, Priority 1 for others

---

*Vibe Coded with Claude Opus and Sonnet.* 🎯✨