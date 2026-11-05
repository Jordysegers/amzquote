# AMZ Offerte-inbox

Dashboard voor offerte-aanvragen van AMZ Touringcars: aanvragen uit de mail en telefoon, spoed, oppakken en doorgeven aan collega's, en per aanvraag het reisprogramma met kilometers, leegrit en chauffeur-arbeid.

- **Website**: `index.html` (geen bouwstap nodig)
- **Serverfuncties**: map `api/` (draaien op Vercel)
- **Database en inloggen**: Supabase

## Live zetten (eenmalig)

### 1. Supabase
1. Maak op [supabase.com](https://supabase.com) een nieuw project aan (regio: West EU / Frankfurt).
2. Ga naar **SQL Editor**, plak de inhoud van `supabase/schema.sql` en klik **Run**.
3. Ga naar **Authentication → Sign In / Providers** en zet **Allow new users to sign up** uit (alleen uitgenodigde collega's).
4. Ga naar **Authentication → Users → Add user → Create new user**, vul je eigen e-mail en wachtwoord in en vink **Auto Confirm User** aan.
5. Noteer bij **Project Settings → API**: de Project URL, de `anon` key en de `service_role` key.

### 2. Sleutels
- **Google Maps**: in [Google Cloud Console](https://console.cloud.google.com) een project, zet **Places API (New)** en **Routes API** aan, maak onder *Credentials* een API-sleutel.
- **Postcode**: je token van api-postcode.nl.
- **Anthropic**: een API-sleutel van [console.anthropic.com](https://console.anthropic.com).

### 3. Vercel
1. Op [vercel.com](https://vercel.com): **Add New → Project**, kies de GitHub-repository `amzquote`, framework **Other**, en klik **Deploy**.
2. Ga naar **Settings → Environment Variables** en voeg de waarden uit `.env.example` toe.
3. Ga naar **Deployments**, klik op de bovenste deployment → **Redeploy** (zodat de sleutels actief worden).
4. Terug in Supabase: **Authentication → URL Configuration**, zet **Site URL** op je Vercel-adres (bijv. `https://amzquote.vercel.app`).

Open nu je Vercel-adres en log in. Collega's nodig je uit via **Beheer → Collega uitnodigen**.

### 4. Mailbox koppelen (Microsoft 365) — later
1. In [Microsoft Entra](https://entra.microsoft.com): **App registrations → New registration** (naam bijv. *Offerte-inbox*).
2. **API permissions → Add → Microsoft Graph → Application permissions → Mail.Read**, daarna **Grant admin consent**.
3. **Certificates & secrets → New client secret**; noteer de waarde.
4. Zet in Vercel: `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_MAILBOX` (het adres waar aanvragen binnenkomen) en `CRON_SECRET` (zelf verzonnen lange tekst). Redeploy.
5. Tip: beperk de app tot alleen die ene mailbox met een *Application Access Policy* in Exchange Online.

Het dashboard controleert de mailbox elke 3 minuten zolang iemand het open heeft, en Vercel doet het daarnaast 1x per dag. Wil je ook elke 5 minuten zonder dat iemand kijkt: vul `supabase/mail-elke-5-minuten.sql` in en draai het in de SQL Editor.

## Privacy
E-mails worden alleen doorgegeven om uit te lezen en worden **niet** opgeslagen. In de database staan alleen de uitgelezen gegevens, het id van de mail (om dubbel inlezen te voorkomen) en een link om de mail in Outlook te openen.
