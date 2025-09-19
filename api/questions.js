// api/questions.js
module.exports = async (req, res) => {
  try {
    const { head, get, list } = await import("@vercel/blob");

    // Essaye d'abord le fichier unique (Option A)
    const PATH = "data/questions.json";
    try {
      const meta = await head(PATH);
      if (meta) {
        const { body } = await get(PATH);
        const chunks = [];
        for await (const ch of body) chunks.push(Buffer.from(ch));
        const json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        return res.status(200).json(Array.isArray(json) ? json : []);
      }
    } catch {
      /* pas de fichier unique -> tente Option B */
    }

    // Sinon, agrège tous les fichiers data/*.json (Option B)
    const items = [];
    let cursor;
    do {
      const resp = await list({ prefix: "data/", cursor });
      for (const b of resp.blobs) {
        if (!b.pathname.endsWith(".json")) continue;
        // éviter de recharger questions.json si tu l’as (déjà géré au-dessus)
        if (b.pathname === PATH) continue;

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

    // Tri du plus récent au plus ancien
    items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return res.status(200).json(items);
  } catch (e) {
    console.error("[questions] error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
