// api/translate.js
// Retour: { lang: 'nl'|'other'|null, fr: string|null, source?: 'mymemory'|'libre' }

module.exports = async (req, res) => {
  try {
    // CORS léger
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

    // parse body
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const text = (body?.text || "").trim();
    if (!text) return res.status(400).json({ error: "text required" });

    // --- Détection NL : heuristique rapide, fiable pour des questions courtes
    const looksDutch = (s) => {
      s = s.toLowerCase();
      const rx = [
        // mots interrogatifs NL fréquents
        /\bwaar\b/,
        /\bwanneer\b/,
        /\bhoe\b/,
        /\bwat\b/,
        /\bwie\b/,
        /\bwaarom\b/,
        /\bwelke\b/,
        // mots fonctionnels NL très communs
        /\bik\b/,
        /\bniet\b/,
        /\been\b/,
        /\bhet\b/,
        /\bde\b/,
        /\ben\b/,
        /\bje\b/,
        /\bjou\b/,
        /\bzijn\b/,
        /\bheb\b/,
        /\bhebt\b/,
        /\bmet\b/,
        /\bvoor\b/,
        /\bals\b/,
        /\bmaar\b/,
        /\bwel\b/,
        /\bgeen\b/,
        /\bgoed\b/,
        /\bdag\b/,
        /\bhallo\b/,
        /\bdank\b/,
        /\balstublieft\b/,
      ];
      let hits = 0;
      for (const r of rx) if (r.test(s)) hits++;
      return hits >= 2; // seuil
    };

    // Si ça ne ressemble pas à du NL, on ne traduit pas
    if (!looksDutch(text)) {
      return res.status(200).json({ lang: "other", fr: null });
    }

    // --- 1) Tentative MyMemory (gratuit, sans clé)
    // Doc : https://mymemory.translated.net/doc/spec.php
    const mmUrl =
      "https://api.mymemory.translated.net/get?q=" +
      encodeURIComponent(text) +
      "&langpair=nl|fr";
    try {
      const r = await fetch(mmUrl, { method: "GET" });
      const t = await r.text();
      if (r.ok) {
        const json = JSON.parse(t);
        const fr = json?.responseData?.translatedText || "";
        // MyMemory peut renvoyer la même phrase si non reconnue – on filtre
        if (fr && fr.trim().toLowerCase() !== text.trim().toLowerCase()) {
          return res.status(200).json({ lang: "nl", fr, source: "mymemory" });
        }
      }
    } catch (_) {
      // ignore, on tente la suite
    }

    // --- 2) Fallback LibreTranslate (toujours côté serveur)
    try {
      const LT_BASE = "https://libretranslate.com";
      const TRANSLATE_URL = `${LT_BASE}/translate`;
      const form = new URLSearchParams({
        q: text,
        source: "nl",
        target: "fr",
        format: "text",
      });
      const rr = await fetch(TRANSLATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: form,
      });
      const tt = await rr.text();
      if (rr.ok) {
        const out = JSON.parse(tt);
        const fr = out?.translatedText || null;
        return res.status(200).json({ lang: "nl", fr, source: "libre" });
      }
    } catch (_) {
      // ignore
    }

    // Si vraiment rien
    return res.status(200).json({ lang: "nl", fr: null });
  } catch (e) {
    console.error("[translate] error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
