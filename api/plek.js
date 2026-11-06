// GET /api/plek?id=<placeId>&s=<sessie>  => precies adres van een gekozen suggestie
import {stuur, fout, ingelogd, env} from "./_lib/server.js";
export default async function handler(req, res) {
  try {
    await ingelogd(req);
    const id = String(req.query.id || "");
    if (!/^[\w-]+$/.test(id)) return stuur(res, 400, {fout: "Onbekende plek"});
    const s = /^[a-zA-Z0-9-]{8,}$/.test(String(req.query.s || "")) ? "?sessionToken=" + req.query.s : "";
    const r = await fetch("https://places.googleapis.com/v1/places/" + id + s, {
      headers: {"X-Goog-Api-Key": env("GOOGLE_MAPS_API_KEY"), "X-Goog-FieldMask": "displayName,formattedAddress,addressComponents,location", "Accept-Language": "nl"}
    });
    if (!r.ok) throw Object.assign(new Error("Google Places: " + r.status + " " + (await r.text()).slice(0, 200)), {status: 502});
    const p = await r.json();
    const c = t => (p.addressComponents || []).find(x => (x.types || []).includes(t));
    const straat = c("route")?.longText || "", nr = c("street_number")?.longText || "";
    stuur(res, 200, {
      naam: p.displayName?.text || "",
      adres: [straat, nr].filter(Boolean).join(" ") || p.displayName?.text || "",
      stad: c("locality")?.longText || c("postal_town")?.longText || c("administrative_area_level_2")?.longText || "",
      land: c("country")?.shortText || "", volledig: p.formattedAddress || ""
    });
  } catch (e) { fout(res, e); }
}
