# 📚 Lorebook Ordering - Version History

**← [Back to README](README.md)**

## v1.2.0 (September 26, 2025)
- **📊 Order Adjustment System:** New fine-tuning feature for lorebook entry processing order
  - Add custom order adjustment values (-10,000 to +10,000) on top of priority levels
  - Example: Priority 3 + adjustment +250 = final order 30,250 for precise control
  - Available in both main lorebook settings and character overrides
  - "Group Chats Only" option allows order adjustment to be applied selectively
  - Seamless integration with existing priority system - no breaking changes
  - Perfect for fine-tuning processing order within the same priority level

## v1.1.1 (September 25, 2025)
- **🔧 Settings Persistence Fix:** Fixed bug where settings would not reload properly in UI
  - Removed unreliable JSON comparison verification that caused false save failures
  - Fixed character overrides not populating in Group Chat Overrides section
  - Settings now persist and load correctly in all scenarios

## v1.1.0 (September 24, 2025)
- **🎭 Group Chat Character Overrides:** Major new feature for per-character lorebook behavior
  - Different characters can now have different lorebook priorities during their turns in group chats
  - Character-specific budget overrides allow fine-tuned resource allocation
  - Seamless integration with existing lorebook settings - no breaking changes

## v1.0.0 (September 2025)
- **Initial Release:** Complete lorebook priority and budget management system for SillyTavern
- **Priority Control System:** Five-level priority system for lorebooks
  - Highest (5): Maximum priority for critical world information
  - High (4): Above-average priority for important lorebooks
  - Default (3): Standard SillyTavern behavior (no modification)
  - Low (2): Below-average priority for supplementary information
  - Lowest (1): Minimum priority for background/optional content
- **Advanced Budget Management:** Four distinct budget allocation modes
  - Default mode: Uses SillyTavern's standard budget allocation
  - Percentage of Context: Allocate specific percentage of total context window
  - Percentage of Budget: Allocate specific percentage of World Info budget
  - Fixed Tokens: Set exact token limits for precise control
- **Evenly Strategy Integration:** Seamless integration with SillyTavern's "evenly" World Info insertion strategy
  - Real-time strategy validation during generation
  - Smart warnings only during user-initiated generation (not automatic greetings)
  - Graceful fallback when strategy requirements aren't met
- **Intelligent Warning System:** Context-aware notifications and user choices
  - Strategy compatibility detection with actionable options
  - User can choose to switch strategy, stop generation, or disable STLO
  - Generation state tracking to avoid spam notifications
- **Per-Lorebook Configuration:** Individual settings management
  - Settings automatically saved per lorebook
  - Persistent configuration across SillyTavern sessions
  - Clean UI with dropdown selection and real-time updates

**← [Back to README](README.md)**

---

*This version history is maintained alongside active development. For the most up-to-date features and configuration options, see the main [README](README.md).*