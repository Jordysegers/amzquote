-- AMZ Offerte-inbox: database
-- Plak dit hele bestand in Supabase > SQL Editor en klik op Run.

-- Collega's: één rij per gebruiker die kan inloggen
create table if not exists public.collegas (
  id uuid primary key references auth.users on delete cascade,
  naam text not null default '',
  kleur text not null default '#1d3a8a',
  email text,
  aangemaakt timestamptz not null default now()
);

-- Nieuwe gebruiker in Supabase Auth => automatisch een collega
create or replace function public.nieuwe_collega() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.collegas (id, naam, email, kleur)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'naam', initcap(split_part(new.email, '@', 1))),
          new.email,
          (array['#0b7a5a','#c2410c','#7c3aed','#0e7490','#be185d','#4d7c0f','#b45309','#1d4ed8'])[1 + floor(random() * 8)::int])
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists bij_nieuwe_gebruiker on auth.users;
create trigger bij_nieuwe_gebruiker after insert on auth.users
  for each row execute function public.nieuwe_collega();

-- Aanvragen
create table if not exists public.aanvragen (
  id uuid primary key default gen_random_uuid(),
  bron text not null default 'E-mail',
  ontvangen timestamptz not null default now(),
  status text not null default 'Nieuw',
  toegewezen uuid references public.collegas(id) on delete set null,
  door uuid references public.collegas(id) on delete set null,
  bericht text not null default '',
  data jsonb not null default '{}'::jsonb,
  log jsonb not null default '[]'::jsonb,
  gewijzigd timestamptz not null default now(),
  sessie text,
  bewerkt_door text,
  mail_id text unique,          -- id van de e-mail in Outlook (alleen om dubbel inlezen te voorkomen)
  mail_link text                -- link om de e-mail in Outlook te openen
);
create index if not exists aanvragen_ontvangen on public.aanvragen (ontvangen desc);

-- E-mails die al bekeken zijn (ook als het geen offerte-aanvraag was). Alleen het id, geen inhoud.
create table if not exists public.verwerkte_mails (
  mail_id text primary key,
  verwerkt timestamptz not null default now(),
  was_aanvraag boolean not null default false
);

-- Instellingen (één rij)
create table if not exists public.instellingen (
  id int primary key default 1 check (id = 1),
  spoed_klanten text not null default '',
  spoed_dagen int not null default 14,
  spoed_pax int not null default 150
);
insert into public.instellingen (id) values (1) on conflict (id) do nothing;

-- Toegang: alleen ingelogde collega's
alter table public.collegas enable row level security;
alter table public.aanvragen enable row level security;
alter table public.instellingen enable row level security;
alter table public.verwerkte_mails enable row level security;

drop policy if exists "collegas lezen" on public.collegas;
create policy "collegas lezen" on public.collegas for select to authenticated using (true);
drop policy if exists "collegas wijzigen" on public.collegas;
create policy "collegas wijzigen" on public.collegas for update to authenticated using (true) with check (true);

drop policy if exists "aanvragen alles" on public.aanvragen;
create policy "aanvragen alles" on public.aanvragen for all to authenticated using (true) with check (true);

drop policy if exists "instellingen lezen" on public.instellingen;
create policy "instellingen lezen" on public.instellingen for select to authenticated using (true);
drop policy if exists "instellingen wijzigen" on public.instellingen;
create policy "instellingen wijzigen" on public.instellingen for update to authenticated using (true) with check (true);
-- verwerkte_mails: geen policies, alleen de server (service key) komt erbij

-- Live bijwerken voor alle collega's
do $$ begin
  begin alter publication supabase_realtime add table public.aanvragen; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.collegas; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.instellingen; exception when duplicate_object then null; end;
end $$;
