(function () {
  const nativeFetch = window.fetch.bind(window);
  const historyUrl =
    "https://raw.githubusercontent.com/namtthan/research/88d5025e0e8223c3a4247451c753ebe859fc235d/data/weekly.json";

  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : input && input.url;
    if (!url || !url.endsWith("data/weekly.json")) {
      return nativeFetch(input, init);
    }

    const currentResponse = await nativeFetch(input, init);
    if (!currentResponse.ok) return currentResponse;

    const currentData = await currentResponse.clone().json();
    let historicalData = { briefings: [] };

    try {
      const historicalResponse = await nativeFetch(historyUrl, { cache: "no-store" });
      if (historicalResponse.ok) historicalData = await historicalResponse.json();
    } catch (error) {
      console.warn("Could not load historical weekly briefings", error);
    }

    const byDate = new Map();
    [...(historicalData.briefings || []), ...(currentData.briefings || [])].forEach(
      (briefing) => byDate.set(briefing.date, briefing),
    );

    return new Response(
      JSON.stringify({ briefings: [...byDate.values()] }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };
})();
