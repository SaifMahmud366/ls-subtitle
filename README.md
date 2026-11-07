# ls-subtitle ⚡

> **A minimal, modern, eye-catchy CLI-themed static website for AI-translated Bengali subtitles.**
> Automatically mirrors the directory structure of the GitHub repository as an interactive, terminal-like file browser.

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-22c55e?style=for-the-badge&logo=github)](https://SaifMahmud366.github.io/ls-subtitle/)
[![License: MIT](https://img.shields.io/badge/License-MIT-38bdf8?style=for-the-badge)](LICENSE)
[![Zero Backend](https://img.shields.io/badge/Backend-Zero%20(Pure%20Static)-f59e0b?style=for-the-badge&logo=javascript)](https://github.com/SaifMahmud366/ls-subtitle)

---

```
guest@ls-subtitle:~$ ls -la Subtitles/
drwxr-xr-x  Anime/       [DIR]      3 items   -
drwxr-xr-x  Movies/      [DIR]      2 items   -
drwxr-xr-x  Tv-series/   [DIR]      2 items   -
-rw-r--r--  Oppenheimer.2023.srt    124.5 KB  2023-12-01
-rw-r--r--  Season.01.Complete.zip  845.2 KB  2024-11-05
```

---

## 🌟 Key Features

- 🖥️ **CLI-Themed File Browser**: Terminal-inspired aesthetic with monospace fonts (JetBrains Mono & Inter), `ls -la` styled breadcrumb path bar, permissions columns, and neon glow accents.
- ⚡ **Automated Git Tree Sync**: Automatically fetches repository folders and files directly via GitHub REST Git Trees API (`git/trees/main?recursive=1`) — **zero manual maintenance**.
- 📥 **Single-Click Direct Downloads**:
  - `.srt` single subtitle files (with distinct file icon).
  - `.zip` complete season or movie packs (with distinct archive icon).
- 🎨 **Plug-and-Play Themes**:
  - **Dark Neon (Default)**: Terminal green phosphor on midnight slate.
  - **Light Minimal**: Clean, crisp, high-contrast light terminal.
  - **Cyber Matrix**: Monochrome matrix green phosphor CRT aesthetic.
  - **Dracula Retro**: Developer dark gothic purple & pink palette.
  - **Synthwave '84**: 80s outrun neon pink and electric cyan.
  - *Instant switching without page reload, saved in `localStorage`.*
- 🔎 **Instant Grep Search**: Live search filter (`grep: `) across current directory or the entire repository tree.
- 🧭 **Hash Routing & Breadcrumbs**: Fully navigable at any depth; browser Back/Forward buttons work seamlessly (`#Subtitles/Anime/2024/...`).
- 📱 **Fully Responsive**: Adapts fluidly from 4K desktops to mobile screens with responsive tables and collapsible drawer navigation.
- ⌨️ **CLI Keyboard Shortcuts**:
  - `/` &rarr; Quick-focus search input.
  - `Esc` &rarr; Clear search / reset.
  - `Backspace` &rarr; Go to parent directory (`cd ..`).
- ♿ **Accessible**: Respects `prefers-reduced-motion` and keyboard accessibility standards.
- 🚫 **No Upload Button**: Pure browsable index; submissions are handled via GitHub Pull Requests.

---

## 📁 Repository Structure (Source of Truth)

All subtitles are organized under the `Subtitles/` folder on GitHub:

```
ls-subtitle/
├── Subtitles/
│   ├── Anime/
│   │   └── {Year}/{Name}/{Season}/*.srt        (or Season.zip)
│   ├── Movies/
│   │   └── {Year}/{Name}/*.srt                 (or Movie.zip)
│   └── Tv-series/
│       └── {Year}/{Name}/{Season}/*.srt        (or Season.zip)
│
├── index.html            <- Clean Tailwind master index
├── tailwind.config.js    <- Tailwind source configuration
├── web/
│   ├── css/
│   │   ├── tailwind.input.css <- Tailwind entry file
│   │   ├── tailwind.min.css   <- Compiled Tailwind CSS (committed)
│   │   └── main.css      <- Base styles & theme bindings
│   ├── js/
│   │   ├── config.js     <- Shared configuration & utilities
│   │   ├── github-api.js <- GitHub Trees API fetcher & caching
│   │   ├── renderer.js   <- Clean dynamic file browser, search & downloads
│   │   ├── theme.js      <- Dynamic theme utilities
│   │   └── animations.js <- CLI micro-interactions & shortcuts
│   ├── pages/
│   │   ├── about.html      <- Project overview & architecture
│   │   ├── contribute.html <- Submission guide & git workflow
│   │   └── disclaimer.html <- Legal & AI translation notices
│   └── themes/           <- Theme stylesheets
└── README.md
```

### Supported File Types:
1. `.srt` &mdash; A single subtitle file (encoded in UTF-8).
2. `.zip` &mdash; A complete season pack containing multiple `.srt` files.

*Note: Only `.srt` and season `.zip` files are accepted.*

---

## ⚙️ Configuration & Customization

All configuration lives in `web/js/config.js`:

```javascript
window.CONFIG = {
  githubUser: "SaifMahmud366",          // Your GitHub username
  githubRepo: "ls-subtitle",            // Your GitHub repository name
  branch: "main",                       // Default branch
  rootFolder: "Subtitles",              // Root folder to index
  defaultTheme: "dark-neon",            // Default theme ID
  supportedExtensions: [".srt", ".zip"],
  availableThemes: [
    { id: "dark-neon", name: "Dark Neon", file: "web/themes/dark-neon.css" },
    { id: "cyber-matrix", name: "Cyber Matrix", file: "web/themes/cyber-matrix.css" },
    { id: "dracula-retro", name: "Dracula Retro", file: "web/themes/dracula-retro.css" },
    { id: "light-minimal", name: "Light Minimal", file: "web/themes/light-minimal.css" },
    { id: "synthwave-84", name: "Synthwave '84", file: "web/themes/synthwave-84.css" }
  ],
  cacheTTL: 0                           // 0 = no cache, always fetch fresh
};
```

### How to Add a New Theme:
1. Create a new CSS file in `web/themes/` (e.g., `web/themes/nord-frost.css`):
   ```css
   :root {
     --bg-body: #2e3440;
     --bg-terminal: #3b4252;
     --bg-header: #2e3440;
     --bg-surface: #434c5e;
     --bg-surface-elevated: #4c566a;
     --border-color: #4c566a;
     --border-focus: #88c0d0;
     --text-primary: #eceff4;
     --text-secondary: #d8dee9;
     --text-muted: #7b88a1;
     --text-accent: #88c0d0;
     --accent-rgb: 136, 192, 208;
     --srt-color: #a3be8c;
     --zip-color: #ebcb8b;
     --badge-bg: rgba(136, 192, 208, 0.12);
     --warning-text: #ebcb8b;
     --warning-bg: rgba(235, 203, 139, 0.12);
     --warning-border: rgba(235, 203, 139, 0.35);
   }
   ```
2. Register it in `CONFIG.availableThemes` inside `web/js/config.js`:
   ```javascript
   { id: "nord-frost", name: "Nord Frost", file: "web/themes/nord-frost.css" }
   ```
3. That's it! It will instantly appear in the theme dropdown.

### Rebuilding Tailwind CSS

The site ships with a compiled `web/css/tailwind.min.css`, so no build step is required to deploy. If you add or change Tailwind utility classes, rebuild it with the [Tailwind standalone CLI](https://github.com/tailwindlabs/tailwindcss/releases):

```bash
tailwindcss -c tailwind.config.js -i web/css/tailwind.input.css -o web/css/tailwind.min.css --minify
```

---

## 🚀 Deployment to GitHub Pages

1. Push this repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete ls-subtitle CLI index site"
   git push origin main
   ```
2. Go to **Settings &rarr; Pages** on your GitHub repository.
3. Under **Branch**, select `main` and `/ (root)`, then click **Save**.
4. Your site will be live at:
   `https://SaifMahmud366.github.io/ls-subtitle/`

---

## 🤝 Contribution Guide

To add Bengali subtitles:

1. **Fork** the repository: [SaifMahmud366/ls-subtitle](https://github.com/SaifMahmud366/ls-subtitle)
2. Place files in the correct folder:
   - Anime: `Subtitles/Anime/{Year}/{Name}/{Season}/*.srt` (or `.zip`)
   - Movies: `Subtitles/Movies/{Year}/{Name}/*.srt` (or `.zip`)
   - TV-Series: `Subtitles/Tv-series/{Year}/{Name}/{Season}/*.srt` (or `.zip`)
3. Ensure file is either:
   - A single `.srt` subtitle file.
   - A complete season `.zip` pack containing `.srt` files.
4. Commit your changes and open a **Pull Request**.
5. Once merged, the live index automatically displays your subtitle files!

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
