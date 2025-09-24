// api/vote-dump.js
module.exports = async (req, res) => {
  try {
    const { list, head } = await import("@vercel/blob");

    const url = new URL(req.url, "http://local");
    const pollId = (url.searchParams.get("pollId") || "").trim();
    const limit = Math.max(
      1,
      Math.min(50, parseInt(url.searchParams.get("limit") || "10", 10))
    );
    if (!pollId) return res.status(400).json({ error: "pollId required" });

    const prefix = `data/votes/${pollId}/`;
    let cursor,
      out = [],
      count = 0;

    do {
      const resp = await list({ prefix, cursor });
      for (const b of resp.blobs) {
        if (!b.pathname.endsWith(".json")) continue;
        // Récupérer une URL lisible via head()
        let fileText = "";
        try {
          const meta = await head(b.pathname);
          const r = await fetch(meta.url); // <-- lire le contenu
          fileText = await r.text();
        } catch (e) {
          out.push({ path: b.pathname, error: String(e) });
          continue;
        }

        let parsed = null;
        try {
          parsed = JSON.parse(fileText);
        } catch {}
        out.push({
          path: b.pathname,
          parsed,
          raw: parsed ? undefined : fileText,
        });
        count++;
        if (count >= limit) break;
      }
      if (count >= limit) break;
      cursor = resp.cursor;
    } while (cursor);

    res.setHeader("Cache-Control", "no-store");
    return res
      .status(200)
      .json({ pollId, prefix, inspected: out.length, items: out });
  } catch (e) {
    console.error("[vote-dump] error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
