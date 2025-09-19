// api/submit.js  (CommonJS)
const { get, put, head } = require("@vercel/blob");
const { randomUUID } = require("crypto");

module.exports = async (req, res) => {
  // CORS (optionnel) — commente si même domaine
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).end();
  }
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { name = "", question } = req.body || {};
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question required" });
    }

    const PATH = "data/questions.json";

    // Lire l’existant s’il existe
    let records = [];
    try {
      const exists = await head(PATH);
      if (exists) {
        const { body } = await get(PATH);
        const text = await streamToString(body);
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) records = parsed;
      }
    } catch {
      /* blob absent la 1re fois => records = [] */
    }

    // Ajouter l’entrée
    const entry = {
      id: randomUUID(),
      name: name.trim() || null,
      question: question.trim(),
      createdAt: new Date().toISOString(),
    };
    records.push(entry);

    // Écrire (écrase/replace le blob par la nouvelle version)
    await put(PATH, JSON.stringify(records, null, 2), {
      access: "public", // lisible en GET public
      contentType: "application/json",
    });

    return res.status(200).json({ ok: true, entry });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// util : convertir ReadableStream -> string
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}
