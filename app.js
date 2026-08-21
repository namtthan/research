const state = {
  view: "daily",
  query: "",
  data: { daily: [], weekly: [], jobs: [], academia: [] },
};

const els = {
  briefings: document.querySelector("#briefings"),
  search: document.querySelector("#searchInput"),
  filters: document.querySelector("#filters"),
  status: document.querySelector("#status"),
  tabs: [...document.querySelectorAll(".tab")],
};

// Multi-select, 3-state (teal=OR, amber=AND, red=NOT) topic filter — shared
// controller from filters.js, same one index.html's badge rows use. Created
// lazily on first render() so it isn't tied to load order in this file.
let filterCtl = null;

function isJobView() {
  return state.view === "jobs" || state.view === "academia";
}

async function loadData() {
  try {
    const [daily, weekly, jobs, academia] = await Promise.all([
      fetch("data/daily.json").then((r) => {
        if (!r.ok) throw new Error("Could not load daily briefing data");
        return r.json();
      }),
      fetch("data/weekly.json").then((r) => {
        if (!r.ok) throw new Error("Could not load weekly shortlist data");
        return r.json();
      }),
      fetch("data/jobs.json").then((r) => {
        if (!r.ok) throw new Error("Could not load industry jobs data");
        return r.json();
      }),
      fetch("data/academia_jobs.json").then((r) => {
        if (!r.ok) throw new Error("Could not load academia jobs data");
        return r.json();
      }),
    ]);
    state.data.daily = daily.briefings || [];
    state.data.weekly = weekly.briefings || [];
    state.data.jobs = jobs.briefings || [];
    state.data.academia = academia.briefings || [];
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

function jobSearchText(job) {
  return [
    job.title,
    job.company,
    job.company_info,
    job.location,
    job.work_arrangement,
    job.term,
    job.job_description,
    job.why_good_match,
    job.immediate_action_now,
    ...(job.key_must_have_requirements || []),
    ...(job.preferred_requirements || []),
    ...(job.specific_experience_to_highlight || []),
    ...(job.gaps_or_risks || []),
    ...(job.resume_tailoring || []),
  ]
    .join(" ")
    .toLowerCase();
}

function jobTags(job) {
  const tags = [];
  if (job.recommendation) tags.push(formatRecommendation(job.recommendation));
  if (job.location) tags.push(job.location);
  if (job.work_arrangement) tags.push(job.work_arrangement);
  return tags;
}

function visibleGroups() {
  const q = state.query.trim().toLowerCase();
  const matches = filterCtl ? filterCtl.getMatcher() : () => true;
  if (isJobView()) {
    return currentItems()
      .map((group) => ({
        ...group,
        jobs: (group.jobs || []).filter((job) => {
          const topicOK = matches(jobTags(job));
          const queryOK = !q || jobSearchText(job).includes(q);
          return topicOK && queryOK;
        }),
      }))
      .filter((group) => group.jobs.length);
  }
  return currentItems()
    .map((group) => ({
      ...group,
      stories: (group.stories || []).filter((story) => {
        const topicOK = matches(story.tags || []);
        const queryOK = !q || storySearchText(story).includes(q);
        return topicOK && queryOK;
      }),
    }))
    .filter((group) => group.stories.length);
}

function availableTags() {
  const tags = new Set();
  if (isJobView()) {
    currentItems().forEach((g) =>
      (g.jobs || []).forEach((job) => jobTags(job).forEach((t) => tags.add(t))),
    );
  } else {
    currentItems().forEach((g) =>
      (g.stories || []).forEach((s) =>
        (s.tags || []).forEach((t) => tags.add(t)),
      ),
    );
  }
  return [...tags].sort();
}

function renderFilters() {
  if (!filterCtl) filterCtl = createFilterController(els.filters, render);
  filterCtl.render(availableTags());
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

function formatRecommendation(value = "") {
  return String(value)
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isStretchRecommendation(value = "") {
  return String(value).toLowerCase().includes("stretch");
}

function formatSalary(salary) {
  if (!salary) return "Not disclosed";
  const { min_usd, max_usd, period, note } = salary;
  let main = "Not disclosed";
  const money = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  if (min_usd != null && max_usd != null) {
    main = `${money(min_usd)}–${money(max_usd)} / ${period || "year"}`;
  } else if (min_usd != null) {
    main = `${money(min_usd)}+ / ${period || "year"}`;
  } else if (max_usd != null) {
    main = `Up to ${money(max_usd)} / ${period || "year"}`;
  }
  return note ? `${main}. ${note}` : main;
}

function listBlock(title, items, className = "") {
  if (!items || !items.length) return "";
  return `<h3>${escapeHTML(title)}</h3><ul class="detail-list ${className}">${items
    .map((item) => `<li>${escapeHTML(item)}</li>`)
    .join("")}</ul>`;
}

function jobCard(job, index) {
  const details = document.createElement("details");
  details.className = "story job-card";
  const recommendation = formatRecommendation(job.recommendation || "");
  const stretchClass = isStretchRecommendation(job.recommendation) ? " is-stretch" : "";
  const fit =
    job.fit_score != null
      ? `<span class="priority fit-score">Fit ${escapeHTML(job.fit_score)}/10</span>`
      : "";

  const summary = document.createElement("summary");
  summary.innerHTML = `
    <div>
      <div class="story-title">${index + 1}. ${escapeHTML(job.title || "Untitled role")}${fit}</div>
      <p class="takeaway"><strong>${escapeHTML(job.company || "")}</strong>${job.location ? ` · ${escapeHTML(job.location)}` : ""}</p>
      <div class="badges">
        ${recommendation ? `<span class="badge job-recommendation${stretchClass}">${escapeHTML(recommendation)}</span>` : ""}
        ${job.work_arrangement ? `<span class="badge">${escapeHTML(job.work_arrangement)}</span>` : ""}
        ${job.term ? `<span class="badge">${escapeHTML(job.term)}</span>` : ""}
      </div>
    </div>
    <span class="chevron" aria-hidden="true">⌄</span>`;

  const body = document.createElement("div");
  body.className = "story-body";
  const links = (job.posting_links || [])
    .map(
      (link) =>
        `<li><a href="${escapeAttribute(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(link.label || link.url)}</a></li>`,
    )
    .join("");
  const statusLine = [
    job.posting_status ? escapeHTML(job.posting_status) : "",
    job.posting_status_checked
      ? `checked ${escapeHTML(formatDate(job.posting_status_checked))}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const organizationLabel = state.view === "academia" ? "Institution" : "Company";

  body.innerHTML = `
    <div class="job-meta-grid">
      <div><span>${organizationLabel}</span><strong>${escapeHTML(job.company || "—")}</strong></div>
      <div><span>Location</span><strong>${escapeHTML(job.location || "—")}</strong></div>
      <div><span>Work arrangement</span><strong>${escapeHTML(job.work_arrangement || "—")}</strong></div>
      <div><span>Term</span><strong>${escapeHTML(job.term || "—")}</strong></div>
      <div class="job-meta-wide"><span>Salary</span><strong>${escapeHTML(formatSalary(job.salary))}</strong></div>
      ${statusLine ? `<div class="job-meta-wide"><span>Posting status</span><strong>${statusLine}</strong></div>` : ""}
    </div>
    <h3>Role</h3><p>${escapeHTML(job.job_description || "")}</p>
    ${job.company_info ? `<h3>${organizationLabel}</h3><p>${escapeHTML(job.company_info)}</p>` : ""}
    ${listBlock("Must-have requirements", job.key_must_have_requirements)}
    ${listBlock("Preferred requirements", job.preferred_requirements)}
    <h3>Why it fits my experience</h3><p>${escapeHTML(job.why_good_match || "")}</p>
    ${listBlock("Experience to highlight", job.specific_experience_to_highlight)}
    ${listBlock("Gaps / risks", job.gaps_or_risks, "risk-list")}
    ${listBlock("Tailor my materials", job.resume_tailoring)}
    ${job.immediate_action_now ? `<h3>Immediate action now</h3><p class="action-now">${escapeHTML(job.immediate_action_now)}</p>` : ""}
    ${links ? `<h3>Links</h3><ul class="sources job-links">${links}</ul>` : ""}`;

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
    empty.textContent = isJobView()
      ? "No job opportunities match these filters."
      : "No briefing items match these filters.";
    els.briefings.appendChild(empty);
    return;
  }

  groups.forEach((group, index) => {
    // <details>/<summary> instead of <section>/<div>: clicking the date
    // natively collapses everything under it, no custom JS toggle needed
    // (same pattern already used for individual story/job cards below).
    // Groups are sorted newest-first (see currentItems()), so only the
    // first one starts open — older, presumably-already-read entries stay
    // collapsed instead of crowding the page.
    const section = document.createElement("details");
    section.className = "date-group";
    section.open = index === 0;
    const heading = document.createElement("summary");
    heading.className = "date-heading";
    // .date-heading is a 2-child flex row (space-between): title content on
    // the left, count+chevron grouped into one wrapper on the right — if
    // count and chevron were separate top-level children, space-between
    // would spread all three apart instead of keeping count/chevron together.
    const chevron = `<span class="chevron date-chevron" aria-hidden="true">⌄</span>`;
    if (isJobView()) {
      heading.innerHTML = `<div><h2>${formatDate(group.date)}</h2>${group.title ? `<p class="group-subtitle">${escapeHTML(group.title)}</p>` : ""}</div><span class="date-meta"><span class="count">${group.jobs.length} role${group.jobs.length === 1 ? "" : "s"}</span>${chevron}</span>`;
      section.appendChild(heading);
      if (group.overall_takeaway) {
        const takeaway = document.createElement("p");
        takeaway.className = "group-takeaway";
        takeaway.textContent = group.overall_takeaway;
        section.appendChild(takeaway);
      }
      group.jobs.forEach((job, i) => section.appendChild(jobCard(job, i)));
    } else {
      heading.innerHTML = `<h2>${formatDate(group.date)}</h2><span class="date-meta"><span class="count">${group.stories.length} item${group.stories.length === 1 ? "" : "s"}</span>${chevron}</span>`;
      section.appendChild(heading);
      group.stories.forEach((story, i) => section.appendChild(storyCard(story, i)));
    }
    els.briefings.appendChild(section);
  });
}

function escapeHTML(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c],
  );
}

function escapeAttribute(value = "") {
  return escapeHTML(value);
}

els.tabs.forEach((tab) =>
  tab.addEventListener("click", () => {
    state.view = tab.dataset.view;
    if (filterCtl) filterCtl.reset();
    els.search.placeholder = isJobView()
      ? "Search roles, institutions, companies, skills…"
      : "Search titles, topics, methods…";
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
