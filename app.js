const state = {
  view: "daily",
  query: "",
  topic: "All",
  data: { daily: [], weekly: [] },
};

const els = {
  briefings: document.querySelector("#briefings"),
  search: document.querySelector("#searchInput"),
  filters: document.querySelector("#filters"),
  status: document.querySelector("#status"),
  tabs: [...document.querySelectorAll(".tab")],
};

async function loadData() {
  try {
    const [daily, weekly] = await Promise.all([
      fetch("data/daily.json").then((r) => {
        if (!r.ok) throw new Error("Could not load daily briefing data");
        return r.json();
      }),
      fetch("data/weekly.json").then((r) => {
        if (!r.ok) throw new Error("Could not load weekly shortlist data");
        return r.json();
      }),
    ]);
    state.data.daily = daily.briefings || [];
    state.data.weekly = weekly.briefings || [];
    render();
  } catch (err) {
    els.status.hidden = false;
    els.status.textContent = err.message;
  }
}

function formatDate(dateString) {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

function currentItems() {
  return [...state.data[state.view]].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

function storySearchText(story) {
  return [
    story.title,
    story.takeaway,
    story.what_happened,
    story.why_it_matters,
    story.caveat,
    ...(story.tags || []),
    story.method || "",
    story.read_first || "",
  ]
    .join(" ")
    .toLowerCase();
}

function visibleGroups() {
  const q = state.query.trim().toLowerCase();
  return currentItems()
    .map((group) => ({
      ...group,
      stories: (group.stories || []).filter((story) => {
        const topicOK =
          state.topic === "All" || (story.tags || []).includes(state.topic);
        const queryOK = !q || storySearchText(story).includes(q);
        return topicOK && queryOK;
      }),
    }))
    .filter((group) => group.stories.length);
}

function availableTags() {
  const tags = new Set();
  currentItems().forEach((g) =>
    (g.stories || []).forEach((s) =>
      (s.tags || []).forEach((t) => tags.add(t)),
    ),
  );
  return ["All", ...[...tags].sort()];
}

function renderFilters() {
  els.filters.innerHTML = "";
  availableTags().forEach((tag) => {
    const btn = document.createElement("button");
    btn.className = "filter" + (state.topic === tag ? " active" : "");
    btn.textContent = tag;
    btn.addEventListener("click", () => {
      state.topic = tag;
      render();
    });
    els.filters.appendChild(btn);
  });
}

function storyCard(story, index) {
  const details = document.createElement("details");
  details.className = "story";

  const summary = document.createElement("summary");
  summary.innerHTML = `
    <div>
      <div class="story-title">${index + 1}. ${escapeHTML(story.title)}${story.priority ? `<span class="priority">${escapeHTML(story.priority)}</span>` : ""}</div>
      <p class="takeaway">${escapeHTML(story.takeaway || "")}</p>
      <div class="badges">${(story.tags || []).map((t) => `<span class="badge">${escapeHTML(t)}</span>`).join("")}</div>
    </div>
    <span class="chevron" aria-hidden="true">⌄</span>`;

  const body = document.createElement("div");
  body.className = "story-body";
  const methodBlock = story.method
    ? `<h3>Method / model</h3><p>${escapeHTML(story.method)}</p>`
    : "";
  const readFirstBlock = story.read_first
    ? `<h3>Read first</h3><p>${escapeHTML(story.read_first)}</p>`
    : "";
  const sources = (story.sources || [])
    .map(
      (s) =>
        `<li><a href="${escapeAttribute(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.label || s.url)}</a></li>`,
    )
    .join("");

  body.innerHTML = `
    <h3>What happened</h3><p>${escapeHTML(story.what_happened || "")}</p>
    ${methodBlock}
    <h3>Why it matters</h3><p>${escapeHTML(story.why_it_matters || "")}</p>
    ${readFirstBlock}
    <h3>Skeptical caveat</h3><p class="caveat">${escapeHTML(story.caveat || "")}</p>
    ${sources ? `<h3>Sources</h3><ul class="sources">${sources}</ul>` : ""}`;

  details.append(summary, body);
  return details;
}

function render() {
  renderFilters();
  els.briefings.innerHTML = "";
  const groups = visibleGroups();
  if (!groups.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No briefing items match these filters.";
    els.briefings.appendChild(empty);
    return;
  }
  groups.forEach((group) => {
    const section = document.createElement("section");
    section.className = "date-group";
    const heading = document.createElement("div");
    heading.className = "date-heading";
    heading.innerHTML = `<h2>${formatDate(group.date)}</h2><span class="count">${group.stories.length} item${group.stories.length === 1 ? "" : "s"}</span>`;
    section.appendChild(heading);
    group.stories.forEach((story, i) =>
      section.appendChild(storyCard(story, i)),
    );
    els.briefings.appendChild(section);
  });
}

function escapeHTML(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c],
  );
}
function escapeAttribute(value = "") {
  return escapeHTML(value);
}

els.tabs.forEach((tab) =>
  tab.addEventListener("click", () => {
    state.view = tab.dataset.view;
    state.topic = "All";
    els.tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", String(active));
    });
    render();
  }),
);

els.search.addEventListener("input", (e) => {
  state.query = e.target.value;
  render();
});
loadData();
