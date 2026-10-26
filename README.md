# 0xBoard

<div align="center">
  <h2>
    Offline virtual hand-drawn style whiteboard & desktop application.
    <br />
    Local-first, privacy-focused, and completely offline.
  </h2>
</div>

<br />

> [!NOTE]
> ### Credits & Acknowledgements
> **0xBoard** is built upon and powered by the exceptional open-source whiteboard [Excalidraw](https://github.com/excalidraw/excalidraw).
> We express our immense gratitude and full credit to the [Excalidraw core team and contributors](https://github.com/excalidraw/excalidraw) for creating the original virtual whiteboard engine and component architecture.

---

## Features

- **Free & Open-Source**: Released under the MIT license.
- **100% Offline & Private**: Zero mandatory signups, cloud synchronization, or external server dependencies. Your data stays entirely in your local storage and files.
- **Infinite Canvas**: Hand-drawn sketchy aesthetic with complete freedom of movement.
- **Rich Tooling**: Rectangles, diamonds, circles, arrows, lines, freehand drawing, text, image insertion, erasers, and laser pointers.
- **Dark & Light Modes**: System-adaptive and manual theme switching.
- **Native `.excalidraw` File Format**: Compatible with the standard Excalidraw ecosystem.
- **High-Resolution Export**: Export canvas to PNG, SVG, or copy directly to the system clipboard.
- **Multilingual**: Comprehensive localization (i18n) support across dozens of languages.
- **Command Palette & Shortcuts**: Quick access to all actions via keyboard shortcuts (`Ctrl+/`, `Ctrl+F`, etc.).

---

## Desktop Application (Electron)

0xBoard runs as a native cross-platform desktop application:

### Running Desktop in Development
```bash
# Start the Vite server and Electron desktop window concurrently
yarn electron:dev
```

### Building the Desktop App
```bash
# Compile the web application and Electron main/preload scripts
yarn electron:build

# Launch the built desktop application
yarn electron:start
```

### Packaging Installers
```bash
# Produce standalone installers / executables (Windows NSIS/portable, macOS DMG, Linux AppImage/deb)
yarn electron:dist
```

### Key Desktop Features
- **Native File Dialogs**: Direct Save (`Ctrl+S`) and Save As (`Ctrl+Shift+S`) to `.excalidraw` on disk without browser downloads.
- **Unsaved Changes Indicator**: Window title dirty dot indicator (`●`) and prompt before discarding changes.
- **Native OS Menus & Accelerators**: File, Edit, View, and Help application menus.
- **Recent Files Menu**: Instant access to recently opened boards.
- **Drag & Drop**: Drop `.excalidraw` files directly into the window to open.

---

## Running the Web Version

```bash
# Install dependencies
yarn install

# Start development server
yarn start
# or
npm start
```

---

## Author & Social Links

- **GitHub**: [github.com/s4rrar](https://github.com/s4rrar)
- **Instagram**: [instagram.com/s4rrar](https://instagram.com/s4rrar)
- **Telegram**: [t.me/s4rrar](https://t.me/s4rrar)
- **LinkedIn**: [linkedin.com/in/s4rrar](https://linkedin.com/in/s4rrar)

---

## Upstream Project

- **Original Project**: [Excalidraw](https://github.com/excalidraw/excalidraw)
- **License**: MIT
