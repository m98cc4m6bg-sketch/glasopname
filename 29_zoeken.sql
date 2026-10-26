-- ═══════════════════════════════════════════════════════════════════
-- 29_zoeken.sql — Glasopname v123 (26-10-2026)
--
-- Draaien in Supabase: SQL Editor → New query → dit hele bestand plakken
-- → Run. Los van script 28; nog een keer draaien kan geen kwaad.
-- Niet verplicht: zonder dit script zoekt de app zoals in v122 (plus de
-- klantnaam), alleen dan niet zonder accenten.
--
-- Wat het doet, in gewone woorden (keuze Jan, 26-10-2026):
--  Zoeken op het startscherm vindt een project ook
--   - op de klantnaam (Project info → Klantnaam);
--   - zonder accenten en hoofdletters: "eenhoorn" vindt "Éénhoorn";
--   - met meer woorden in willekeurige volgorde: "verhoef dordrecht"
--     vindt een project met Verhoef in de naam en Dordrecht in het adres.
--  Er verandert niets aan de gegevens. De zoekfunctie mag alleen zien wat
--  de collega die zoekt ook mag zien (dezelfde regels als de lijst zelf).
--
-- Terugdraaien (er gaat niets verloren):
--   drop function if exists public.glas_zoek_projecten(text, text);
-- De app zoekt daarna weer zoals zonder dit script.
-- ═══════════════════════════════════════════════════════════════════

-- unaccent haalt de accenten weg (é → e). Een standaard-uitbreiding van
-- PostgreSQL die Supabase meelevert, in het schema "extensions". Staat hij
-- al aan in een ander schema dan extensions of public, dan stopt dit script
-- met een fout ("function unaccent does not exist"); er verandert dan niets
-- en de app zoekt zoals zonder script 29.
create extension if not exists unaccent with schema extensions;

create or replace function public.glas_zoek_projecten(zoek text, sortering text default 'gewijzigd')
returns table (
  id uuid, naam text, datum text, status text, aantal_ruiten integer, adres text,
  open_taken integer, updated_at timestamptz, created_at timestamptz,
  gewijzigd_naam text, totaal bigint
)
language sql
stable
-- security invoker (de standaard): de regels van de tabel projecten
-- gelden gewoon, dus je vindt alleen wat je ook in de lijst zou zien.
set search_path = pg_catalog, extensions, public
as $$
  with woorden as (
    -- De zoektekst in losse woorden, zonder accenten en hoofdletters. % en _
    -- zijn bij "like" jokers; die tellen hier als spatie.
    select w
      from regexp_split_to_table(
             lower(unaccent(regexp_replace(coalesce(zoek, ''), '[%_\\]', ' ', 'g'))),
             '\s+') as w
     where w <> ''
  ),
  gevonden as (
    select p.*
      from public.projecten p
     where p.verwijderd_op is null
       and not exists (
         select 1 from woorden
          where lower(unaccent(concat_ws(' ', p.naam, p.datum, p.adres,
                                         p.data #>> '{info,klant}')))
                not like '%' || woorden.w || '%')
  )
  -- Elk veld met een vast type: dan klopt het antwoord ook als een kolom in
  -- Supabase net een ander getaltype heeft dan hier verwacht.
  select g.id::uuid, g.naam::text, g.datum::text, g.status::text, g.aantal_ruiten::integer,
         g.adres::text, g.open_taken::integer, g.updated_at::timestamptz,
         g.created_at::timestamptz, g.gewijzigd_naam::text,
         count(*) over () as totaal
    from gevonden g
   order by
     case when sortering = 'alfabet' then lower(unaccent(g.naam)) end asc,
     case when sortering = 'aangemaakt' then g.created_at end desc,
     g.updated_at desc
   limit 1000;
$$;
revoke all on function public.glas_zoek_projecten(text, text) from public, anon;
grant execute on function public.glas_zoek_projecten(text, text) to authenticated;

-- Klaar. Proef: zoek op een deel van een projectnaam (zonder accent).
select 'zoekfunctie staat klaar' as klaar;
