// api/vote.js
const { randomUUID } = require("crypto");

module.exports = async (req, res) => {
  try {
    const { put, head } = await import("@vercel/blob");

    if (req.method !== "POST")
      return res.status(405).json({ error: "Use POST" });

    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body || "{}");
    const pollId = body.pollId?.trim();
    const choice = body.choice?.trim();
    const deviceId = body.deviceId?.trim();

    if (!pollId || !choice || !deviceId)
      return res
        .status(400)
        .json({ error: "pollId, choice, deviceId required" });

    // === Check si déjà voté ===
    const markerPath = `data/votes/${pollId}/devices/${deviceId}.json`;
    try {
      // si le fichier existe déjà → déjà voté
      await head(markerPath);
      return res.status(409).json({ error: "already_voted" });
    } catch {
      // pas trouvé → OK pour voter
    }

    // 1) Crée le marqueur device
    await put(
      markerPath,
      JSON.stringify({ pollId, choice, at: new Date().toISOString() }),
      {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: false,
      }
    );

    // 2) Sauvegarde le vote append-only
    const entry = {
      id: randomUUID(),
      pollId,
      choice,
      deviceId,
      createdAt: new Date().toISOString(),
    };
    const key = `data/votes/${pollId}/entries/${entry.createdAt.replace(
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
