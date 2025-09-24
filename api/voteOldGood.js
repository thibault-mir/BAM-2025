// api/vote.js
const { randomUUID } = require("crypto");

module.exports = async (req, res) => {
  try {
    const { put } = await import("@vercel/blob");

    // CORS minimal
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

    // Parse body
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const pollId = (body?.pollId || "").trim();
    const choice = (body?.choice || "").trim(); // ex: "1".."11"
    if (!pollId || !choice) {
      return res.status(400).json({ error: "pollId and choice required" });
    }

    // (facultatif) whitelist
    const allowed = new Set(
      Array.from({ length: 11 }, (_, i) => String(i + 1))
    );
    if (!allowed.has(choice)) {
      return res.status(400).json({ error: "invalid choice" });
    }

    // Un blob par vote (append-only)
    const entry = {
      id: randomUUID(),
      pollId,
      choice,
      createdAt: new Date().toISOString(),
    };

    // clé horodatée pour tri naturel
    const key = `data/votes/${pollId}/${entry.createdAt.replace(
      /[:.]/g,
      "-"
    )}-${entry.id}.json`;

    const putResp = await put(key, JSON.stringify(entry, null, 2), {
      access: "public", // ou "private" si tu préfères
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: false, // jamais d’écrasement
    });

    return res.status(200).json({ ok: true, entry, blobUrl: putResp.url });
  } catch (e) {
    console.error("[vote] error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
