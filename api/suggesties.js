// GET /api/suggesties?q=bobbej&s=<sessie>  => adressuggesties terwijl je typt (Google Places Autocomplete)
import {stuur, fout, ingelogd, env, siteUrl} from "./_lib/server.js";
export default async function handler(req, res) {
  try {
    await ingelogd(req);
    const q = String(req.query.q || "").trim();
    if (q.length < 3) return stuur(res, 200, []);
    const body = {input: q, languageCode: "nl",
      locationBias: {circle: {center: {latitude: 51.43, longitude: 3.74}, radius: 50000}}};   // voorkeur rond Zeeland
    if (/^[a-zA-Z0-9-]{8,}$/.test(String(req.query.s || ""))) body.sessionToken = req.query.s;
    const r = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {"Content-Type": "application/json", "X-Goog-Api-Key": env("GOOGLE_MAPS_API_KEY"), Referer: siteUrl()},
      body: JSON.stringify(body)
    });
    if (!r.ok) throw Object.assign(new Error("Google Places: " + r.status + " " + (await r.text()).slice(0, 200)), {status: 502});
    const j = await r.json();
    stuur(res, 200, (j.suggestions || []).filter(s => s.placePrediction).slice(0, 6).map(s => {
      const p = s.placePrediction;
      return {id: p.placeId, tekst: p.text?.text || "", hoofd: p.structuredFormat?.mainText?.text || p.text?.text || "", sub: p.structuredFormat?.secondaryText?.text || ""};
    }));
  } catch (e) { fout(res, e); }
}
