// Drives the mobile hamburger in SiteNav.astro. Lives in public/ for the same
// reason as theme-init.js: it stays a real same-origin file, so it satisfies
// the `script-src 'self'` CSP without needing an inline hash.
//
// Above 48rem the toggle is display:none and the panel is always open, so the
// only thing that matters up there is that aria-expanded is not left stale.
(function () {
  const header = document.getElementById("site-header");
  const toggle = document.getElementById("nav-toggle");
  if (!header || !toggle) return;

  // Same breakpoint as the media queries in Layout.astro and SiteNav.astro;
  // all three have to move together. See the note by the tokens in
  // Layout.astro for why it is in rem and why it cannot be a shared token.
  const desktop = window.matchMedia("(min-width: 48rem)");

  const setOpen = (open) => {
    header.dataset.open = String(open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  setOpen(false);

  toggle.addEventListener("click", () => {
    setOpen(header.dataset.open !== "true");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && header.dataset.open === "true") {
      setOpen(false);
      // Focus would otherwise be left on a link that just disappeared.
      toggle.focus();
    }
  });

  // Tapping the page behind an open panel should dismiss it. The toggle's own
  // click bubbles here too, but it is inside the header so it never matches.
  document.addEventListener("click", (event) => {
    if (header.dataset.open === "true" && !header.contains(event.target)) {
      setOpen(false);
    }
  });

  // Rotating to landscape can cross the breakpoint while the panel is open,
  // which would leave aria-expanded="true" on a hidden control.
  desktop.addEventListener("change", (event) => {
    if (event.matches) setOpen(false);
  });
})();
