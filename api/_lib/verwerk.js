// Zet het antwoord van Claude om naar een aanvraag in dezelfde vorm als het dashboard gebruikt,
// en vult adressen, kilometers (per land) en leegritten aan via Google Maps.
import {ritInfo} from "./geo.js";

const T = x => String(x ?? "").trim();
const BUSSEN = ["Club Coach","Dubbeldekker","Groepsvervoer bus","Midibus","Minibus","Rolstoeltouringcar","Touringcar","Touringcar XL"];
const SOORTEN = ["Standaard rit","Dagtocht","Meerdaagse reis"];
const MND = ["jan","feb","mrt|maa","apr","mei","jun","jul","aug","sep","okt","nov","dec"];

export function fmtDate(v) {
  const Y = String(new Date().getFullYear()), s = T(v), p2 = x => String(x).padStart(2, "0"); let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) return p2(m[3]) + "-" + p2(m[2]) + "-" + m[1];
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{4}|\d{2}))?$/))) return p2(m[1]) + "-" + p2(m[2]) + "-" + (m[3] ? (m[3].length === 2 ? "20" + m[3] : m[3]) : Y);
  if ((m = s.toLowerCase().match(/(\d{1,2})\s+([a-z]+)\.?(?:\s+(\d{4}))?/))) { const i = MND.findIndex(x => new RegExp("^(" + x + ")").test(m[2])); if (i >= 0) return p2(m[1]) + "-" + p2(i + 1) + "-" + (m[3] || Y); }
  return s;
}
const leeg = () => ({datum:"",vanLocatie:"",vanAdres:"",vanPostcode:"",vanStad:"",vanGezocht:false,naarLocatie:"",naarAdres:"",naarPostcode:"",naarStad:"",naarGezocht:false,tijd:"",type:"vertrek",km:"",duur:"",kmGeschat:false,kmLand:{}});
const hm = m => Math.floor(m / 60) + ":" + String(Math.round(m) % 60).padStart(2, "0");
const kant = (l, s) => [T(l[s + "Adres"]) || T(l[s + "Locatie"]), T(l[s + "Stad"])].filter(Boolean).join(", ");

export async function naarAanvraag(d) {
  const str = v => T(v), list = v => (Array.isArray(v) ? v : []).map(str).filter(Boolean).join("\n");
  let legs = (Array.isArray(d?.ritten) ? d.ritten : []).map(r => ({...leeg(),
    datum: fmtDate(r?.datum), vanLocatie: str(r?.vanLocatie), vanAdres: str(r?.vanAdres), vanStad: str(r?.vanStad),
    naarLocatie: str(r?.naarLocatie), naarAdres: str(r?.naarAdres), naarStad: str(r?.naarStad),
    tijd: /^\d{1,2}:\d{2}$/.test(str(r?.tijd)) ? str(r.tijd).padStart(5, "0") : "", type: r?.type === "aankomst" ? "aankomst" : "vertrek"}));
  const key = l => ["Locatie","Adres","Stad"].map(f => T(l["van" + f]) + ">" + T(l["naar" + f])).join("|").toLowerCase() + l.tijd + l.type + l.datum;
  legs = legs.filter((l, i) => i === 0 || key(l) !== key(legs[i - 1]));

  // Adressen, km en leegrit via Google Maps
  for (let i = 0; i < legs.length; i++) {
    const l = legs[i], van = kant(l, "van"), naar = kant(l, "naar");
    if (!van || !naar) continue;
    try {
      const info = await ritInfo(van, naar, {leegHeen: i === 0, leegTerug: i === legs.length - 1});
      for (const s of ["van", "naar"]) { const o = info[s]; if (o?.gevonden && o.adres) { l[s + "Adres"] = o.adres; l[s + "Stad"] = o.stad || l[s + "Stad"]; l[s + "Locatie"] = ""; l[s + "Gezocht"] = true; } }
      if (info.km) { l.km = String(info.km); l.duur = hm(info.minuten); l.kmLand = info.kmPerLand || {}; l.kmGeschat = true; }
      if (i === 0 && info.leegHeenKm) { d._lh = info.leegHeenKm; d._lhm = info.leegHeenMin; }
      if (i === legs.length - 1 && info.leegTerugKm) { d._lt = info.leegTerugKm; d._ltm = info.leegTerugMin; }
    } catch (e) { console.error("route", e.message); }
  }

  // Gewone retour => één rit met vinkje "terugweg is hetzelfde"
  let retour = false, rT = "", rD = "", rType = "vertrek";
  if (legs.length === 2) {
    const [a, b] = legs, q = (l, s) => ["Adres","Stad"].map(f => T(l[s + f]).toLowerCase()).join("|");
    if (q(b, "van") === q(a, "naar") && q(b, "naar") === q(a, "van")) { retour = true; rT = b.tijd; rType = b.type; rD = b.datum === a.datum ? "" : b.datum; legs = [a]; }
  }
  const k = {}; for (const f of ["naam","bedrijf","adres","postcodePlaats","telefoon","email"]) k[f] = str(d?.klant?.[f]);
  return {
    klant: k, pax: str(d?.passagiers), busWens: BUSSEN.includes(str(d?.busWens)) ? str(d.busWens) : "",
    soort: SOORTEN.includes(str(d?.soort)) ? str(d.soort) : "",
    wensen: list(d?.wensen), nodig: list(d?.nogNodig), notities: "",
    tel: {vertrekpunt:"", bestemming:"", thuiskomst:"", programma:""},
    leegHeen: d._lh ? String(d._lh) : "", leegHeenDuur: d._lhm ? hm(d._lhm) : "",
    leegTerug: !retour && d._lt ? String(d._lt) : "", leegTerugDuur: !retour && d._ltm ? hm(d._ltm) : "",
    leegGeschat: !!d._lh, leegAfw: false, retour, retourType: rType, retourTijd: rT, retourDatum: rD,
    legs: legs.length ? legs : [leeg()]
  };
}
