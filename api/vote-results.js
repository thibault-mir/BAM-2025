// api/vote-results.js
module.exports = async (req, res) => {
  try {
    const { list, head } = await import("@vercel/blob");

    const url = new URL(req.url, "http://local");
    const pollId = (url.searchParams.get("pollId") || "").trim();
    if (!pollId) return res.status(400).json({ error: "pollId required" });

    const prefix = `data/votes/${pollId}/entries/`;
    const counts = {};
    let total = 0,
      files = 0,
      cursor;

    const pickChoice = (v) => {
      const c = v?.choice ?? v?.vote ?? v?.selected ?? v?.value ?? "";
      return (typeof c === "number" ? String(c) : String(c)).trim();
    };

    do {
      const resp = await list({ prefix, cursor });
      for (const b of resp.blobs) {
        if (!b.pathname.endsWith(".json")) continue;
        files++;
        try {
          const meta = await head(b.pathname);
          const r = await fetch(meta.url); // <-- lire le contenu
          const txt = await r.text();
          const json = JSON.parse(txt);

          const c = pickChoice(json);
          if (!c) continue;

          counts[c] = (counts[c] || 0) + 1;
          total++;
        } catch (e) {
          console.error("[vote-results] skip due to error:", b.pathname, e);
        }
      }
      cursor = resp.cursor;
    } while (cursor);

    res.setHeader("Cache-Control", "no-store");
    return res
      .status(200)
      .json({ pollId, total, counts, debug: { prefix, files } });
  } catch (e) {
    console.error("[vote-results] error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
