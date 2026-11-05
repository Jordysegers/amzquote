// POST /api/rit  {van, naar, leegHeen, leegTerug}  => adressen, km, minuten, km per land, leegritten
import {stuur, fout, ingelogd, body} from "./_lib/server.js";
import {ritInfo} from "./_lib/geo.js";
export const config = {maxDuration: 30};
export default async function handler(req, res) {
  try {
    await ingelogd(req);
    const b = body(req);
    if (!String(b.van || "").trim() || !String(b.naar || "").trim()) return stuur(res, 400, {fout: "Vertrek en bestemming zijn nodig"});
    stuur(res, 200, await ritInfo(b.van, b.naar, {leegHeen: !!b.leegHeen, leegTerug: !!b.leegTerug}));
  } catch (e) { fout(res, e); }
}
