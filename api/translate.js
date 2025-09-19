// api/translate.js
module.exports = async (req, res) => {
  try {
    // CORS (si même domaine, c'est ok de le garder)
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

    // Parse JSON body
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

    const LT_BASE = "https://libretranslate.com";
    const DETECT_URL = `${LT_BASE}/detect`;
    const TRANSLATE_URL = `${LT_BASE}/translate`;

    // helper: POST x-www-form-urlencoded
    const postForm = async (url, params) => {
      const form = new URLSearchParams(params);
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: form,
      });
      const t = await r.text();
      if (!r.ok) throw new Error(`LT ${url} -> ${r.status} ${t || ""}`);
      try {
        return JSON.parse(t);
      } catch {
        return t;
      }
    };

    // 1) Détection
    let lang = null;
    try {
      const arr = await postForm(DETECT_URL, { q: text });
      if (Array.isArray(arr) && arr[0]?.language) lang = arr[0].language;
    } catch (e) {
      // si la détection échoue, on remonte l'info mais on ne bloque pas l'UI
      return res
        .status(200)
        .json({ lang: null, fr: null, note: "detect_failed" });
    }

    // 2) Traduction si NL
    let fr = null;
    if (lang === "nl") {
      try {
        const out = await postForm(TRANSLATE_URL, {
          q: text,
          source: "nl",
          target: "fr",
          format: "text",
        });
        fr = out?.translatedText || null;
      } catch (e) {
        return res
          .status(200)
          .json({ lang, fr: null, note: "translate_failed" });
      }
    }

    return res.status(200).json({ lang, fr });
  } catch (e) {
    console.error("[translate] error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
