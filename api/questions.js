// api/questions.js
module.exports = async (req, res) => {
  try {
    const { list } = await import("@vercel/blob");

    res.setHeader("Cache-Control", "no-store");

    const items = [];
    let cursor;

    do {
      const resp = await list({ prefix: "data/", cursor });
      for (const b of resp.blobs) {
        // on ne garde que les .json
        if (!b.pathname.endsWith(".json")) continue;

        // b.url est l'URL publique (access:"public")
        if (!b.url) continue;

        try {
          const r = await fetch(b.url, { cache: "no-store" });
          if (!r.ok) continue;
          const obj = await r.json();
          items.push(obj);
        } catch (_) {
          // ignore un blob illisible
        }
      }
      cursor = resp.cursor;
    } while (cursor);

    // tri du plus récent au plus ancien
    items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return res.status(200).json(items);
  } catch (e) {
    console.error("[questions] error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
