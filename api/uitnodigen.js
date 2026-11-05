// POST /api/uitnodigen {email, naam}  => collega krijgt een uitnodigingsmail om een wachtwoord in te stellen
import {stuur, fout, ingelogd, body, env} from "./_lib/server.js";
export default async function handler(req, res) {
  try {
    await ingelogd(req);
    const {email, naam} = body(req);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || ""))) return stuur(res, 400, {fout: "Vul een geldig e-mailadres in"});
    const key = env("SUPABASE_SERVICE_ROLE_KEY");
    const site = "https://" + (req.headers["x-forwarded-host"] || req.headers.host);
    const r = await fetch(env("SUPABASE_URL") + "/auth/v1/invite?redirect_to=" + encodeURIComponent(site), {
      method: "POST",
      headers: {apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json"},
      body: JSON.stringify({email: String(email).trim(), data: {naam: String(naam || "").trim()}})
    });
    const t = await r.text();
    if (!r.ok) return stuur(res, r.status, {fout: /already/i.test(t) ? "Dit e-mailadres heeft al een account" : "Uitnodigen lukte niet: " + t.slice(0, 200)});
    stuur(res, 200, {ok: true});
  } catch (e) { fout(res, e); }
}
