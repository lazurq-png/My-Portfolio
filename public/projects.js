// Opens the per-project <dialog> rendered by ProjectPreview.astro. Lives in
// public/ for the same reason as nav.js and theme-init.js: it stays a real
// same-origin file, so it satisfies the `script-src 'self'` CSP without an
// inline hash.
//
// Deliberately small. showModal() already gives us the focus trap, the Escape
// handler, the backdrop, inertness of the page behind the dialog and returning
// focus to the element that opened it, and the dialog's closedby="any" closes it
// on a backdrop click -- none of that is reimplemented here.
(function () {
  const openers = document.querySelectorAll(".card-open[data-preview]");
  if (!openers.length) return;

  // Nothing can open a dialog without this script, so the buttons ship disabled
  // and a visitor with JS off gets an inert card whose only control is the
  // GitHub link. Enabling them here is the first thing we do, and only for a
  // button whose dialog actually exists.
  //
  // Enabling is also what gives the card its stretched hit area and its hover
  // lift -- both CSS rules are scoped to :not(:disabled).
  openers.forEach((button) => {
    const dialog = document.getElementById(`preview-${button.dataset.preview}`);
    if (!dialog) return;

    button.disabled = false;

    button.addEventListener("click", () => {
      dialog.showModal();
    });
  });
})();
