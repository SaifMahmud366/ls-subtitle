/**
 * ============================================================================
 * ls-subtitle: Modern File Browser & DOM Renderer
 * ============================================================================
 * Clean, lightweight renderer for folder navigation, file listing, instant
 * search filtering, stats, and direct subtitle downloads.
 */

(function() {
  let currentPath = window.CONFIG.rootFolder || "Subtitles";
  let activeSearchQuery = "";
  let searchScopeAll = false;

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  function showToast(msg) {
    const toast = document.getElementById("download-toast");
    const toastMsg = document.getElementById("download-toast-msg");
    if (!toast || !toastMsg) return;

    toastMsg.innerHTML = msg;
    toast.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
    toast.classList.add("opacity-100", "translate-y-0");

    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => {
      toast.classList.remove("opacity-100", "translate-y-0");
      toast.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
    }, 3200);
  }

  function bindRowAction(row, label, action) {
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.setAttribute("aria-label", label);
    row.classList.add("focus-visible:outline", "focus-visible:outline-2", "focus-visible:outline-brand");
    row.addEventListener("click", action);
    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        action();
      }
    });
  }

  async function triggerDownload(url, filename) {
    showToast(`Downloading <span class="text-brand font-mono font-medium">${escapeHtml(filename)}</span>...`);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Direct fetch failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (e) {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  function getPathFromHash() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (!hash) return window.CONFIG.rootFolder || "Subtitles";
    try {
      return decodeURIComponent(hash).replace(/^\/+|\/+$/g, "");
    } catch (error) {
      return window.CONFIG.rootFolder || "Subtitles";
    }
  }

  function navigateTo(path) {
    const root = window.CONFIG.rootFolder || "Subtitles";
    let clean = String(path || "").replace(/^\/+|\/+$/g, "");
    if (!clean || (clean !== root && !clean.startsWith(`${root}/`))) clean = root;
    window.location.hash = "#" + clean.split("/").map(encodeURIComponent).join("/");
  }

  function renderBreadcrumbs(path) {
    const container = document.getElementById("breadcrumbs-bar");
    if (!container) return;

    const segments = path.split("/").filter(Boolean);
    let html = `<i class="fa-solid fa-terminal text-brand"></i>`;
    html += `<button type="button" class="text-white hover:text-brand transition-colors font-semibold" data-path="${window.CONFIG.rootFolder}">root</button>`;

    let accumulated = "";
    segments.forEach((seg, index) => {
      accumulated = accumulated ? `${accumulated}/${seg}` : seg;
      const isLast = index === segments.length - 1;

      html += `<span class="opacity-40">/</span>`;
      if (isLast) {
        html += `<span class="text-brand font-semibold truncate">${escapeHtml(seg)}</span>`;
      } else {
        html += `<button type="button" class="hover:text-white transition-colors truncate" data-path="${escapeHtml(accumulated)}">${escapeHtml(seg)}</button>`;
      }
    });

    container.innerHTML = html;

    container.querySelectorAll("button[data-path]").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetPath = btn.getAttribute("data-path");
        if (targetPath) navigateTo(targetPath);
      });
    });

    const activeSeg = segments.length > 0 ? segments[segments.length - 1] : window.CONFIG.rootFolder;
    document.title = `${activeSeg} | ls-subtitle`;
  }

  function renderFileListing() {
    const listContainer = document.getElementById("file-list");
    const emptyState = document.getElementById("terminal-empty-state");
    const loadingState = document.getElementById("terminal-loading-state");
    const statsEl = document.getElementById("footer-stats-text");

    if (!listContainer) return;
    if (loadingState) loadingState.style.display = "none";

    if (activeSearchQuery.trim()) {
      renderSearchResults(listContainer, emptyState, statsEl);
      return;
    }

    const contents = window.GitHubService.getFolderContents(currentPath);
    if (!contents.exists) {
      currentPath = window.CONFIG.rootFolder || "Subtitles";
      if (window.location.hash !== `#${currentPath}`) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${currentPath}`);
      }
      renderBreadcrumbs(currentPath);
    }
    const { folders, files } = contents.exists
      ? contents
      : window.GitHubService.getFolderContents(currentPath);
    listContainer.innerHTML = "";

    const segments = currentPath.split("/").filter(Boolean);
    const isRoot = currentPath === window.CONFIG.rootFolder || segments.length <= 1;

    // Render Parent Directory ("..") Row
    if (!isRoot) {
      const parentPath = segments.slice(0, -1).join("/") || window.CONFIG.rootFolder;
      const parentRow = document.createElement("div");
      parentRow.className = "grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group cursor-pointer select-none";
      parentRow.setAttribute("title", "Navigate to parent directory");
      parentRow.innerHTML = `
        <div class="col-span-6 md:col-span-7 flex items-center gap-3 min-w-0">
          <i class="fa-solid fa-arrow-turn-up text-brand text-lg w-5 text-center flex-shrink-0"></i>
          <span class="font-medium group-hover:text-brand transition-colors font-mono">..</span>
          <span class="text-xs text-muted hidden sm:inline">(Parent Directory)</span>
        </div>
        <div class="col-span-3 md:col-span-2 text-sm text-muted font-mono">-</div>
        <div class="col-span-3 md:col-span-3 text-sm text-muted text-right font-mono">
          <span class="text-xs text-brand opacity-0 group-hover:opacity-100 transition-opacity">
            <i class="fa-solid fa-arrow-left mr-1"></i> Back
          </span>
        </div>
      `;
      bindRowAction(parentRow, "Go to parent directory", () => navigateTo(parentPath));
      listContainer.appendChild(parentRow);
    }

    // Check if directory is empty
    if (folders.length === 0 && files.length === 0) {
      if (emptyState) {
        emptyState.style.display = "block";
        document.getElementById("empty-state-title").textContent = "Empty Directory";
        document.getElementById("empty-state-desc").textContent = "No subtitle files or folders found here. Be the first to contribute!";
      }
      if (statsEl) statsEl.textContent = "Total: 0 folders, 0 files.";
      return;
    } else {
      if (emptyState) emptyState.style.display = "none";
    }

    // Render Folders
    folders.forEach(folder => {
      const row = document.createElement("div");
      row.className = "grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group cursor-pointer select-none";
      row.setAttribute("title", `Open folder: ${folder.name}`);
      row.innerHTML = `
        <div class="col-span-6 md:col-span-7 flex items-center gap-3 min-w-0">
          <i class="fa-solid fa-folder text-brand text-lg w-5 text-center flex-shrink-0"></i>
          <span class="font-medium group-hover:text-brand transition-colors truncate font-mono">${escapeHtml(folder.name)}</span>
        </div>
        <div class="col-span-3 md:col-span-2 text-sm text-muted font-mono">${folder.itemCount > 0 ? `${folder.itemCount} items` : "-"}</div>
        <div class="col-span-3 md:col-span-3 text-sm text-muted text-right font-mono flex items-center justify-end gap-2">
          <span class="text-xs text-brand opacity-0 group-hover:opacity-100 transition-opacity">
            Open <i class="fa-solid fa-chevron-right ml-1"></i>
          </span>
        </div>
      `;
      bindRowAction(row, `Open folder ${folder.name}`, () => navigateTo(folder.path));
      listContainer.appendChild(row);
    });

    // Render Files (.srt & .zip)
    files.forEach(file => {
      const isZip = file.extension === ".zip";

      const iconClass = isZip ? "fa-solid fa-file-zipper icon-zip" : "fa-regular fa-file-lines icon-srt";
      const badge = isZip
        ? `<span class="badge-zip group-hover:bg-brand group-hover:text-black font-semibold text-[11px] px-2 py-0.5 rounded transition-colors inline-flex items-center gap-1 font-mono"><i class="fa-solid fa-file-zipper"></i> ZIP</span>`
        : `<span class="badge-srt group-hover:bg-brand group-hover:text-black font-semibold text-[11px] px-2 py-0.5 rounded transition-colors inline-flex items-center gap-1 font-mono"><i class="fa-solid fa-download"></i> SRT</span>`;

      const row = document.createElement("div");
      row.className = "grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group cursor-pointer select-none";
      row.setAttribute("title", `Click to download ${file.name}`);
      row.innerHTML = `
        <div class="col-span-6 md:col-span-7 flex items-center gap-3 min-w-0">
          <i class="${iconClass} text-lg w-5 text-center flex-shrink-0"></i>
          <span class="font-medium group-hover:text-brand transition-colors truncate">${escapeHtml(file.name)}</span>
        </div>
        <div class="col-span-3 md:col-span-2 text-sm text-muted font-mono truncate">${formatBytes(file.size)}</div>
        <div class="col-span-3 md:col-span-3 text-sm text-muted text-right font-mono flex items-center justify-end gap-3">
          ${badge}
        </div>
      `;
      bindRowAction(row, `Download ${file.name}`, () => {
        triggerDownload(file.downloadUrl, file.name);
      });
      listContainer.appendChild(row);
    });

    // Update Footer Stats
    if (statsEl) {
      statsEl.textContent = `Total: ${folders.length} folder${folders.length === 1 ? '' : 's'}, ${files.length} file${files.length === 1 ? '' : 's'}.`;
    }
  }

  function renderSearchResults(listContainer, emptyState, statsEl) {
    const query = activeSearchQuery.trim();
    const scopePath = searchScopeAll ? "" : currentPath;
    const matches = window.GitHubService.searchFiles(query, scopePath);

    listContainer.innerHTML = "";

    if (matches.length === 0) {
      if (emptyState) {
        emptyState.style.display = "block";
        document.getElementById("empty-state-title").textContent = `No matches found`;
        document.getElementById("empty-state-desc").textContent = searchScopeAll
          ? `No subtitle files match "${query}" across the repository.`
          : `No files match in this folder. Toggle "All" scope or clear your filter.`;
      }
      if (statsEl) statsEl.textContent = `Search: 0 matches for "${query}".`;
      return;
    }

    if (emptyState) emptyState.style.display = "none";

    let totalSizeBytes = 0;
    matches.forEach(file => {
      const isZip = file.extension === ".zip";
      totalSizeBytes += file.size || 0;

      const iconClass = isZip ? "fa-solid fa-file-zipper icon-zip" : "fa-regular fa-file-lines icon-srt";
      const badge = isZip
        ? `<span class="badge-zip group-hover:bg-brand group-hover:text-black font-semibold text-[11px] px-2 py-0.5 rounded transition-colors inline-flex items-center gap-1 font-mono"><i class="fa-solid fa-file-zipper"></i> ZIP</span>`
        : `<span class="badge-srt group-hover:bg-brand group-hover:text-black font-semibold text-[11px] px-2 py-0.5 rounded transition-colors inline-flex items-center gap-1 font-mono"><i class="fa-solid fa-download"></i> SRT</span>`;

      const row = document.createElement("div");
      row.className = "grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group cursor-pointer select-none";
      row.setAttribute("title", `Click to download ${file.name}`);
      row.innerHTML = `
        <div class="col-span-6 md:col-span-7 flex items-center gap-3 min-w-0">
          <i class="${iconClass} text-lg w-5 text-center flex-shrink-0"></i>
          <div class="min-w-0">
            <div class="font-medium group-hover:text-brand transition-colors truncate">${highlightText(file.name, query)}</div>
            <div class="text-xs text-muted truncate font-mono">${highlightText(file.path, query)}</div>
          </div>
        </div>
        <div class="col-span-3 md:col-span-2 text-sm text-muted font-mono truncate">${formatBytes(file.size)}</div>
        <div class="col-span-3 md:col-span-3 text-sm text-muted text-right font-mono flex items-center justify-end gap-3">
          ${badge}
        </div>
      `;
      bindRowAction(row, `Download ${file.name}`, () => {
        triggerDownload(file.downloadUrl, file.name);
      });
      listContainer.appendChild(row);
    });

    if (statsEl) {
      statsEl.textContent = `Total: ${matches.length} matching file${matches.length === 1 ? '' : 's'} (${formatBytes(totalSizeBytes)}).`;
    }
  }

  function updateAlertBanner() {
    const alertBox = document.getElementById("terminal-alert-banner");
    if (!alertBox) return;

    if (window.GitHubService.statusMessage && window.GitHubService.statusType === "warning") {
      alertBox.innerHTML = `
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>${escapeHtml(window.GitHubService.statusMessage)}</span>
        </div>
        <button id="alert-close-btn" class="theme-alert-close text-base leading-none">&times;</button>
      `;
      alertBox.style.display = "flex";
      const closeBtn = document.getElementById("alert-close-btn");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          alertBox.style.display = "none";
        });
      }
    } else {
      alertBox.style.display = "none";
    }
  }

  async function refresh(forceFetch = false) {
    const loadingState = document.getElementById("terminal-loading-state");
    const listContainer = document.getElementById("file-list");
    const refreshBtnIcon = document.getElementById("btn-refresh-icon");

    if (loadingState) loadingState.style.display = "block";
    if (listContainer) listContainer.innerHTML = "";
    if (refreshBtnIcon) refreshBtnIcon.classList.add("fa-spin");

    try {
      await window.GitHubService.fetchTree(forceFetch);
    } catch (e) {
      console.error(e);
    } finally {
      if (refreshBtnIcon) refreshBtnIcon.classList.remove("fa-spin");
    }

    currentPath = getPathFromHash();
    renderBreadcrumbs(currentPath);
    renderFileListing();
    updateAlertBanner();
  }

  function initEvents() {
    window.addEventListener("hashchange", () => {
      currentPath = getPathFromHash();
      renderBreadcrumbs(currentPath);
      renderFileListing();
    });

    const refreshBtn = document.getElementById("btn-refresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        window.GitHubService.clearCache();
        refresh(true);
      });
    }

    const searchInput = document.getElementById("search-input");
    const searchClear = document.getElementById("search-clear");
    const searchScopeBtn = document.getElementById("btn-search-scope");

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        activeSearchQuery = e.target.value;
        if (searchClear) {
          searchClear.style.display = activeSearchQuery ? "block" : "none";
        }
        renderFileListing();
      });

      if (searchClear) {
        searchClear.addEventListener("click", () => {
          searchInput.value = "";
          activeSearchQuery = "";
          searchClear.style.display = "none";
          searchInput.focus();
          renderFileListing();
        });
      }
    }

    if (searchScopeBtn) {
      searchScopeBtn.addEventListener("click", () => {
        searchScopeAll = !searchScopeAll;
        searchScopeBtn.setAttribute("aria-pressed", String(searchScopeAll));
        searchScopeBtn.innerHTML = searchScopeAll
          ? `<i class="fa-solid fa-globe"></i> <span>All</span>`
          : `<i class="fa-solid fa-folder"></i> <span>Here</span>`;
        if (activeSearchQuery.trim()) {
          renderFileListing();
        }
      });
    }

    const mobileBtn = document.getElementById("mobile-menu-btn");
    const mobileMenu = document.getElementById("mobile-menu");
    if (mobileBtn && mobileMenu) {
      mobileBtn.addEventListener("click", () => {
        const isOpen = mobileBtn.getAttribute("aria-expanded") === "true";
        mobileBtn.setAttribute("aria-expanded", String(!isOpen));
        mobileMenu.classList.toggle("hidden", isOpen);
        mobileMenu.classList.toggle("flex", !isOpen);
      });
      mobileMenu.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
        mobileBtn.setAttribute("aria-expanded", "false");
        mobileMenu.classList.add("hidden");
        mobileMenu.classList.remove("flex");
      }));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initEvents();
    refresh(false);
  });

  window.Renderer = {
    navigateTo,
    clearSearch: () => {
      activeSearchQuery = "";
      const searchInput = document.getElementById("search-input");
      if (searchInput) searchInput.value = "";
      const searchClear = document.getElementById("search-clear");
      if (searchClear) searchClear.style.display = "none";
      renderFileListing();
    }
  };
})();
