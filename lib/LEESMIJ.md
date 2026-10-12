# lib/ — de bibliotheken van de app

Sinds v91 staan deze bestanden in de repo in plaats van dat ze van
`cdn.jsdelivr.net` komen. Twee redenen:

* **Offline.** De service worker zet ze bij elke nieuwe versie meteen in zijn
  cache (`SHELL` in `sw.js`). Tot v90 kwamen ze pas bij het eerste gebruik in
  de cache, en die cache wordt bij elke update weggegooid: de eerste pdf of
  import na een update kon dan alleen met bereik.
* **Vaste versie.** Supabase kwam als `@2`, dus elke update van de app haalde
  stilzwijgend de nieuwste 2.x op. Nu verandert er niets tenzij iemand het
  hier verandert.

| map | pakket | versie | licentie | gebruikt door |
|---|---|---|---|---|
| `supabase-js-2.117.2/` | @supabase/supabase-js (`dist/umd/supabase.js`) | 2.117.2 | MIT | index.html |
| `jspdf-2.5.2/` | jspdf (`dist/jspdf.umd.min.js`) | 2.5.2 | MIT | pdf.js |
| `jspdf-autotable-3.8.4/` | jspdf-autotable (`dist/…autotable.min.js`) | 3.8.4 | MIT | pdf.js |
| `xlsx-0.18.5/` | xlsx / SheetJS (`dist/xlsx.full.min.js`) | 0.18.5 | Apache-2.0 | import.js |
| `pdfjs-3.11.174/` | pdfjs-dist (`build/pdf.min.js` + worker) | 3.11.174 | Apache-2.0 | import.js, fotos.js |
| `jszip-3.10.1/` | jszip (`dist/jszip.min.js`) | 3.10.1 | MIT of GPL-3.0 (naar keuze; wij gebruiken MIT) | originelen.js (sinds v93) |

De bestanden zijn ongewijzigd overgenomen uit het npm-pakket van die versie.

## Een bibliotheek bijwerken

1. Nieuwe map met het nieuwe versienummer in de naam, bestand erin. De oude
   map pas weghalen als alles werkt.
2. Het pad aanpassen op de plek uit de tabel (`index.html`, `pdf.js`,
   `import.js` of `originelen.js`) **én** in de lijst `SHELL` in `sw.js`.
3. De drie versienummers van de app ophogen, zoals altijd.
4. Testen: inloggen, een project openen, een pdf maken, een import doen —
   en één keer zonder bereik.
