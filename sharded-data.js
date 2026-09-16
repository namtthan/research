// Load immutable legacy briefing archives plus small per-date JSON shards.
// New updates should write only data/<feed>/YYYY-MM-DD.json and then add that
// filename to data/<feed>/index.json. Shards override legacy entries for the
// same date, so corrections never require rewriting the large archive file.
(function () {
  const nativeFetch = window.fetch.bind(window);

  const shardFeeds = {
    "data/daily.json": { index: "data/daily/index.json", dir: "data/daily" },
    "data/weekly.json": { index: "data/weekly/index.json", dir: "data/weekly" },
    "data/jobs.json": { index: "data/jobs/index.json", dir: "data/jobs" },
    "data/academia_jobs.json": {
      index: "data/academia_jobs/index.json",
      dir: "data/academia_jobs",
    },
  };

  function requestPath(input) {
    if (typeof input === "string") return input;
    if (input && typeof input.url === "string") return input.url;
    return "";
  }

  function groupsFrom(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.briefings)) return payload.briefings;
    if (payload.date) return [payload];
    return [];
  }

  async function loadShardFiles(config) {
    let index;
    try {
      const response = await nativeFetch(config.index, { cache: "no-store" });
      if (!response.ok) return [];
      index = await response.json();
    } catch (error) {
      console.warn("Could not load shard index", config.index, error);
      return [];
    }

    const files = Array.isArray(index.files) ? index.files : [];
    return Promise.all(
      files.map(async (file) => {
        const filename = typeof file === "string" ? file : file && file.file;
        if (!filename) return null;
        try {
          const response = await nativeFetch(`${config.dir}/${filename}`, {
            cache: "no-store",
          });
          if (!response.ok) throw new Error(`${response.status}`);
          return response.json();
        } catch (error) {
          console.warn("Could not load briefing shard", filename, error);
          return null;
        }
      }),
    );
  }

  window.fetch = async function (input, init) {
    const path = requestPath(input);
    const config = shardFeeds[path];
    if (!config) return nativeFetch(input, init);

    // This call intentionally goes through the previously installed fetch
    // wrappers (job-history.js / weekly-history.js), preserving their archive
    // recovery behavior. nativeFetch here is the wrapper that existed when
    // this script loaded, not necessarily the browser's original fetch.
    const legacyResponse = await nativeFetch(input, init);
    if (!legacyResponse.ok) return legacyResponse;

    const legacy = await legacyResponse.clone().json();
    const shards = await loadShardFiles(config);
    const byDate = new Map();

    groupsFrom(legacy).forEach((group) => {
      if (group && group.date) byDate.set(group.date, group);
    });
    shards.forEach((payload) => {
      groupsFrom(payload).forEach((group) => {
        if (group && group.date) byDate.set(group.date, group);
      });
    });

    return new Response(
      JSON.stringify({
        ...legacy,
        briefings: [...byDate.values()].sort((a, b) =>
          String(b.date).localeCompare(String(a.date)),
        ),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };
})();
