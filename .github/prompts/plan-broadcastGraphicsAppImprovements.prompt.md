# Suggested Improvements for BroadcastGraphicsApp

Based on my analysis, here are recommendations to make this application compelling for video composite workflows:

---

## 🎯 High-Impact UX Improvements

1. **Live Preview Panel** - Add a small WebView2 preview in the control panel so users can see graphics before sending them live. This is table-stakes for broadcast software.

2. **Keyboard Shortcuts** - Space to toggle selected item, arrow keys to navigate rundown, number keys (1-9) for quick access to rundown items. Essential for live operation.

3. **Drag-and-Drop Rundown Reorder** - Let users reorganize their rundown by dragging items. Currently no reordering is possible.

4. **Visual Live Indicator** - Make active graphics more obvious in the rundown (bold text, colored background, or pulsing indicator) beyond just the checkbox.

5. **Scoreboard Quick Controls** - Add +1/-1 buttons for scores instead of requiring manual text entry during live events.

---

## ✨ Feature Additions

1. **Timer/Countdown Template** - Add a configurable timer with start/stop/reset controls. Common need for event broadcasts.

2. **Transition Controls** - Let users configure animation duration and style (fade, slide direction, etc.) per graphic.

3. **Template Groups/Folders** - Organize templates into categories (Lower Thirds, Scoreboards, Branding, etc.) as the library grows.

4. **Rundown Notes** - Allow adding notes/cues to rundown items that don't affect the graphic but help the operator.

5. **Quick Play Mode** - A simplified view showing only the rundown with large toggle buttons, optimized for touch screens or live operation.

---

## 🔧 Technical Improvements

1. **Fix State Mutation Bug** - Currently `PlayRundownItem` mutates shared template objects. Each rundown item should work with cloned data.

2. **Proper WebView2 Initialization** - Replace the `Task.Delay(1000)` hack with proper `CoreWebView2InitializationCompleted` event handling.

3. **WebSocket API** - Add real-time status updates for external controllers instead of requiring polling.

4. **Auto-Save** - Automatically save rundown changes to prevent data loss.

---

## 🎨 Polish

1. **Color Picker** - Replace hex text inputs with visual color pickers.

2. **Template Thumbnails** - Show preview images in the Graphics Library list.

3. **Status Bar** - Show output window status, API port, connected monitors at a glance.

4. **Dark Mode UI** - Match the typical broadcast control room aesthetic.
