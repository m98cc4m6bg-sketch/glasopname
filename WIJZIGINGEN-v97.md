# Glasopname v97 — nieuw icoon

*13 oktober 2026. Keuze van Jan: richting D (huisje met ruit en rolmaat),
op alle plekken.*

## Installeren — in deze volgorde

1. **SQL:** staat v96 nog niet live, draai dan eerst `20_opbouwlijsten.sql`
   (zie `WIJZIGINGEN-v96.md`). Voor v97 zelf is er geen SQL.
2. **Bestanden:** dit is het **complete pakket** (inclusief v95 en v96),
   zonder `config.js`. Open de map `glasopname` uit de zip, druk op
   **Cmd+Shift+.**, selecteer alles wat erín staat en sleep het naar je
   repomap. Kies overal *Vervang*. Niet de map `glasopname` zelf.
3. Commit en push, daarna ↻ Bijwerken; linksboven staat v97.

## Wat er verandert

Het icoon is overal hetzelfde nieuwe ontwerp: het rode huisje van Jelier
Bouw (ongewijzigd overgetrokken), met daarin een blauwe ruit en een
rolmaat met geel lint.

| bestand | waar | formaat |
|---|---|---|
| `favicon.ico` | browsertab | 16, 32 en 48 px in één bestand |
| `favicon.png` | browsertab (scherp scherm) | 96 px, doorzichtig |
| `apple-touch-icon.png` | beginscherm iPhone/iPad | 180 px, witte achtergrond |
| `icon-192.png`, `icon-512.png` | geïnstalleerde app (Android, Chrome) | witte achtergrond |
| `icoon-bron.svg` | nieuw: de bron, voor later aanpassen | vector |

## Goed om te weten

* **Browsers bewaren een favicon lang.** Zie je in de tab nog het oude
  huisje, herlaad dan met Cmd+Shift+R of wacht een dag.
* **Het icoon op het beginscherm van de iPad of iPhone** verandert pas als
  je de app van het beginscherm haalt en opnieuw toevoegt (Safari → Deel →
  Zet op beginscherm). Haal hem alleen weg als de wachtteller bovenaan leeg
  is: foto's die nog wachten op uploaden staan alleen op dat apparaat.

## Getest

Twee keer de hele batterij, alles groen. De iconen zijn in Chromium
getekend vanuit `icoon-bron.svg` en daarna verkleind; ik heb ze op alle
formaten bekeken.

**Niet getest:** hoe Safari en iOS het nieuwe icoon tonen (afgeronde hoeken
op het beginscherm, het opnieuw ophalen van de favicon).
