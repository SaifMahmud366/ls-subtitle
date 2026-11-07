/**
 * ============================================================================
 * ls-subtitle: GitHub REST API & Tree Parser
 * ============================================================================
 * Fetches repository tree recursively, parses folders and files, and handles
 * caching and rate limits.
 */

(function() {
  const CACHE_KEY = "ls_subtitle_tree_cache";
  const CACHE_TIME_KEY = "ls_subtitle_tree_cache_time";

  /**
   * Tree Store: holds directory structure and index
   */
  class GitHubTreeService {
    constructor() {
      this.rawTree = [];
      this.directoryMap = new Map(); // path -> Array of children
      this.allFiles = [];           // flat list of supported files
      this.statusMessage = "";
      this.statusType = "info"; // "info", "warning", "success"
    }

    /**
     * Check if a file extension is supported (.srt or .zip)
     */
    isSupportedFile(fileName) {
      const lower = fileName.toLowerCase();
      return window.CONFIG.supportedExtensions.some(ext => lower.endsWith(ext.toLowerCase()));
    }

    /**
     * Extract extension
     */
    getExtension(fileName) {
      const lower = fileName.toLowerCase();
      if (lower.endsWith(".srt")) return ".srt";
      if (lower.endsWith(".zip")) return ".zip";
      const dotIdx = lower.lastIndexOf(".");
      return dotIdx !== -1 ? lower.slice(dotIdx) : "";
    }

    /**
     * Fetch tree from GitHub API or Cache
     */
    async fetchTree(forceRefresh = false) {
      const cfg = window.CONFIG;
      const apiUrl = `https://api.github.com/repos/${cfg.githubUser}/${cfg.githubRepo}/git/trees/${cfg.branch}?recursive=1`;

      // Drop entries left behind when caching was previously enabled.
      if (cfg.cacheTTL <= 0) {
        try {
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(CACHE_TIME_KEY);
        } catch (e) {
          // ignore
        }
      }

      // 1. Check localStorage Cache (only when caching is enabled)
      if (cfg.cacheTTL > 0 && !forceRefresh) {
        try {
          const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
          const cachedData = localStorage.getItem(CACHE_KEY);
          if (cachedTime && cachedData && (Date.now() - parseInt(cachedTime, 10) < cfg.cacheTTL)) {
            const parsed = JSON.parse(cachedData);
            if (Array.isArray(parsed)) {
              this.rawTree = parsed;
              this.statusMessage = "Loaded from local cache (refreshes automatically).";
              this.statusType = "info";
              this.buildDirectoryMap();
              return { success: true, source: "cache" };
            }
          }
        } catch (e) {
          console.warn("[GitHub API] Cache read error:", e);
        }
      }

      // 2. Fetch live from GitHub REST API
      try {
        const response = await fetch(apiUrl, {
          headers: {
            "Accept": "application/vnd.github.v3+json"
          }
        });

        // Handle Rate Limiting (403)
        if (response.status === 403) {
          const rateLimitMsg = "GitHub API rate limit reached (60 req/hr for unauthenticated IPs).";
          console.warn(`[GitHub API] ${rateLimitMsg}`);
          return this.useEmptyData(rateLimitMsg, "warning");
        }

        if (!response.ok) {
          throw new Error(`GitHub API returned status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const treeItems = data.tree || [];

        // Check if repo has any items under rootFolder (e.g. Subtitles/)
        const rootPrefix = cfg.rootFolder ? `${cfg.rootFolder}/` : "";
        const hasSubtitles = treeItems.some(item => item.path.startsWith(rootPrefix));

        if (!hasSubtitles) {
          // Repo exists on GitHub, but no subtitle files have been pushed yet
          const note = `Connected to GitHub (${cfg.githubUser}/${cfg.githubRepo}), but no files were found under ${cfg.rootFolder}/.`;
          return this.useEmptyData(note, "info");
        }

        // Cache live data (only when caching is enabled)
        if (cfg.cacheTTL > 0) {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(treeItems));
            localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
          } catch (e) {
            console.warn("[GitHub API] Could not cache tree to localStorage:", e);
          }
        }

        this.rawTree = treeItems;
        this.statusMessage = `Live GitHub index synchronized from ${cfg.githubUser}/${cfg.githubRepo}@${cfg.branch}`;
        this.statusType = "success";
        this.buildDirectoryMap();
        return { success: true, source: "github" };

      } catch (err) {
        console.warn("[GitHub API] Fetch failed:", err.message);
        return this.useEmptyData(`GitHub sync failed (${err.message}).`, "warning");
      }
    }

    /**
     * Empty-data loader: shows the empty state instead of sample entries.
     */
    useEmptyData(message, type = "info") {
      this.rawTree = [];
      this.statusMessage = message;
      this.statusType = type;
      this.buildDirectoryMap();
      return { success: true, source: "empty" };
    }

    /**
     * Parse raw flat tree into an organized directory map
     */
    buildDirectoryMap() {
      this.directoryMap.clear();
      this.allFiles = [];

      const rootPrefix = window.CONFIG.rootFolder ? `${window.CONFIG.rootFolder}/` : "";
      const rootPath = window.CONFIG.rootFolder || "";

      // Ensure root folder exists in map
      if (!this.directoryMap.has(rootPath)) {
        this.directoryMap.set(rootPath, new Map());
      }

      // Process all tree items
      this.rawTree.forEach(item => {
        const fullPath = item.path;

        // Skip items outside the Subtitles/ root folder if rootFolder is defined
        if (rootPrefix && !fullPath.startsWith(rootPrefix) && fullPath !== rootPath) {
          return;
        }

        // Split path into segments
        const segments = fullPath.split("/");

        // Ensure all parent directories exist in directoryMap
        let currentParent = "";
        for (let i = 0; i < segments.length - 1; i++) {
          const folderName = segments[i];
          const folderPath = currentParent ? `${currentParent}/${folderName}` : folderName;

          if (!this.directoryMap.has(folderPath)) {
            this.directoryMap.set(folderPath, new Map());
          }

          if (currentParent && this.directoryMap.has(currentParent)) {
            const parentChildren = this.directoryMap.get(currentParent);
            if (!parentChildren.has(folderName)) {
              parentChildren.set(folderName, {
                name: folderName,
                path: folderPath,
                type: "folder"
              });
            }
          }

          currentParent = folderPath;
        }

        // If it's a blob/file, process if supported (.srt, .zip)
        if (item.type === "blob") {
          const fileName = segments[segments.length - 1];
          if (!this.isSupportedFile(fileName)) {
            return; // Skip unsupported file extensions (.mp4, .txt, etc.)
          }

          const parentDir = segments.slice(0, -1).join("/");
          const ext = this.getExtension(fileName);
          const downloadUrl = window.CONFIG.getRawUrl(fullPath);

          const fileNode = {
            name: fileName,
            path: fullPath,
            type: "file",
            extension: ext,
            size: item.size || 0,
            downloadUrl: downloadUrl
          };

          if (this.directoryMap.has(parentDir)) {
            this.directoryMap.get(parentDir).set(fileName, fileNode);
          }

          this.allFiles.push(fileNode);
        } else if (item.type === "tree") {
          // Explicit directory item
          const folderName = segments[segments.length - 1];
          const parentDir = segments.slice(0, -1).join("/");

          if (!this.directoryMap.has(fullPath)) {
            this.directoryMap.set(fullPath, new Map());
          }

          if (parentDir && this.directoryMap.has(parentDir)) {
            this.directoryMap.get(parentDir).set(folderName, {
              name: folderName,
              path: fullPath,
              type: "folder"
            });
          }
        }
      });
    }

    /**
     * Folder ordering: 4-digit year folders newest-first (2027 → 2024),
     * everything else alphabetical with numeric awareness (Season 2 before Season 10).
     */
    compareFolders(a, b) {
      const isYear = name => /^\d{4}$/.test(name);
      if (isYear(a.name) && isYear(b.name)) {
        return b.name.localeCompare(a.name, undefined, { numeric: true });
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    }

    /**
     * Get contents of a specific folder path
     */
    getFolderContents(folderPath) {
      // Normalize path
      let cleanPath = folderPath.replace(/^\/+|\/+$/g, "");
      if (!cleanPath) cleanPath = window.CONFIG.rootFolder;

      const childrenMap = this.directoryMap.get(cleanPath);
      if (!childrenMap) {
        return { folders: [], files: [], exists: false };
      }

      const folders = [];
      const files = [];

      childrenMap.forEach(item => {
        if (item.type === "folder") {
          // Count items inside this subfolder
          const subChildren = this.directoryMap.get(item.path);
          const count = subChildren ? subChildren.size : 0;
          folders.push({ ...item, itemCount: count });
        } else {
          files.push(item);
        }
      });

      // Folders first (years newest-first), then files alphabetically
      folders.sort((a, b) => this.compareFolders(a, b));
      files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      return { folders, files, exists: true };
    }

    /**
     * Search files by keyword across all or current path
     */
    searchFiles(query, currentFolder = "") {
      if (!query || !query.trim()) return [];
      const q = query.trim().toLowerCase();

      return this.allFiles.filter(file => {
        if (currentFolder && file.path !== currentFolder && !file.path.startsWith(`${currentFolder}/`)) {
          return false;
        }
        return file.name.toLowerCase().includes(q) || file.path.toLowerCase().includes(q);
      });
    }

    /**
     * Clear localStorage cache to force fresh pull
     */
    clearCache() {
      try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIME_KEY);
      } catch (e) {
        // ignore
      }
    }
  }

  // Expose global service instance
  window.GitHubService = new GitHubTreeService();
})();
