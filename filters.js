/*
 * Shared filter-badge controller — used by every ".filters"/".filter" badge
 * row on both pages: the topic filter on briefings.html (all four tabs) and
 * the Publications / Awards / Disclosures / Presentations / Outreach filters
 * on index.html. One implementation so the click behavior can't drift
 * between the two pages.
 *
 * Click cycle per badge: off -> teal -> amber -> red -> off.
 *   teal  = OR   (item shown if it has ANY teal-active tag)
 *   amber = AND  (item shown only if it has ALL amber-active tags)
 *   red   = NOT  (item hidden if it has ANY red-active tag)
 * The three gates combine with AND between them: an item must clear the
 * OR group, the AND group, and the NOT group all at once. With exactly one
 * teal tag active, "has any of {tag}" and "has all of {tag}" are the same
 * test, so a lone teal badge already behaves like an AND requirement until
 * a second badge is activated — no special-casing needed for that rule.
 *
 * "All" clears every active badge. It renders active (amber, since "no
 * filters" = "AND of nothing" = everything passes) whenever nothing else is
 * selected, and clicking it always resets regardless of its own state.
 *
 * Known limitation: for a field that can only ever hold one value per item
 * (e.g. an award's single "type" badge, a job's single location), turning
 * two different tags in that same field to amber (AND) makes the result
 * empty — an item can't simultaneously equal two different single values.
 * That's the logically correct outcome for a literal AND, not a bug, but
 * it can surprise a user who expects AND to behave like OR there. See the
 * call sites in index.html for where this applies.
 */
(function (global) {
  var CYCLE = ["teal", "amber", "red"];

  function createFilterController(bar, onChange) {
    var state = new Map(); // tag -> "teal" | "amber" | "red"

    function cycle(tag) {
      var current = state.get(tag);
      var next = CYCLE[current ? CYCLE.indexOf(current) + 1 : 0];
      if (next) {
        state.set(tag, next);
      } else {
        state.delete(tag);
      }
    }

    function reset() {
      state.clear();
    }

    function hint(s) {
      if (s === "teal") return "Included (OR) — click for AND";
      if (s === "amber") return "Required (AND) — click for NOT";
      if (s === "red") return "Excluded (NOT) — click to clear";
      return "Click to include (OR)";
    }

    function render(tags) {
      bar.innerHTML = "";
      var allActive = state.size === 0;
      var allBtn = document.createElement("button");
      allBtn.type = "button";
      allBtn.className =
        "filter filter-all" + (allActive ? " active state-amber" : "");
      allBtn.setAttribute("aria-pressed", String(allActive));
      allBtn.title = "Clear all filters";
      allBtn.textContent = "All";
      allBtn.addEventListener("click", function () {
        reset();
        onChange();
      });
      bar.appendChild(allBtn);

      (tags || []).forEach(function (tag) {
        var s = state.get(tag) || null;
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "filter" + (s ? " active state-" + s : "");
        btn.setAttribute("aria-pressed", String(!!s));
        btn.title = hint(s);
        btn.textContent = tag;
        btn.addEventListener("click", function () {
          cycle(tag);
          onChange();
        });
        bar.appendChild(btn);
      });
    }

    function getMatcher() {
      var teal = [];
      var amber = [];
      var red = [];
      state.forEach(function (s, tag) {
        if (s === "teal") teal.push(tag);
        else if (s === "amber") amber.push(tag);
        else red.push(tag);
      });
      return function (itemTags) {
        itemTags = itemTags || [];
        var orOK =
          teal.length === 0 ||
          teal.some(function (t) {
            return itemTags.indexOf(t) !== -1;
          });
        var andOK =
          amber.length === 0 ||
          amber.every(function (t) {
            return itemTags.indexOf(t) !== -1;
          });
        var notOK =
          red.length === 0 ||
          !red.some(function (t) {
            return itemTags.indexOf(t) !== -1;
          });
        return orOK && andOK && notOK;
      };
    }

    return {
      render: render,
      reset: reset,
      getMatcher: getMatcher,
      hasActive: function () {
        return state.size > 0;
      },
    };
  }

  global.createFilterController = createFilterController;
})(window);
