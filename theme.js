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
