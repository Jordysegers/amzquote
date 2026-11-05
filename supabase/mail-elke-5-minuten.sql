-- OPTIONEEL: mailbox elke 5 minuten laten controleren (Vercel gratis kan maar 1x per dag).
-- Vervang de twee waarden hieronder en plak dit in Supabase > SQL Editor.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('offerte-mailbox', '*/5 * * * *', $$
  select net.http_get(
    url := 'https://JOUW-SITE.vercel.app/api/mail-sync',
    headers := jsonb_build_object('Authorization', 'Bearer JOUW_CRON_SECRET')
  );
$$);
-- Stoppen: select cron.unschedule('offerte-mailbox');
