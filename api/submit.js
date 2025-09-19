// api/submit.js
const { randomUUID } = require("crypto");

async function streamToString(stream) {
  const chunks = [];
  for await (const ch of stream) chunks.push(Buffer.from(ch));
  return Buffer.concat(chunks).toString("utf8");
}

module.exports = async (req, res) => {
  try {
    const { get, put, head } = await import("@vercel/blob");

    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).end();
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.method !== "POST")
      return res.status(405).json({ error: "Use POST" });

    // body safe
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
    if (!question) return res.status(400).json({ error: "Question required" });

    const PATH = "data/questions.json";

    // lire l'existant
    let records = [];
    try {
      const meta = await head(PATH);
      if (meta) {
        const { body: rs } = await get(PATH);
        const text = await streamToString(rs);
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) records = parsed;
      }
    } catch {
      /* pas encore créé */
    }

    // ajouter l'entrée
    const entry = {
      id: randomUUID(),
      name: name || null,
      question,
      createdAt: new Date().toISOString(),
    };
    records.push(entry);

    // sauver (IMPORTANT: autoriser l’écrasement du même blob)
    await put(PATH, JSON.stringify(records, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true, // <- pour garder le même fichier et le mettre à jour
    });

    return res.status(200).json({ ok: true, entry });
  } catch (err) {
    console.error("[submit] error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
