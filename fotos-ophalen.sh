#!/bin/bash
# Glasopname — foto's van de glascatalogus ophalen
#
# Haalt de foto's uit de online showroom van Van Noordenne op en zet ze
# verkleind in ./catalogus/. Draai dit vanuit de hoofdmap van de repo:
#
#     bash fotos-ophalen.sh
#
# Met twee argumenten haalt hetzelfde script een andere lijst op, in een
# andere map:
#
#     bash fotos-ophalen.sh roosterfotos.txt roosters
#
# Verkleinen gebeurt met sips, dat standaard op een Mac staat. Zonder sips
# worden de originelen bewaard; dat werkt ook, maar de map wordt dan een
# stuk groter en de service worker moet meer opslaan voor offline gebruik.
#
# Het script slaat over wat er al staat, dus opnieuw draaien kost niets.
# Wil je één foto vervangen, gooi dat bestand dan eerst weg.

set -u

# Welke lijst en welke map: standaard de glascatalogus, maar met twee
# argumenten haalt hetzelfde script ook de foto's van de Duco-roosters op.
#
#     bash fotos-ophalen.sh                            # glascatalogus
#     bash fotos-ophalen.sh roosterfotos.txt roosters  # Duco-roosters
LIJST="${1:-catalogus-fotos.txt}"
MAP="${2:-catalogus}"
BREEDTE=600          # pixels; genoeg om het patroon te zien op een retina-scherm
KWALITEIT=70         # jpeg-kwaliteit bij verkleinen

if [ ! -f "$LIJST" ]; then
  echo "Kan $LIJST niet vinden. Draai dit script vanuit de map waar dat bestand staat."
  exit 1
fi

mkdir -p "$MAP"

nieuw=0; over=0; mislukt=0
mislukte_namen=""

while read -r naam url; do
  # kop- en lege regels overslaan
  case "$naam" in ''|'#'*) continue ;; esac
  [ -z "${url:-}" ] && continue

  doel="$MAP/$naam.jpg"
  if [ -f "$doel" ]; then
    over=$((over + 1))
    continue
  fi

  tijdelijk="$doel.bezig"
  if curl -fsSL --retry 2 --max-time 60 -o "$tijdelijk" "$url"; then
    if command -v sips >/dev/null 2>&1; then
      # sips schrijft naar hetzelfde bestand; formaat afdwingen omdat de
      # bron soms al jpeg en soms iets anders is
      sips -s format jpeg -s formatOptions "$KWALITEIT" \
           -Z "$BREEDTE" "$tijdelijk" --out "$doel" >/dev/null 2>&1 \
        || mv "$tijdelijk" "$doel"
      [ -f "$tijdelijk" ] && rm -f "$tijdelijk"
    else
      mv "$tijdelijk" "$doel"
    fi
    nieuw=$((nieuw + 1))
    printf '.'
  else
    rm -f "$tijdelijk"
    mislukt=$((mislukt + 1))
    mislukte_namen="$mislukte_namen $naam"
    printf 'x'
  fi
done < "$LIJST"

echo
echo "Klaar. $nieuw nieuw, $over stonden er al, $mislukt mislukt."
if [ "$mislukt" -gt 0 ]; then
  echo "Mislukt:$mislukte_namen"
  echo "Waarschijnlijk is die foto op hun site vervangen. Zoek de nieuwe URL"
  echo "in de showroom en pas $LIJST aan."
fi

if ! command -v sips >/dev/null 2>&1; then
  echo "Let op: sips niet gevonden, de foto's zijn op ware grootte bewaard."
fi

echo "Totale omvang: $(du -sh "$MAP" | cut -f1)"
