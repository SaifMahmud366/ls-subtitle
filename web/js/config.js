/**
 * ============================================================================
 * ls-subtitle: Global Configuration & Defaults
 * ============================================================================
 * Master configuration for the clean subtitle index.
 */

window.CONFIG = Object.assign({
  // GitHub Repository Details
  githubUser: "SaifMahmud366",
  githubRepo: "ls-subtitle",
  branch: "main",

  // Root directory inside the repo to treat as the subtitle index root
  rootFolder: "Subtitles",

  defaultTheme: "dark-neon",
  availableThemes: [
    { id: "dark-neon",      name: "Dark Neon",      file: "web/themes/dark-neon.css" },
    { id: "cyber-matrix",   name: "Cyber Matrix",   file: "web/themes/cyber-matrix.css" },
    { id: "dracula-retro",  name: "Dracula Retro",  file: "web/themes/dracula-retro.css" },
    { id: "light-minimal",  name: "Light Minimal",  file: "web/themes/light-minimal.css" },
    { id: "synthwave-84",   name: "Synthwave '84",  file: "web/themes/synthwave-84.css" }
  ],

  // Supported extensions that should be displayed and downloadable
  // .srt -> single subtitle file
  // .zip -> full season/movie pack
  supportedExtensions: [".srt", ".zip"],

  // Cache duration for the GitHub API tree response in milliseconds.
  // 0 = no caching: every page load fetches the latest repo contents.
  cacheTTL: 0,

  // Direct Raw download URL builder
  getRawUrl: function(filePath) {
    const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
    return `https://raw.githubusercontent.com/${this.githubUser}/${this.githubRepo}/${this.branch}/${encodedPath}`;
  }
}, window.CONFIG || {});
