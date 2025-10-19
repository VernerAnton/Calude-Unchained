# Design Guidelines: Claude API Chat Interface - Typewriter Aesthetic

## Design Approach
**Reference-Based:** Strict adherence to the provided ToolBox design system with its distinctive vintage typewriter aesthetic. This is a utility-focused application where the retro design creates memorable character while maintaining functional clarity.

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Background: Linear gradient from `#f4f1ea` (warm paper) to `#ebe7db` (aged paper)
- Text: `#2a2a2a` (ink black)
- Borders/Shadows: `#2a2a2a`
- Card Background: `#fefdfb` (fresh paper)
- Card Hover: `#f9f7f0` (subtle highlight)

**Dark Mode:**
- Background: Linear gradient from `#1a1a1a` to `#0d0d0d` (deep terminal)
- Text: `#e0e0e0` (phosphor glow)
- Borders/Shadows: `#e0e0e0`
- Card Background: `#2a2a2a` (charcoal)
- Card Hover: `#333333` (lighter charcoal)

### B. Typography
- **Primary Font:** `'Courier New', Courier, monospace` (all text)
- **Title:** `2.5rem` (clamp to `1.5rem` min), bold, `0.05em` letter-spacing
- **Subtitles:** `1rem`, `0.8` opacity, centered
- **Body/Messages:** `0.875rem` to `1rem`, `1.3-1.5` line-height
- **Labels:** `0.875rem`, bold, uppercase, `0.1em` letter-spacing

### C. Layout System
- **Container:** Max-width `900px`, `2rem` padding (1rem on mobile)
- **Spacing Units:** Use `0.5rem`, `1rem`, `1.5rem`, `2rem` increments
- **Chat Window:** Flex-grow container with min-height, scrollable
- **Message Spacing:** `1rem` to `1.5rem` gap between messages

### D. Component Specifications

**Header:**
- Three-part layout: Mode toggle (left), centered title, spacer (right)
- Border-bottom: `2px solid` (theme color)
- Padding-bottom: `1rem`
- Mode toggle: Three-state cycle button (🌓 auto / ☀️ light / 🌙 dark)

**Chat Window:**
- Full-width container with `2px solid` border
- Box-shadow: `4px 4px 0px` (theme color) - signature typewriter shadow
- Padding: `1.5rem`
- Background: Card background color (theme-dependent)
- Min-height: `400px` to `500px`
- Overflow-y: auto with custom scrollbar styling
- Message bubbles: Distinct styling for user vs. assistant
  - User: Right-aligned, bordered block, no shadow
  - Assistant: Left-aligned, bordered block with typewriter shadow
  - Both: `1rem` padding, `2px solid` border

**Model Selector Dropdown:**
- Position: In header or above chat window
- Style: `2px solid` border matching theme
- Font: Courier New, `0.875rem`, uppercase
- Padding: `0.5rem 1rem`
- Background: Card background
- Border-color and shadow matching theme
- Label: "[ MODEL ]" prefix in brackets

**Input Area:**
- Fixed at bottom or below chat window
- Textarea: Multi-line, `2px solid` border, box-shadow `4px 4px 0px`
- Min-height: `60px`, max-height: `120px`
- Padding: `1rem`
- Font: Courier New, `1rem`
- Resize: vertical

**Send Button:**
- Style: Bordered card matching tool-card aesthetic
- Text: "[ SEND ]" or "▌ SEND"
- Padding: `0.75rem 1.5rem`
- Box-shadow: `4px 4px 0px` (theme color)
- Hover: Transform `translate(-2px, -2px)` with shadow `6px 6px 0px`
- Active: Transform back to `translate(0, 0)`
- Disabled state: `0.6` opacity, cursor not-allowed

**Loading Indicator:**
- Typewriter-style: Blinking cursor "▌" or typing dots "___"
- Positioned in assistant message area
- Opacity animation for blinking effect

### E. Responsive Behavior
- Mobile (<480px): Single column, reduced padding, smaller fonts
- Tablet (768px): Maintain desktop layout with adjusted spacing
- Desktop (>900px): Full featured layout

### F. Interactions & Animations
- Transitions: `0.3s ease` for theme changes and hovers
- Card hover: `-2px` translation with extended shadow
- No distracting animations - focus on immediate clarity
- Smooth scroll behavior in chat window

### G. Accessibility
- Theme toggle: Keyboard accessible, aria-label
- Focus states: `2px solid` outline with `2px` offset
- Buttons: Min touch target `40px x 40px`
- Scrollable areas: Keyboard navigation support
- Message roles: Proper ARIA labels for screen readers

## Key Design Principles
1. **Vintage Consistency:** Every element uses bordered, shadowed aesthetic
2. **Monospace Everything:** Courier New creates unified typewriter feel
3. **Bracket Notation:** Use `[ LABEL ]` pattern for UI labels
4. **Hard Edges:** No border-radius - pure rectangular forms
5. **Solid Shadows:** Always `4px 4px 0px`, extends to `6px 6px 0px` on hover
6. **Understated Color:** Neutral gradients let typography shine
7. **Functional Clarity:** Retro aesthetic never compromises usability

## Images
**No images required.** This interface is text-focused with character derived entirely from typography, borders, and shadows. The typewriter aesthetic is purely CSS-based.