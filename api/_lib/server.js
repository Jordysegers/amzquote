// Gedeelde hulpfuncties voor de serverfuncties op Vercel.

export function stuur(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(JSON.stringify(body));
}

export function fout(res, e) {
  console.error(e);
  stuur(res, e.status || 500, {fout: e.message || "Er ging iets mis"});
}

export function env(naam) {
  const v = process.env[naam];
  if (!v) throw Object.assign(new Error(naam + " ontbreekt in de Vercel-instellingen"), {status: 500});
  return v;
}

// Controleert of de aanvraag van een ingelogde collega komt (Supabase-sessie).
export async function ingelogd(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) throw Object.assign(new Error("Niet ingelogd"), {status: 401});
  const r = await fetch(env("SUPABASE_URL") + "/auth/v1/user", {
    headers: {Authorization: h, apikey: env("SUPABASE_ANON_KEY")}
  });
  if (!r.ok) throw Object.assign(new Error("Sessie verlopen, log opnieuw in"), {status: 401});
  return r.json();
}

// Database met de service key (alleen op de server).
export async function db(pad, opties = {}) {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(env("SUPABASE_URL") + "/rest/v1/" + pad, {
    ...opties,
    headers: {apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", Prefer: "return=representation", ...(opties.headers || {})}
  });
  const t = await r.text();
  if (!r.ok) throw Object.assign(new Error("Database: " + r.status + " " + t.slice(0, 300)), {status: 502});
  return t ? JSON.parse(t) : null;
}

export function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch { return {}; }
}

// Adres van de site. Google-sleutels met een websitebeperking (HTTP referrer) accepteren alleen
// aanvragen die dit adres meesturen; vanaf de server sturen we het daarom zelf mee.
export function siteUrl() {
  const h = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "amzquote.vercel.app";
  return (h.startsWith("http") ? h : "https://" + h).replace(/\/?$/, "/");
}
