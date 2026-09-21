# Glasopname v82 — logo in de pdf, en "Exporteer alles" in Safari

## 1. Logo liep door de rode lijn

De onderkant van het logo (AANNEMERSBEDRIJF) eindigde precies op de rode
lijn onder de kop, en die lijn is 0,6 mm dik. Zo liep hij half door de
tekst. Het logo staat nu **1,3 mm hoger** en eindigt ruim boven de lijn.
De lijn zelf en alles eronder staan waar ze stonden, dus de indeling van
de pagina verandert niet. Dit geldt voor alle pagina's: bestellijst,
vervolgpagina's, leverpagina en inmeting.

## 2. "Exporteer alles" gaf alleen de inmeting

*Exporteer alles* maakt twee losse pdf's: eerst de **bestellijst (met
leverpagina)**, dan de **inmeting met foto's**. De app liet ze allebei
in één klap downloaden. Safari laat van downloads die zo direct na
elkaar starten er vaak maar één door, de laatste. Die van jou was dus de
inmeting.

Nu gaan ze **één voor één, met anderhalve seconde ertussen**. De
bestellijst komt eerst, dan de inmeting.

Het kan zijn dat Safari de eerste keer vraagt of deze website meerdere
bestanden mag downloaden. Kies dan **Sta toe**.

In Chrome en Edge verandert er niets: daar kies je bij *Exporteer alles*
een map, en beide bestanden komen daar in één keer in.

## Getest

`test-export.js` is **nieuw**. Het draait de echte app in Chromium,
zonder map- of opslagvenster zoals in Safari, en doet *Exporteer alles*.
Het vangt de downloads op en leest de pdf's na met pdfplumber.

| controle | v81 | v82 |
|---|---|---|
| twee bestanden gedownload | ja | ja |
| met Safari-gedrag (alleen de laatste van een snelle reeks telt) | **alleen de inmeting** | bestellijst én inmeting |
| bestellijst bevat de leverpagina | ja | ja |
| ruimte tussen logo en rode lijn | **−0,05 mm** (overlap) | 1,45 mm |

Alle veertien reeksen groen. De kop visueel nagekeken: oud en nieuw naast
elkaar gerenderd.

**Niet getest:** Safari zelf. Het Safari-gedrag is in de test
nagebootst. De oorzaak past precies bij wat je zag, maar check na het
online zetten even of beide bestanden in Downloads staan.

## Bijwerken

`pdf.js`, `index.html`, `sw.js` — versie **v82** in alle drie. Geen SQL.
`config.js` niet aanraken.
