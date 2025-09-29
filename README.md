# 📚 Lorebook Ordering (A SillyTavern Extension)

A SillyTavern extension that adds lorebook-level priority management to World Info. Allows complete control over which lorebooks activate first. Perfect for users with multiple lorebooks who need fine-grained control over World Info behavior. **Now supports character-specific overrides in group chats and precise order adjustment!**

**📋 [Version History & Changelog](CHANGELOG.md)**

## FAQ
Settings are accessed via the "Lorebook Ordering" button in the World Info panel (appears next to the search box when lorebooks are available).

---

## 🚦 What's New (v1.4.1)

## v1.4.1 (September 29, 2025)
- **🔧 Fix name/avatar name mismatch:** Fixed priority mismatch in name/avatar name clash resolution
  - if avatar name and char name differed, storage vs detection methods differed 
  - fixed to be the same methods

## v1.4.0 (September 29, 2025)
- ****🎭 Group Chat Character Overrides:** Added feature for group chats
  - added on/off toggle for group chats that will only activate a lorebook when the assign character is speaking
  - if box is checked but no characters are assigned, the lorebook does not activate

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
- Configure order adjustment if needed
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

*Vibe Coded with Claude Opus and Sonnet.* 🎯✨