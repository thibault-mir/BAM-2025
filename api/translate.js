// api/translate.js
// Reçoit: POST { text: string } ; Retourne: { lang: string|null, fr: string|null }
module.exports = async (req, res) => {
  try {
    // CORS basique (même domaine => ok, sinon garde ça)
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

    // Heuristique rapide pour éviter des appels inutiles
    const looksDutch = (s) => {
      s = s.toLowerCase();
      const rx = [
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
        /\bwaar\b/,
        /\bwanneer\b/,
        /\bhoe\b/,
        /\bwat\b/,
        /\bwie\b/,
        /\bwaarom\b/,
        /\bwelke\b/,
      ];
      let hits = 0;
      for (const r of rx) if (r.test(s)) hits++;
      return hits >= 2;
    };

    const LT_BASE = "https://libretranslate.com";
    const DETECT_URL = `${LT_BASE}/detect`;
    const TRANSLATE_URL = `${LT_BASE}/translate`;

    // util: POST x-www-form-urlencoded
    const postForm = async (url, params) => {
      const body = new URLSearchParams(params);
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body,
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`LT ${url} -> ${r.status} ${t}`);
      }
      return r.json();
    };

    // 1) détection
    let lang = null;
    if (looksDutch(text)) {
      try {
        const arr = await postForm(DETECT_URL, { q: text });
        if (Array.isArray(arr) && arr[0]?.language) lang = arr[0].language;
      } catch (e) {
        // si l’instance publique bloque/limite, on continue sans bloquer l’UI
        lang = null;
      }
    }

    // 2) traduction si NL
    let fr = null;
    if (lang === "nl") {
      try {
        const data = await postForm(TRANSLATE_URL, {
          q: text,
          source: "nl",
          target: "fr",
          format: "text",
          // api_key: '...'  // si un jour tu bascules sur une instance protégée
        });
        fr = data?.translatedText || null;
      } catch (e) {
        fr = null;
      }
    }

    return res.status(200).json({ lang: lang || null, fr });
  } catch (e) {
    console.error("[translate] error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
