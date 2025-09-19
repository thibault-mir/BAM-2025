// api/submit.js
const { randomUUID } = require("crypto");

module.exports = async (req, res) => {
  try {
    const { put } = await import("@vercel/blob");

    // CORS minimal (si même domaine, tu peux retirer)
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

    // Parse body en douceur
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const name = (body?.name || "").trim();
    const question = (body?.question || "").trim();
    if (!question) return res.status(400).json({ error: "Question required" });

    // Un blob par entrée (append-only)
    const entry = {
      id: randomUUID(),
      name: name || null,
      question,
      createdAt: new Date().toISOString(),
    };

    // Préfixe + clé unique horodatée pour tri naturel
    const key = `data/${entry.createdAt.replace(/[:.]/g, "-")}-${
      entry.id
    }.json`;

    const putResp = await put(key, JSON.stringify(entry, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: false, // ← jamais d’écrasement
    });

    return res.status(200).json({ ok: true, entry, blobUrl: putResp.url });
  } catch (e) {
    console.error("[submit] error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
