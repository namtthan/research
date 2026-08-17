// Light/dark toggle logic, shared by index.html and briefings.html.
// The flash-prevention snippet that applies the saved theme before first
// paint lives inline in each page's <head> (has to run before this file
// could even load) — this file only wires up the button.
(function () {
  var btn = document.getElementById("themeToggle");
  if (!btn) return;
  function isLight() {
    return document.documentElement.classList.contains("light");
  }
  function update() {
    btn.textContent = isLight() ? "Dark mode" : "Light mode";
    btn.setAttribute(
      "aria-label",
      isLight() ? "Switch to dark mode" : "Switch to light mode",
    );
  }
  update();
  btn.addEventListener("click", function () {
    document.documentElement.classList.toggle("light");
    try {
      localStorage.setItem("theme", isLight() ? "light" : "dark");
    } catch (e) {}
    update();
  });
})();
// Mobile hamburger menu — shared by index.html and briefings.html, each of
// which supplies its own #mobileMenu content (flat section list on index,
// "Back to Home" + submenu + Research Brief on briefings). This only wires
// up open/close behavior; markup differs per page.
(function () {
  var toggle = document.getElementById("navHamburger");
  var menu = document.getElementById("mobileMenu");
  if (!toggle || !menu) return;
  function setOpen(open) {
    menu.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.textContent = open ? "✕" : "☰";
  }
  toggle.addEventListener("click", function () {
    setOpen(!menu.classList.contains("open"));
  });
  menu.addEventListener("click", function (e) {
    if (e.target.tagName === "A") setOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
  document.addEventListener("click", function (e) {
    if (!menu.classList.contains("open")) return;
    if (menu.contains(e.target) || toggle.contains(e.target)) return;
    setOpen(false);
  });
  // If the window is resized past the mobile breakpoint while the menu is
  // open, close it — otherwise a stale .open class would leave the panel
  // rendered (if CSS specificity ever changed) even though the hamburger
  // that opens it is hidden on desktop.
  var desktopQuery = window.matchMedia("(min-width: 851px)");
  function handleBreakpointChange(e) {
    if (e.matches) setOpen(false);
  }
  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener("change", handleBreakpointChange);
  } else if (desktopQuery.addListener) {
    desktopQuery.addListener(handleBreakpointChange);
  }
})();
