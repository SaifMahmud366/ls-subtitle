/**
 * ============================================================================
 * ls-subtitle: Theme Switcher & Persistence
 * ============================================================================
 * Manages instant, zero-reload theme switching using dynamic CSS files.
 */

(function() {
  const STORAGE_KEY = "ls_subtitle_theme";

  // Get active theme ID
  function getSavedTheme() {
    const themes = (window.CONFIG && window.CONFIG.availableThemes) || [];
    if (!themes.length) return "dark-neon";

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && themes.some(t => t.id === saved)) {
        return saved;
      }
    } catch (e) {
      console.warn("[Theme] Could not read localStorage:", e);
    }
    return (window.CONFIG && window.CONFIG.defaultTheme) || "dark-neon";
  }

  // Apply theme instantly by swapping the stylesheet link href
  function applyTheme(themeId) {
    const themes = (window.CONFIG && window.CONFIG.availableThemes) || [];
    if (!themes.length) { console.warn("[Theme] No themes configured"); return; }
    const themeObj = themes.find(t => t.id === themeId) || themes[0];
    if (!themeObj) return;

    let linkElem = document.getElementById("ls-theme-stylesheet");
    if (!linkElem) {
      linkElem = document.createElement("link");
      linkElem.id = "ls-theme-stylesheet";
      linkElem.rel = "stylesheet";
      document.head.appendChild(linkElem);
    }

    // Determine path prefix based on how deep the current page is
    let prefix = "";
    const depth = window.location.pathname.split("/").filter(Boolean).length;
    // If current page is inside web/pages/, we need "../../" to reach repo root
    if (window.location.pathname.includes("/web/pages/")) prefix = "../../";
    else if (window.location.pathname.includes("/web/")) prefix = "../";

    // Set stylesheet path
    linkElem.href = prefix + themeObj.file;
    document.documentElement.setAttribute("data-theme", themeObj.id);

    try {
      localStorage.setItem(STORAGE_KEY, themeObj.id);
    } catch (e) {
      // Ignore quota errors
    }

    // Synchronize any theme-select dropdown elements on the page
    document.querySelectorAll(".theme-select").forEach(select => {
      if (select.value !== themeObj.id) {
        select.value = themeObj.id;
      }
    });

    // Notify listeners
    window.dispatchEvent(new CustomEvent("themeChanged", { detail: themeObj }));
  }

  // Populate theme selector dropdowns
  function initThemeSelectors() {
    const selects = document.querySelectorAll(".theme-select");
    const activeThemeId = getSavedTheme();
    const themes = (window.CONFIG && window.CONFIG.availableThemes) || [];

    selects.forEach(select => {
      // Populate options if not already populated
      if (select.options.length === 0) {
        themes.forEach(theme => {
          const opt = document.createElement("option");
          opt.value = theme.id;
          opt.textContent = theme.name;
          select.appendChild(opt);
        });
      }

      select.value = activeThemeId;

      select.addEventListener("change", function(e) {
        applyTheme(e.target.value);
      });
    });
  }

  // Immediately apply theme before full DOMContentLoaded to prevent flash of unstyled content
  const currentTheme = getSavedTheme();
  applyTheme(currentTheme);

  // Initialize dropdowns once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initThemeSelectors);
  } else {
    initThemeSelectors();
  }

})();
