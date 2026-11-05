// POST /api/uitlezen {tekst}  => uitgelezen aanvraag (de tekst zelf wordt niet bewaard)
import {stuur, fout, ingelogd, body} from "./_lib/server.js";
import {leesAanvraag} from "./_lib/parse.js";
import {naarAanvraag} from "./_lib/verwerk.js";
export const config = {maxDuration: 60};
export default async function handler(req, res) {
  try {
    await ingelogd(req);
    const t = String(body(req).tekst || "").trim();
    if (!t) return stuur(res, 400, {fout: "Geen tekst ontvangen"});
    const d = await leesAanvraag(t);
    // verwerk: meteen omzetten naar een aanvraag, met adressen en kilometers via Google Maps
    if (body(req).verwerk) return stuur(res, 200, {isAanvraag: d?.isAanvraag !== false, data: await naarAanvraag(d)});
    stuur(res, 200, d);
  } catch (e) { fout(res, e); }
}
