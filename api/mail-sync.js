// Haalt nieuwe mails uit de Microsoft 365-mailbox, laat offerte-aanvragen uitlezen en zet ze in het dashboard.
// De mailtekst wordt alleen doorgegeven aan Claude om uit te lezen en wordt NIET bewaard;
// in de database komen alleen de uitgelezen gegevens, het mail-id en een link naar de mail in Outlook.
import {stuur, fout, ingelogd, db, env} from "./_lib/server.js";
import {leesAanvraag} from "./_lib/parse.js";
import {naarAanvraag} from "./_lib/verwerk.js";

export const config = {maxDuration: 60};
const PER_RONDE = 3;   // per aanroep maximaal zoveel mails uitlezen (blijft binnen de tijdslimiet van Vercel)

async function graphToken() {
  const r = await fetch("https://login.microsoftonline.com/" + env("MS_TENANT_ID") + "/oauth2/v2.0/token", {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: new URLSearchParams({client_id: env("MS_CLIENT_ID"), client_secret: env("MS_CLIENT_SECRET"),
                               scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials"})
  });
  if (!r.ok) throw Object.assign(new Error("Microsoft-login mislukt: " + (await r.text()).slice(0, 200)), {status: 502});
  return (await r.json()).access_token;
}

export default async function handler(req, res) {
  try {
    const cron = process.env.CRON_SECRET && req.headers.authorization === "Bearer " + process.env.CRON_SECRET;
    if (!cron) await ingelogd(req);
    if (!process.env.MS_TENANT_ID) return stuur(res, 200, {nieuw: 0, melding: "Mailbox nog niet gekoppeld"});

    const token = await graphToken();
    const dagen = parseInt(process.env.MAIL_DAGEN || "3", 10);
    const sinds = new Date(Date.now() - dagen * 864e5).toISOString();
    const map = process.env.MS_MAP || "inbox";
    const url = "https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(env("MS_MAILBOX")) + "/mailFolders/" + encodeURIComponent(map) +
      "/messages?$top=40&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,webLink,body" +
      "&$filter=receivedDateTime ge " + sinds;
    const r = await fetch(url, {headers: {Authorization: "Bearer " + token, Prefer: 'outlook.body-content-type="text"'}});
    if (!r.ok) throw Object.assign(new Error("Mailbox lezen mislukt: " + r.status + " " + (await r.text()).slice(0, 200)), {status: 502});
    const mails = (await r.json()).value || [];
    if (!mails.length) return stuur(res, 200, {nieuw: 0, bekeken: 0});

    const ids = mails.map(m => m.id);
    const gehad = await db("verwerkte_mails?select=mail_id&mail_id=in.(" + ids.map(i => '"' + i.replace(/"/g, "") + '"').join(",") + ")");
    const al = new Set((gehad || []).map(x => x.mail_id));
    const todo = mails.filter(m => !al.has(m.id)).reverse().slice(0, PER_RONDE);   // oudste eerst

    let nieuw = 0;
    for (const m of todo) {
      const tekst = "Onderwerp: " + (m.subject || "") + "\nVan: " + (m.from?.emailAddress?.name || "") + " <" + (m.from?.emailAddress?.address || "") + ">\n\n" + (m.body?.content || "");
      let d;
      try { d = await leesAanvraag(tekst); } catch (e) { console.error("uitlezen", e.message); continue; }   // volgende ronde opnieuw proberen
      if (d && d.isAanvraag !== false) {
        const data = await naarAanvraag(d);
        if (!data.klant.email && m.from?.emailAddress?.address) data.klant.email = m.from.emailAddress.address;
        await db("aanvragen?on_conflict=mail_id", {
          method: "POST", headers: {Prefer: "resolution=ignore-duplicates,return=minimal"},
          body: JSON.stringify({bron: "E-mail", ontvangen: m.receivedDateTime, status: "Nieuw", data, mail_id: m.id, mail_link: m.webLink || null,
                                log: [{t: new Date().toISOString(), tekst: "Automatisch uit de mailbox uitgelezen"}], sessie: "mailbox", bewerkt_door: "Mailbox"})
        });
        nieuw++;
      }
      await db("verwerkte_mails?on_conflict=mail_id", {method: "POST", headers: {Prefer: "resolution=ignore-duplicates,return=minimal"},
        body: JSON.stringify({mail_id: m.id, was_aanvraag: !!(d && d.isAanvraag !== false)})});
    }
    stuur(res, 200, {nieuw, bekeken: todo.length, wachtend: Math.max(0, mails.filter(m => !al.has(m.id)).length - todo.length)});
  } catch (e) { fout(res, e); }
}
