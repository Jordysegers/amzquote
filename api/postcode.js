// GET /api/postcode?postcode=4454PZ&number=8
import {stuur, fout, ingelogd} from "./_lib/server.js";
import {postcode} from "./_lib/geo.js";
export default async function handler(req, res) {
  try {
    await ingelogd(req);
    const r = await postcode(req.query.postcode, req.query.number);
    if (!r) return stuur(res, 404, {fout: "Adres niet gevonden bij deze postcode en dit huisnummer"});
    stuur(res, 200, r);
  } catch (e) { fout(res, e); }
}
