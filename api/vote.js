// api/vote.js
const { randomUUID } = require("crypto");

module.exports = async (req, res) => {
  try {
    const { put } = await import("@vercel/blob");

    // CORS simple
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).end();
    }
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (req.method !== "POST")
      return res.status(405).json({ error: "Use POST" });

    // parse body
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const pollId = (body?.pollId || "").trim();
    const choice = (body?.choice || "").trim(); // "1".."11"
    const deviceId = (body?.deviceId || "").trim();

    if (!pollId || !choice || !deviceId) {
      return res
        .status(400)
        .json({ error: "pollId, choice, deviceId required" });
    }

    // whitelist des choix 1..11
    const allowed = new Set(
      Array.from({ length: 11 }, (_, i) => String(i + 1))
    );
    if (!allowed.has(choice)) {
      return res.status(400).json({ error: "invalid choice" });
    }

    // 1) Marqueur device (empêche double vote)
    const markerPath = `votes/${pollId}/devices/${deviceId}.json`;
    try {
      await put(
        markerPath,
        JSON.stringify(
          { pollId, choice, at: new Date().toISOString() },
          null,
          2
        ),
        {
          access: "private",
          contentType: "application/json",
          addRandomSuffix: false,
          allowOverwrite: false, // clé : 2e écriture => erreur (déjà voté)
        }
      );
      // si on passe ici, c’est le 1er vote de ce device
    } catch (e) {
      return res.status(409).json({ error: "already_voted" });
    }

    // 2) Append-only pour l’historique
    const entry = {
      id: randomUUID(),
      pollId,
      choice,
      deviceId, // optionnel: retire-le si tu ne veux pas le stocker
      ip: req.headers["x-forwarded-for"] || null,
      ua: req.headers["user-agent"] || null,
      createdAt: new Date().toISOString(),
    };
    const key = `votes/${pollId}/entries/${entry.createdAt.replace(
      /[:.]/g,
      "-"
    )}-${entry.id}.json`;
    await put(key, JSON.stringify(entry, null, 2), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: false,
    });

    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error("[vote] error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
