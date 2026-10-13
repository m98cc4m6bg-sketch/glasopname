-- ══════════════════════════════════════════════════════════════
--  Glasopname v96 – opbouwlijsten opschonen
--  Plak dit in Supabase → SQL Editor → Run. Vóór je de bestanden
--  van v96 in GitHub zet.
--
--  Keuzes van Jan (13 oktober 2026). Een opbouw lees je van binnen
--  naar buiten: in 4-13-5 is de 4 het binnenblad (met de HR-coating)
--  en de 5 het buitenblad.
--
--  Dit script past alleen deze typen aan: HR glas, HR+ glas, HR++ glas,
--  HR+++ glas (Triple) en Zonwerend glas. En daarin alleen opbouwen die
--  buiten én binnen floatglas zijn (alleen cijfers). Bij gelaagd glas
--  betekent de richting iets (gelaagd binnen of buiten), dus daar blijft
--  alles staan.
--
--   1. Dubbelen weg. 5-13-4 is dezelfde ruit als 4-13-5, alleen
--      omgekeerd. Alleen de variant met het dunne blad binnen blijft.
--   2. Omdraaien. Staat een combinatie er alleen met het dikke blad
--      binnen (bijv. 8-13-4), dan wordt hij omgedraaid (4-13-8). De
--      combinatie blijft dus bestaan.
--   3. HR++: geen spouw boven 16 mm (18, 20 en 24 mm eruit). Leverbaar
--      is het wel, maar geen standaard, en de isolatie wordt slechter.
--   4. HR+++ (triple): alleen spouwen vanaf 9 mm (8 mm is geen HR+++) en
--      alleen een middenblad van 4 mm.
--
--  Dikte en gewicht (lookup) van een omgedraaide opbouw worden
--  overgenomen van de oude naam. De oude namen blijven in de lookup
--  staan: projecten die ze al gebruiken, houden hun dikte en gewicht,
--  en zien de oude waarde gewoon terug in de keuzelijst.
--
--  Veilig om nog eens te draaien: de tweede keer verandert er niets.
-- ══════════════════════════════════════════════════════════════

create or replace function pg_temp.opbouw_norm(t text, o text)
returns text language plpgsql immutable as $$
declare
  zw boolean := (t = 'Zonwerend glas' and o like '% ZW');
  kern text := case when (t = 'Zonwerend glas' and o like '% ZW') then left(o, length(o) - 3) else o end;
  d text[];
  n int;
  i int;
begin
  if t not in ('HR glas', 'HR+ glas', 'HR++ glas', 'HR+++ glas (Triple)', 'Zonwerend glas') then
    return o;
  end if;
  d := string_to_array(kern, '-');
  n := coalesce(array_length(d, 1), 0);
  if n < 3 or exists (select 1 from unnest(d) x where x !~ '^\d+$') then
    return o;                                   -- gelaagd, akoestisch e.d.: niet aankomen
  end if;
  -- spouwen staan op de even posities (2, 4) in de reeks
  for i in 2..n by 2 loop
    if t = 'HR++ glas' and d[i]::int > 16 then return null; end if;
    if t = 'HR+++ glas (Triple)' and d[i]::int < 9 then return null; end if;
  end loop;
  if t = 'HR+++ glas (Triple)' and d[3] <> '4' then return null; end if;
  if d[1]::int > d[n]::int then
    return (select string_agg(d[j], '-' order by j desc) from generate_series(1, n) j)
           || case when zw then ' ZW' else '' end;
  end if;
  return o;
end $$;

-- Sorteersleutel: eerst de bladen, dan de hele reeks.
create or replace function pg_temp.opbouw_sleutel(o text)
returns int[] language sql immutable as $$
  select array(select x::int from unnest(string_to_array(o, '-')) with ordinality u(x, i) where i % 2 = 1 order by i)
      || array(select x::int from unnest(string_to_array(o, '-')) with ordinality u(x, i) order by i)
$$;

-- 1. Dikte en gewicht van omgedraaide opbouwen overnemen.
update public.app_data a
   set waarde = jsonb_set(a.waarde, '{lookup}',
         (a.waarde -> 'lookup') || coalesce((
           select jsonb_object_agg(s.t || '|' || s.n, a.waarde -> 'lookup' -> (s.t || '|' || s.o))
             from (select l.key as t, e.o, pg_temp.opbouw_norm(l.key, e.o) as n
                     from jsonb_each(a.waarde -> 'opbouw_per_type') l,
                          jsonb_array_elements_text(l.value) e(o)) s
            where s.n is not null and s.n <> s.o
              and not ((a.waarde -> 'lookup') ? (s.t || '|' || s.n))
              and (a.waarde -> 'lookup') ? (s.t || '|' || s.o)
         ), '{}'::jsonb)),
       updated_at = now()
 where a.key = 'glas_data'
   and a.waarde ? 'lookup' and a.waarde ? 'opbouw_per_type';

-- 2. De lijsten zelf.
update public.app_data a
   set waarde = jsonb_set(a.waarde, '{opbouw_per_type}', (
         select jsonb_object_agg(l.key, coalesce((
           select jsonb_agg(v.n order by
                    case when l.key in ('HR glas', 'HR+ glas', 'HR++ glas', 'HR+++ glas (Triple)')
                         then pg_temp.opbouw_sleutel(v.n) end,
                    v.eerste)
             from (select pg_temp.opbouw_norm(l.key, e.o) as n, min(e.i) as eerste
                     from jsonb_array_elements_text(l.value) with ordinality e(o, i)
                    group by 1) v
            where v.n is not null), '[]'::jsonb))
           from jsonb_each(a.waarde -> 'opbouw_per_type') l)),
       updated_at = now()
 where a.key = 'glas_data'
   and a.waarde ? 'opbouw_per_type';

-- Controle: het aantal opbouwen per type. Hoort te zijn (als de lijst
-- gelijk was aan die van de app): HR glas 32, HR+ glas 30, HR++ glas 45,
-- HR+++ glas (Triple) 70, Zonwerend glas 50; de rest ongewijzigd.
select l.key as glastype, jsonb_array_length(l.value) as aantal
  from public.app_data a, jsonb_each(a.waarde -> 'opbouw_per_type') l
 where a.key = 'glas_data'
 order by 1;
