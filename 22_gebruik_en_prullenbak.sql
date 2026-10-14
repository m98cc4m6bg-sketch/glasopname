-- ══════════════════════════════════════════════════════════════
--  Glasopname v103 – ruimte bewaken en de prullenbak op de klok van
--  de server
--  Plak dit in Supabase → SQL Editor → Run. Vóór je de bestanden
--  van v103 in GitHub zet.
--
--  Harde eis van Jan: nooit gegevens kwijt, en niets mag stilzwijgend
--  verdwijnen. Twee dingen:
--
--  1. glas_gebruik(): hoeveel ruimte de database en de foto-opslag
--     gebruiken. Het gratis plan heeft 500 MB database en 1 GB opslag.
--     Raakt de database vol, dan zet Supabase hem op alleen-lezen en
--     gaat er niets meer omhoog; raakt de opslag vol, dan blijven
--     foto's op de apparaten wachten. De app waarschuwt nu vanaf 80%,
--     vóórdat het zover is. (Een ingelogde gebruiker mag de tabel met
--     bestanden niet zelf optellen; daarom deze functie, die alleen
--     twee getallen teruggeeft.)
--
--  2. De prullenbak rekende met de klok van het apparaat. Stond die
--     een maand vooruit, dan werd bij het openen van het startscherm de
--     hele prullenbak definitief leeggemaakt, met foto's. Nu:
--     - verwijderd_op zet de database zelf (now()), welk tijdstip de
--       app ook stuurt;
--     - welke projecten oud genoeg zijn om op te ruimen, bepaalt de
--       database (prullenbak_opruimbaar), met zijn eigen klok.
--
--  Veilig om nog eens te draaien.
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Gebruik ──────────────────────────────────────────────
create or replace function public.glas_gebruik()
returns json
language sql
stable
security definer
set search_path = public, storage, pg_catalog
as $$
  select json_build_object(
    'database_bytes', pg_database_size(current_database()),
    'opslag_bytes', coalesce((
        select sum(coalesce((o.metadata ->> 'size')::bigint, 0))
          from storage.objects o
         where o.bucket_id = 'projectfotos'), 0),
    'opslag_bestanden', coalesce((
        select count(*) from storage.objects o where o.bucket_id = 'projectfotos'), 0),
    'gemeten_op', now()
  );
$$;

revoke all on function public.glas_gebruik() from public, anon;
grant execute on function public.glas_gebruik() to authenticated;

-- ─── 2. Prullenbak op de klok van de server ──────────────────
create or replace function public.prullenbak_servertijd()
returns trigger
language plpgsql
as $$
begin
  -- Naar de prullenbak: het tijdstip van de server, niet van het apparaat.
  if old.verwijderd_op is null and new.verwijderd_op is not null then
    new.verwijderd_op := now();
  end if;
  -- Een tijdstip dat al stond, kan de app niet verschuiven (zo kan een
  -- apparaat een project ook niet 'ouder' maken dan het is).
  if old.verwijderd_op is not null and new.verwijderd_op is not null
     and new.verwijderd_op is distinct from old.verwijderd_op then
    new.verwijderd_op := old.verwijderd_op;
  end if;
  return new;
end;
$$;

drop trigger if exists projecten_prullenbak_servertijd on public.projecten;
create trigger projecten_prullenbak_servertijd
  before update of verwijderd_op on public.projecten
  for each row execute function public.prullenbak_servertijd();

-- Welke projecten staan langer dan `dagen` in de prullenbak? Met de klok
-- van de database. De app ruimt alleen deze op.
create or replace function public.prullenbak_opruimbaar(dagen integer default 30)
returns table (id uuid)
language sql
stable
as $$
  select p.id
    from public.projecten p
   where p.verwijderd_op is not null
     and p.verwijderd_op < now() - make_interval(days => greatest(dagen, 1));
$$;

revoke all on function public.prullenbak_opruimbaar(integer) from public, anon;
grant execute on function public.prullenbak_opruimbaar(integer) to authenticated;

-- ─── Controle ────────────────────────────────────────────────
-- select public.glas_gebruik();
-- select * from public.prullenbak_opruimbaar(30);
