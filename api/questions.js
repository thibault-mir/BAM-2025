// api/questions.js
module.exports = async (req, res) => {
  try {
    const { list, get } = await import("@vercel/blob");

    res.setHeader("Cache-Control", "no-store");

    const items = [];
    let cursor;

    do {
      const resp = await list({ prefix: "data/", cursor });
      for (const b of resp.blobs) {
        if (!b.pathname.endsWith(".json")) continue;

        const { body } = await get(b.pathname);
        const chunks = [];
        for await (const ch of body) chunks.push(Buffer.from(ch));
        try {
          const obj = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          items.push(obj);
        } catch {}
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
