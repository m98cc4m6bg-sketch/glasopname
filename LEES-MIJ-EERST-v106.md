# Glasopname v106: compleet pakket

Dit is de **hele app** in stand v106, met alles van v104 en v105 erin. Er
zitten in:

- alle bestanden;
- de map `lib/`, compleet;
- alle SQL-scripts;
- de tests en de nota's.

Alleen `config.js` zit er niet in; die staat al goed in je repo.

## Plaatsen

1. **Eerst de SQL.** Ga in Supabase naar de **SQL Editor**.
   1. Heb je `23_bestellingen.sql` (v104/v105) nog niet gedraaid? Plak die
      dan eerst en kies **Run**.
   2. Plak de inhoud van `24_bewerkslot.sql` en kies **Run**. Er moet
      *Success* staan.
2. Open de map `glasopname` uit deze zip en druk op **Cmd+Shift+.** Dan
   worden ook de verborgen bestanden (`.gitignore`, `.github`) zichtbaar.
3. Selecteer alles wat erín staat (Cmd+A) en sleep dat naar je repomap. Kies
   overal **Vervang**. Sleep níet de map `glasopname` zelf over je repomap:
   dan is `config.js` weg.
4. Commit en push. De apparaten werken vanzelf bij.

Script 24 is een wijziging in de database (🔴). Wat het doet, wat er mis kan
gaan en hoe je het terugdraait (één regel), staat in `WIJZIGINGEN-v106.md`.
Draai je het niet, dan werkt de app zoals v105, en het startscherm herinnert
je eraan.

## Zelf controleren (5 minuten, twee apparaten)

1. Open een project op de Mac, en daarna hetzelfde project op de iPad. Op de
   iPad staat: "julian (Mac) heeft dit project open … Je kunt alleen
   kijken", met ‹Toch bewerken›.
2. Tik op de iPad op **Toch bewerken**. Op de Mac komt een venster met een
   balk die in 10 seconden leegloopt; daarna gaat de Mac op slot en kan de
   iPad bewerken.
3. Zet de iPad in vliegtuigmodus en wijzig iets. Kies op de Mac ‹Toch
   bewerken›, wacht op "reageert niet" en kies **Overnemen**. Wijzig iets op
   de Mac en ga terug naar het startscherm. Zet de iPad weer online: daar
   staat "Je werk staat apart", en in de projectenlijst staat een project
   "… apart bewaard" met de wijziging van de iPad. Het project zelf heeft de
   stand van de Mac.

Wat er veranderd is: `WIJZIGINGEN-v106.md`.
