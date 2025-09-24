// api/vote-results.js
module.exports = async (req, res) => {
  try {
    const { list, get } = await import("@vercel/blob");

    // parse pollId
    const url = new URL(req.url, "http://local");
    const pollId = (url.searchParams.get("pollId") || "").trim();
    if (!pollId) return res.status(400).json({ error: "pollId required" });

    const prefix = `data/votes/${pollId}/`;
    const counts = {};
    let total = 0;
    let cursor;
    let files = 0; // debug: combien de blobs vus

    // petite util
    async function streamToString(stream) {
      const chunks = [];
      for await (const ch of stream) chunks.push(Buffer.from(ch));
      return Buffer.concat(chunks).toString("utf8");
    }

    do {
      const resp = await list({ prefix, cursor });
      for (const b of resp.blobs) {
        if (!b.pathname.endsWith(".json")) continue;
        files++;

        try {
          const { body } = await get(b.pathname);
          const text = await streamToString(body);
          const v = JSON.parse(text);

          const c = String(v.choice ?? "").trim();
          if (!c) continue;

          counts[c] = (counts[c] || 0) + 1;
          total++;
        } catch (e) {
          // on ignore ce fichier, mais on log côté serveur
          console.error(
            "[vote-results] skip file due to error:",
            b.pathname,
            e
          );
        }
      }
      cursor = resp.cursor;
    } while (cursor);

    // pas d’erreur: même s'il n’y a aucun fichier, on renvoie 200
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      pollId,
      total,
      counts,
      debug: { prefix, files }, // <-- retire ce champ plus tard si tu veux
    });
  } catch (e) {
    console.error("[vote-results] error:", e);
    // (temporaire) remonte un message utile
    return res
      .status(500)
      .json({ error: "Server error", detail: String((e && e.message) || e) });
  }
};
