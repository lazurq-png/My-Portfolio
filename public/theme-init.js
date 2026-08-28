// Loaded as a blocking classic script from <head> so the stored theme is applied
// before the body is parsed — this is what prevents a flash of the wrong theme.
// Lives in public/ (shipped verbatim, never inlined by Astro) so it stays a real
// same-origin file and satisfies a `script-src 'self'` CSP.
(function () {
  const KEY = "theme";
  const root = document.documentElement;

  // localStorage access throws outright in some privacy modes.
  const read = () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  };

  const persist = (value) => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* preference just won't survive the session */
    }
  };

  if (read() === "light") {
    root.setAttribute("data-theme", "light");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    const syncPressed = () =>
      toggle.setAttribute(
        "aria-pressed",
        String(root.getAttribute("data-theme") === "light"),
      );

    syncPressed();

    toggle.addEventListener("click", () => {
      const nowLight = root.getAttribute("data-theme") !== "light";
      if (nowLight) {
        root.setAttribute("data-theme", "light");
      } else {
        root.removeAttribute("data-theme");
      }
      persist(nowLight ? "light" : "dark");
      syncPressed();
    });
  });
})();
