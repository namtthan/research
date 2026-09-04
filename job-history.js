// Preserve historical job-search briefings even if the latest JSON refresh
// accidentally replaces the current feed with a single dated snapshot.
// Historical snapshots below point to immutable Git commits.
(function () {
  const nativeFetch = window.fetch.bind(window);

  const historySources = {
    "data/jobs.json": [
      "https://raw.githubusercontent.com/namtthan/research/461fa7ea82d8f524194bc9aba5057bbc4c8990f8/data/jobs.json",
      "https://raw.githubusercontent.com/namtthan/research/28787f97ca942d752e711b540f2e9a6cf2aa40a2/data/jobs.json",
      "https://raw.githubusercontent.com/namtthan/research/5eca4072c4a9ffa6eec16be9ad74ef5f64739a35/data/jobs.json",
    ],
    "data/academia_jobs.json": [
      "https://raw.githubusercontent.com/namtthan/research/89c381ce94eb161fc79e47a41f72e7401370ca35/data/academia_jobs.json",
      "https://raw.githubusercontent.com/namtthan/research/a885ba131e194ea17e026c58d1971de8b961842b/data/academia_jobs.json",
    ],
  };

  function requestPath(input) {
    if (typeof input === "string") return input;
    if (input && typeof input.url === "string") return input.url;
    return "";
  }

  async function readJSON(response) {
    if (!response.ok) throw new Error(`Could not load ${response.url || "job history"}`);
    return response.json();
  }

  function mergeBriefings(current, historicalSets) {
    const byDate = new Map();

    historicalSets.forEach((data) => {
      (data.briefings || []).forEach((briefing) => {
        if (briefing && briefing.date) byDate.set(briefing.date, briefing);
      });
    });

    (current.briefings || []).forEach((briefing) => {
      if (briefing && briefing.date) byDate.set(briefing.date, briefing);
    });

    return {
      ...current,
      briefings: [...byDate.values()].sort((a, b) =>
        String(b.date).localeCompare(String(a.date)),
      ),
    };
  }

  window.fetch = async function (input, init) {
    const path = requestPath(input);
    const history = historySources[path];

    if (!history) return nativeFetch(input, init);

    const currentResponse = await nativeFetch(input, init);
    const current = await readJSON(currentResponse.clone());

    const historicalSets = await Promise.all(
      history.map(async (url) => {
        try {
          return await readJSON(await nativeFetch(url));
        } catch (error) {
          console.warn("Historical job briefing could not be loaded:", url, error);
          return { briefings: [] };
        }
      }),
    );

    const merged = mergeBriefings(current, historicalSets);
    return new Response(JSON.stringify(merged), {
      status: currentResponse.status,
      statusText: currentResponse.statusText,
      headers: { "Content-Type": "application/json" },
    });
  };
})();
