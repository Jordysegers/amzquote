// Adressen en routes: api-postcode.nl en Google Maps (Places + Routes).
import {env, siteUrl} from "./server.js";

export const VESTIGING = "Quistenburg 8, 4454 PZ Borssele";
const PC = /^\s*(\d{4})\s?([a-zA-Z]{2})[\s,]+(\d+)\s*([a-zA-Z]{0,4}|-\s?\w+)?\s*$/;

// Postcode + huisnummer => straat en plaats
export async function postcode(pc, nr) {
  pc = String(pc || "").replace(/\s+/g, "").toUpperCase();
  nr = String(nr || "").trim();
  if (!/^\d{4}[A-Z]{2}$/.test(pc) || !/^\d+/.test(nr)) return null;
  const url = "https://json.api-postcode.nl?postcode=" + encodeURIComponent(pc) + "&number=" + encodeURIComponent(nr.match(/^\d+/)[0]);
  const r = await fetch(url, {headers: {token: env("POSTCODE_API_TOKEN")}});
  if (!r.ok) return null;
  const j = await r.json();
  if (!j || !j.street) return null;
  return {adres: j.street + " " + nr, stad: j.city || "", postcode: j.zip_code || pc, land: "NL",
          lat: j.latitude, lng: j.longitude, bron: "postcode"};
}

// Vrije tekst ("Bobbejaanland", "Station Goes", "Joseph Lunslaan 5, Goes") => precies adres
export async function zoekPlek(tekst) {
  tekst = String(tekst || "").trim();
  if (!tekst) return null;
  const m = tekst.match(PC);
  if (m) { const p = await postcode(m[1] + m[2], m[3] + (m[4] || "")).catch(() => null); if (p) return p; }
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {"Content-Type": "application/json", "X-Goog-Api-Key": env("GOOGLE_MAPS_API_KEY"), Referer: siteUrl(),
              "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.addressComponents,places.location"},
    body: JSON.stringify({textQuery: tekst, languageCode: "nl", regionCode: "NL", maxResultCount: 1})
  });
  if (!r.ok) throw Object.assign(new Error("Google Places: " + r.status + " " + (await r.text()).slice(0, 200)), {status: 502});
  const p = (await r.json()).places?.[0];
  if (!p) return null;
  const c = t => (p.addressComponents || []).find(x => (x.types || []).includes(t));
  const straat = c("route")?.longText || "", nr = c("street_number")?.longText || "";
  return {
    adres: [straat, nr].filter(Boolean).join(" ") || p.displayName?.text || "",
    stad: c("locality")?.longText || c("postal_town")?.longText || c("administrative_area_level_2")?.longText || "",
    postcode: c("postal_code")?.longText || "",
    land: c("country")?.shortText || "",
    naam: p.displayName?.text || "",
    lat: p.location?.latitude, lng: p.location?.longitude, bron: "google"
  };
}

const LANDEN = {Netherlands:"NL", Belgium:"BE", Germany:"DE", France:"FR", Luxembourg:"LU", Switzerland:"CH", Austria:"AT",
  Italy:"IT", Spain:"ES", "United Kingdom":"GB", England:"GB", Czechia:"CZ", "Czech Republic":"CZ", Poland:"PL", Denmark:"DK", Hungary:"HU", Slovenia:"SI", Croatia:"HR", Liechtenstein:"LI"};

const punt = p => p && p.lat != null ? {location: {latLng: {latitude: p.lat, longitude: p.lng}}} : {address: String(p?.tekst || p || "")};

// Route met de auto: km, minuten en km per land (via "Entering <land>" in de routebeschrijving)
export async function route(van, naar, startLand) {
  const r = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {"Content-Type": "application/json", "X-Goog-Api-Key": env("GOOGLE_MAPS_API_KEY"), Referer: siteUrl(),
              "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.legs.steps.distanceMeters,routes.legs.steps.navigationInstruction.instructions"},
    body: JSON.stringify({origin: punt(van), destination: punt(naar), travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE",
                          languageCode: "en-US", units: "METRIC"})
  });
  if (!r.ok) throw Object.assign(new Error("Google Routes: " + r.status + " " + (await r.text()).slice(0, 200)), {status: 502});
  const rt = (await r.json()).routes?.[0];
  if (!rt) return null;
  const perLand = {}; let land = startLand || "NL";
  for (const leg of rt.legs || []) for (const s of leg.steps || []) {
    const m = String(s.navigationInstruction?.instructions || "").match(/Entering ([A-Z][A-Za-z ]+)/);
    if (m && LANDEN[m[1].trim()]) land = LANDEN[m[1].trim()];
    perLand[land] = (perLand[land] || 0) + (s.distanceMeters || 0);
  }
  for (const k in perLand) perLand[k] = Math.round(perLand[k] / 1000);
  for (const k in perLand) if (!perLand[k]) delete perLand[k];
  return {km: Math.round((rt.distanceMeters || 0) / 1000), minuten: Math.round(parseInt(rt.duration || "0", 10) / 60), kmPerLand: perLand};
}

// Eén rit volledig: adressen opzoeken, route, en de leegritten van/naar Borssele
export async function ritInfo(vanTekst, naarTekst, {leegHeen = false, leegTerug = false} = {}) {
  const [van, naar, basis] = await Promise.all([zoekPlek(vanTekst), zoekPlek(naarTekst), zoekPlek(VESTIGING).catch(() => null)]);
  const uit = {van: van ? {...van, gevonden: true} : {gevonden: false}, naar: naar ? {...naar, gevonden: true} : {gevonden: false}};
  if (van && naar) Object.assign(uit, await route(van, naar, van.land || "NL"));
  const b = basis || VESTIGING;
  if (leegHeen && van) { const l = await route(b, van, "NL"); if (l) { uit.leegHeenKm = l.km; uit.leegHeenMin = l.minuten; } }
  if (leegTerug && naar) { const l = await route(naar, b, naar.land || "NL"); if (l) { uit.leegTerugKm = l.km; uit.leegTerugMin = l.minuten; } }
  return uit;
}
