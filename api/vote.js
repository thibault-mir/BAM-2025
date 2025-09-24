// api/vote.js
const { randomUUID } = require("crypto");

module.exports = async (req, res) => {
  try {
    const { put, head } = await import("@vercel/blob");

    // CORS minimal
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).end();
    }
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (req.method !== "POST")
      return res.status(405).json({ error: "Use POST" });

    // parse
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

    if (!pollId || !choice || !deviceId)
      return res
        .status(400)
        .json({ error: "pollId, choice, deviceId required" });

    // anti double-vote: si le marqueur existe déjà → 409
    const markerPath = `data/votes/${pollId}/devices/${deviceId}.json`;
    try {
      await head(markerPath);
      return res.status(409).json({ error: "already_voted" });
    } catch {
      /* pas trouvé → OK */
    }

    // 1) écrire l'entrée append-only
    const entry = {
      id: randomUUID(),
      pollId,
      choice,
      deviceId,
      createdAt: new Date().toISOString(),
    };
    const entryKey = `data/votes/${pollId}/entries/${entry.createdAt.replace(
      /[:.]/g,
      "-"
    )}-${entry.id}.json`;

    await put(entryKey, JSON.stringify(entry, null, 2), {
      access: "public", // <-- CHANGER ICI
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: false,
    });

    // 2) créer le marqueur device (empêche les prochains votes)
    await put(
      markerPath,
      JSON.stringify({ pollId, choice, at: entry.createdAt }, null, 2),
      {
        access: "public", // <-- ET ICI AUSSI
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: false,
      }
    );

    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error("[vote] error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
