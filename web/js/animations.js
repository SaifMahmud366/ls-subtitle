/**
 * ============================================================================
 * ls-subtitle: CLI Keyboard Shortcuts & Interactions
 * ============================================================================
 * Fast keyboard shortcuts ('/', 'Esc', 'Backspace') and code copy utility.
 */

(function() {
  function initKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT");

      // Press '/' to focus search input
      if (e.key === "/" && !isInputFocused) {
        e.preventDefault();
        const searchInput = document.getElementById("search-input");
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // Press 'Escape' to clear / blur search
      if (e.key === "Escape") {
        const searchInput = document.getElementById("search-input");
        if (searchInput && isInputFocused) {
          if (window.Renderer && window.Renderer.clearSearch) {
            window.Renderer.clearSearch();
          } else {
            searchInput.value = "";
          }
          searchInput.blur();
        }
        return;
      }

      // Press 'Backspace' to navigate to parent directory (cd ..)
      if (e.key === "Backspace" && !isInputFocused) {
        const currentHash = window.location.hash.replace(/^#\/?/, "");
        const segments = currentHash.split("/").filter(Boolean);
        if (segments.length > 1) {
          e.preventDefault();
          const parent = segments.slice(0, -1).join("/");
          if (window.Renderer) {
            window.Renderer.navigateTo(parent);
          }
        }
      }
    });
  }

  function initCodeCopy() {
    document.querySelectorAll(".code-copy-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const codeBlock = btn.closest(".code-block-wrapper");
        if (!codeBlock) return;
        const pre = codeBlock.querySelector("pre");
        if (!pre) return;

        try {
          await navigator.clipboard.writeText(pre.textContent.trim());
          const origText = btn.innerHTML;
          btn.innerHTML = `<i class="fa-solid fa-check text-brand"></i> Copied!`;
          setTimeout(() => {
            btn.innerHTML = origText;
          }, 2000);
        } catch (err) {
          console.warn("Clipboard copy failed", err);
        }
      });
    });
  }

  function initCurrentYear() {
    document.querySelectorAll("[data-current-year]").forEach(el => {
      el.textContent = new Date().getFullYear();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initKeyboardShortcuts();
    initCodeCopy();
    initCurrentYear();
  });
})();
