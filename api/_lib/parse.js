// Offerte-aanvraag uitlezen met Claude (Anthropic API). De tekst wordt alleen doorgestuurd, nergens bewaard.
export function prompt(tekst) {
  const jaar = new Date().getFullYear();
  return `Je leest een offerte-aanvraag voor een touringcarrit uit en geeft ALLEEN een JSON-object terug.

Regels:
- Neem datum, tijden, aantallen en namen letterlijk over uit de aanvraag. Verzin niets. Onbekend = lege string.
- Per rit "km": de rijafstand over de weg in hele kilometers van het vertrek- naar het aankomstadres, en "minuten": de rijtijd met de auto in minuten (zonder files). Geef getallen als je ze redelijk betrouwbaar kunt schatten, anders null.
- Per rit "kmPerLand": de kilometers per land langs de gebruikelijke route, met ISO-landcodes, bijv. {"NL": 120, "BE": 45}. Alleen Nederland: {"NL": <km>}.
- "soort": "Standaard rit" (brengen en/of halen, de bus wacht niet of kort), "Dagtocht" (de bus blijft de hele dag bij de groep) of "Meerdaagse reis" (meer dan één dag). Leeg als het echt niet te zeggen is.
- "klant": de NAW-gegevens van de aanvrager (naam, bedrijf/school/vereniging, straat + huisnummer, plaats, telefoon, e-mail). Een postcode is niet nodig.
- "ritten" zijn de ritten met passagiers, in volgorde. Een normale retour is 2 ritten (heen en terug). De vestiging in Borssele hoort er niet in.
- Elke rit staat precies ÉÉN keer in "ritten". Een retour is altijd precies 2 ritten, nooit 3. Herhaal de naam van een locatie niet in Adres of Stad.
- RETOUR: rit 1 gaat van het opstapadres naar de bestemming, rit 2 gaat van de bestemming TERUG naar het opstapadres (adressen omgedraaid). De genoemde retourtijd is de VERTREKTIJD vanaf de bestemming (type "vertrek"), tenzij er uitdrukkelijk staat dat de groep op die tijd weer thuis wil zijn. Voorbeeld: "52 personen van Goes, Joseph Lunslaan 5 naar Paulus Potterstraat 1 in Amsterdam, 08:00 vertrek, 16:00 retour" geeft rit 1: Goes, Joseph Lunslaan 5 -> Amsterdam, Paulus Potterstraat 1, tijd 08:00 vertrek; rit 2: Amsterdam, Paulus Potterstraat 1 -> Goes, Joseph Lunslaan 5, tijd 16:00 vertrek.
- "leegHeenKm": de rijafstand over de weg in hele kilometers van de vestiging (Quistenburg 8, 4454 PZ Borssele) naar het eerste opstapadres. "leegTerugKm": van het laatste afzetadres terug naar de vestiging. Geef een getal als je de afstand redelijk betrouwbaar kent, anders null. "leegHeenMin" en "leegTerugMin": de bijbehorende rijtijd met de auto in minuten, op dezelfde manier.
- Per rit "datum": de datum van die rit, ALTIJD geschreven als DD-MM-JJJJ (dag-maand-jaar), ook als de aanvraag hem andersom geeft (bijv. 2026-11-14 wordt 14-11-2026). Staat er geen jaar bij, dan is het ALTIJD het huidige jaar: ${jaar}. Staat er bij de terugreis (veld "terug", "retourdatum" e.d.) geen datum, dan is de terugrit op DEZELFDE dag als de heenrit: geef de terugrit dan dezelfde datum als de heenrit.
- "Thuiskomst" is de gewenste aankomsttijd terug bij het vertrekpunt: geef rit 2 (de terugrit) dan die tijd met type "aankomst".
- Per rit "tijd" als HH:MM (24-uurs) en "type": "vertrek" bij een vertrektijd, "aankomst" als de klant alleen een gewenste aankomsttijd noemt.
- Is de vertrektijd van de terugrit gelijk aan de vertrektijd van de heenrit (op dezelfde dag), neem de tijd dan letterlijk over en zet in nogNodig: "Vertrektijd retour is gelijk aan vertrektijd heen, juiste tijd navragen".
- Adressen, per kant (van/naar) vier losse velden: "Locatie" = alleen de naam van de plek (bijv. "Efteling", "VO Walcheren", "Rijksmuseum"), leeg als er geen naam is. "Adres" = PUUR straat + huisnummer, nooit een naam erin. "Postcode" = laat ALTIJD leeg, een postcode is niet nodig. "Stad" = plaatsnaam. Staat in de aanvraag "VO Walcheren, Joseph Lunslaan 5, Goes", dan is Locatie "VO Walcheren", Adres "Joseph Lunslaan 5", Stad "Goes".
- Zoek ontbrekende adresgegevens ALTIJD zelf op uit je kennis: wordt alleen een locatie genoemd (pretpark, dierentuin, museum, stadion, station, school, hotel, luchthaven), vul dan zelf het bezoekadres (straat + huisnummer) en de plaats in; een postcode is niet nodig. Voorbeelden: Efteling = Europalaan 1, Kaatsheuvel. Beekse Bergen = Beekse Bergen 31, Hilvarenbeek. Staat er wel een adres zonder postcode, dan is dat prima: niet aanvullen en niet melden. Zet vanGezocht/naarGezocht op true zodra je zelf iets hebt aangevuld. Alleen als je het adres echt niet kent: laat Adres leeg en meld het in nogNodig. Verzin geen huisnummer.
- "busWens": ALLEEN invullen als de klant zelf uitdrukkelijk om een bepaald type bus vraagt, en dan exact een van: "Club Coach", "Dubbeldekker", "Groepsvervoer bus", "Midibus", "Minibus", "Rolstoeltouringcar", "Touringcar", "Touringcar XL". Staat er "voordeligste optie", niets, of iets dat hier niet bij past: lege string; het bustype wordt dan automatisch gekozen. Een wens als "met toilet" is geen bustype maar hoort in wensen.
- Meld een ontbrekend jaar NIET in nogNodig.
- "wensen": relevante extra wensen en opmerkingen, kort (bijv. "Bus met toilet", "Geen bagage").
- "nogNodig": essentiële gegevens die ontbreken of onduidelijk zijn.
- Let op signalen als "bussen rijden heen en weer", "verschillende klassen/groepen", "meerdere ritten", "als dat goedkoper is": dit is dan geen normale retour. Maak dan zelf geen aantallen bussen of tijden, maar zet in nogNodig wat ontbreekt (aantal groepen, personen per groep, vertrektijden per groep, gewenste aankomst- en terugtijd) en neem alleen op als rit wat vaststaat.

- "isAanvraag": true als dit echt een vraag om een offerte of prijs voor busvervoer is; false bij nieuwsbrieven, facturen, bevestigingen, spam of andere mail.

Vorm:
{"isAanvraag":true,"klant":{"naam":"","bedrijf":"","adres":"","postcodePlaats":"","telefoon":"","email":""},"passagiers":"","soort":"","busWens":"","leegHeenKm":null,"leegTerugKm":null,"leegHeenMin":null,"leegTerugMin":null,"ritten":[{"datum":"","vanLocatie":"","vanAdres":"","vanPostcode":"","vanStad":"","vanGezocht":false,"naarLocatie":"","naarAdres":"","naarPostcode":"","naarStad":"","naarGezocht":false,"tijd":"","type":"vertrek","km":null,"minuten":null,"kmPerLand":{}}],"wensen":[""],"nogNodig":[""]}

Aanvraag:
` + "\n" + String(tekst || "").slice(0, 20000);
}

function eersteJson(t) {
  t = String(t || "").trim();
  try { return JSON.parse(t); } catch {}
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (f) { try { return JSON.parse(f[1]); } catch {} }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  throw new Error("Geen bruikbare JSON van Claude");
}

export async function leesAanvraag(tekst) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw Object.assign(new Error("ANTHROPIC_API_KEY ontbreekt in Vercel"), {status: 500});
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 4000,
      messages: [{role: "user", content: prompt(tekst)}]
    })
  });
  if (!r.ok) throw Object.assign(new Error("Anthropic API: " + r.status + " " + (await r.text()).slice(0, 300)), {status: 502});
  const j = await r.json();
  return eersteJson((j.content || []).filter(c => c.type === "text").map(c => c.text).join(""));
}
