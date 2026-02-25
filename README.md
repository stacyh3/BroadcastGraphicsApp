# Broadcast Graphics

Cross-platform desktop application for controlling live broadcast graphics overlays. Built with Electron and TypeScript, it provides a control panel to manage a rundown of graphic templates and a fullscreen output window suitable for chroma/luma keying in production workflows.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm (included with Node.js)

## Getting Started

```bash
# Install dependencies
npm install

# Run the app (compiles TypeScript then launches Electron)
npm start
```

## Building Distributables

```bash
# macOS (.dmg)
npm run build:mac

# Windows (.exe / NSIS installer)
npm run build:win

# Both platforms
npm run build
```

Output is written to the `release/` directory by electron-builder.

## Architecture

The app uses a dual-window Electron architecture:

```
┌──────────────────────────┐       IPC        ┌────────────────────────┐
│     Control Window       │ ◄──────────────► │   Electron Main        │
│  (ui/control.html)       │                  │   (dist/main.js)       │
│  Template library        │                  │                        │
│  Rundown list            │                  │  ┌──────────────────┐  │
│  Property editor         │                  │  │ TemplateService  │  │
│  Theme / settings        │                  │  │ RundownService   │  │
└──────────────────────────┘                  │  │ ThemeService     │  │
                                              │  │ ApiService :8080 │  │
┌──────────────────────────┐       JS eval    │  └──────────────────┘  │
│     Output Window        │ ◄──────────────► │                        │
│  (assets/html/output.html)                  └────────────────────────┘
│  Fullscreen, frameless   │
│  Chroma/luma key ready   │
└──────────────────────────┘
```

- **Control Window** — The operator UI. Loads `ui/control.html` with a preload bridge for IPC.
- **Output Window** — Fullscreen, frameless, no chrome. Renders graphics in layer-based `<div>` elements. Positioned on the secondary monitor when available.
- **Main Process** — Wires services together, handles all IPC between the two windows, and starts the REST API.

### Project Structure

```
├── src/                    # TypeScript source (compiled to dist/)
│   ├── main.ts             # Electron main process, IPC handlers
│   ├── preload.ts          # contextBridge IPC API (~20 methods)
│   ├── models.ts           # Interfaces: GraphicTemplate, RundownItem, ThemeSettings
│   ├── templateService.ts  # Loads templates, renders HTML with {{field}} replacement
│   ├── rundownService.ts   # Rundown array management, JSON save/load
│   ├── themeService.ts     # CSS variable generation from theme settings
│   └── apiService.ts       # Express REST API on localhost:8080
├── ui/                     # Control panel renderer (browser JS/CSS/HTML)
│   ├── control.html
│   ├── control.css
│   └── control.js
├── assets/
│   ├── html/               # Output window rendering engine
│   │   ├── output.html     # Layer-based div system
│   │   ├── style.css       # Graphic animations & transitions
│   │   └── script.js       # injectGraphic, updateGraphic, clearAll, etc.
│   ├── Templates/          # Graphic template definitions
│   │   ├── Clock/
│   │   ├── LowerThird/
│   │   ├── LowerThirdFlat/
│   │   ├── Scoreboard/
│   │   ├── Ticker/
│   │   ├── Timer/
│   │   ├── TopBanner/
│   │   └── Video/
│   └── Images/             # Static images used by templates
├── dist/                   # Compiled JS output (gitignored)
├── tsconfig.json
└── package.json
```

### Templates

Each template lives in `assets/Templates/<Name>/` and contains:

| File | Purpose |
|---|---|
| `config.json` | Declares `id`, `name`, `layer`, and `fields` (with type, label, default) |
| `template.html` | HTML fragment with `{{fieldId}}` placeholders replaced at render time |

**Field types:** `text`, `file` (image picker), `score` (numeric with +/- buttons), `number`.

To add a new template, create a folder under `assets/Templates/` with a `config.json` and `template.html`. It will appear in the control panel automatically on next launch.

### Output Layers

The output window renders graphics into named layers, stacked via CSS `z-index`:

| Layer | Usage |
|---|---|
| `layer-lower-third` | Name straps, titles |
| `layer-ticker` | Scrolling text ticker |
| `layer-clock` | Live clock overlay |
| `layer-scoreboard` | Sports scoreboard |
| `layer-timer` | Countdown / count-up timer |
| `layer-top-banner` | Top-of-screen banner with image |
| `layer-video` | Video playback overlay |
| `layer-fullscreen` | Full-frame graphics |

## Usage

### Control Panel

1. **Template Library** (left sidebar) — Click a template to open its property editor.
2. **Add to Rundown** — Configure fields then click "Add to Rundown" to queue it.
3. **Rundown List** (center) — Your ordered playlist of graphics. Click an item to select it, then:
   - **Play** — Sends the graphic to the output window.
   - **Stop** — Removes the graphic from output.
   - **Move Up/Down** — Reorder items.
   - **Remove** — Delete from the rundown.
4. **Active Graphics** (right) — Shows currently on-air graphics. Click to select, then hide or clear.
5. **Live Preview** — Embedded iframe shows a preview of the output.
6. **Settings** — Theme colors, font, background mode (chroma green / luma black / transparent), and monitor selection.

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Toggle play/stop on selected rundown item |
| `1`–`9` | Quick-play rundown item by position |
| `Delete` | Remove selected rundown item |
| `Ctrl+S` | Save rundown to file |

### Background Modes

The output window background can be switched for different keying workflows:

- **Chroma (green)** — `#00FF00` for chroma key compositing
- **Luma (black)** — `#000000` for luma key compositing
- **Transparent** — For use with capture methods that support alpha channel

### Save / Load

Rundowns are saved as JSON files and can be reloaded across sessions via the control panel or `Ctrl+S`.

## REST API

An Express server runs on `http://localhost:8080` for external automation (companion apps, stream decks, scripts).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Server status, port, and version |
| `POST` | `/api/rundown/:index/play` | Play rundown item by index (0-based) |
| `POST` | `/api/rundown/:index/stop` | Stop rundown item by index |
| `POST` | `/api/graphics/:id/hide` | Hide a graphic by template ID |
| `POST` | `/api/script` | Execute arbitrary JS on the output window |

**Example — play the first rundown item:**

```bash
curl -X POST http://localhost:8080/api/rundown/0/play
```

**Example — execute a script on the output:**

```bash
curl -X POST http://localhost:8080/api/script \
  -H "Content-Type: application/json" \
  -d '{"script": "clearAll()"}'
```

## Tech Stack

| Component | Technology |
|---|---|
| Desktop shell | Electron 40 |
| Language | TypeScript (strict mode) |
| REST API | Express 5 |
| Packaging | electron-builder |
| Rendering | HTML / CSS / vanilla JS |
| Styling | CSS custom properties (theming) |
