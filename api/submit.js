// api/submit.js
const { randomUUID } = require("crypto");

// Helper: stream -> string
async function streamToString(stream) {
  const chunks = [];
  for await (const ch of stream) chunks.push(Buffer.from(ch));
  return Buffer.concat(chunks).toString("utf8");
}

module.exports = async (req, res) => {
  try {
    // 1) IMPORT ESM DU SDK BLOB (important !)
    const { get, put, head } = await import("@vercel/blob");

    // 2) CORS (si formulaire sur le même domaine tu peux retirer)
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).end();
    }
    res.setHeader("Access-Control-Allow-Origin", "*");

    // 3) Méthodes autorisées
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST" });
    }

    // 4) Parse safe du body (selon le runtime, req.body peut être string)
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};
    const name = (body.name || "").trim();
    const question = (body.question || "").trim();
    if (!question) {
      return res.status(400).json({ error: "Question required" });
    }

    const PATH = "data/questions.json";

    // 5) Lire l’existant si présent
    let records = [];
    try {
      const meta = await head(PATH); // 404 si absent -> catch
      if (meta) {
        const { body: blobStream } = await get(PATH);
        const text = await streamToString(blobStream);
        const json = JSON.parse(text);
        if (Array.isArray(json)) records = json;
      }
    } catch {
      /* première écriture -> pas de fichier */
    }

    // 6) Ajouter l’entrée
    const entry = {
      id: randomUUID(),
      name: name || null,
      question,
      createdAt: new Date().toISOString(),
    };
    records.push(entry);

    // 7) Écrire (remplace le blob)
    await put(PATH, JSON.stringify(records, null, 2), {
      access: "public", // <-- la visibilité se met ICI
      contentType: "application/json",
    });

    return res.status(200).json({ ok: true, entry });
  } catch (err) {
    console.error("[submit] error:", err);
    // Message plus parlant en dev
    return res.status(500).json({ error: "Server error" });
  }
};
