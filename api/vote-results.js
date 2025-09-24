// api/vote-results.js
module.exports = async (req, res) => {
  try {
    const { list, get } = await import("@vercel/blob");

    const url = new URL(req.url, "http://local");
    const pollId = (url.searchParams.get("pollId") || "").trim();
    if (!pollId) return res.status(400).json({ error: "pollId required" });

    const counts = {};
    let total = 0;
    let cursor;

    do {
      const resp = await list({ prefix: `votes/${pollId}/entries/`, cursor });
      for (const b of resp.blobs) {
        if (!b.pathname.endsWith(".json")) continue;
        const { body } = await get(b.pathname);
        const chunks = [];
        for await (const ch of body) chunks.push(Buffer.from(ch));
        try {
          const v = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          counts[v.choice] = (counts[v.choice] || 0) + 1;
          total++;
        } catch {}
      }
      cursor = resp.cursor;
    } while (cursor);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ pollId, total, counts });
  } catch (e) {
    console.error("[vote-results] error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
