// api/vote-results.js
module.exports = async (req, res) => {
  try {
    const { list, get } = await import("@vercel/blob");

    const url = new URL(req.url, "http://local");
    const pollId = (url.searchParams.get("pollId") || "").trim();
    if (!pollId) return res.status(400).json({ error: "pollId required" });

    const prefix = `data/votes/${pollId}/`;
    const counts = {};
    let total = 0,
      files = 0,
      cursor;

    async function streamToString(stream) {
      const chunks = [];
      for await (const ch of stream) chunks.push(Buffer.from(ch));
      return Buffer.concat(chunks).toString("utf8");
    }

    const getChoice = (v) => {
      const c = v?.choice ?? v?.vote ?? v?.selected ?? v?.value ?? "";
      const s = (typeof c === "number" ? String(c) : String(c)).trim();
      return s;
    };

    do {
      const resp = await list({ prefix, cursor });
      for (const b of resp.blobs) {
        if (!b.pathname.endsWith(".json")) continue;
        files++;
        try {
          const { body } = await get(b.pathname);
          const text = await streamToString(body);
          const v = JSON.parse(text);
          const c = getChoice(v);
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
    return res
      .status(500)
      .json({ error: "Server error", detail: String(e?.message || e) });
  }
};
