#!/bin/bash
# Glasopname — foto's van de glaslatten ophalen (v113)
#
# Haalt van elke productpagina van Jongeneel in latfotos.txt de productfoto
# op en zet die verkleind in ./latten/<id>.jpg. Draai dit vanuit de
# hoofdmap van de repo, op de Mac:
#
#     bash latfotos-ophalen.sh
#
# Anders dan bij fotos-ophalen.sh staat in de lijst niet de foto zelf, maar
# de productpagina: het adres van de foto verandert bij Jongeneel vaker dan
# dat van de pagina. Het script leest uit de pagina de foto die de site zelf
# opgeeft voor delen (og:image).
#
# Tegelijk schrijft het de titel van elke pagina in /tmp/latten-specs.txt.
# Leg die naast latten.js: klopt de maat in de titel (bijv. "17x15x4000mm")
# met de lat in de app? Zo niet, pas de maat in latten.js aan.
#
# Het script slaat over wat er al staat, dus opnieuw draaien kost niets.
# Wil je één foto vervangen, gooi dat bestand dan eerst weg.
#
# Geen foto? Dan tekent de app de doorsnede van de lat zelf. Lukt het script
# niet (de site weigert), open de productpagina in Safari, sla de foto op
# ("Bewaar afbeelding als…") en zet hem als latten/<id>.jpg neer.

set -u

LIJST="${1:-latfotos.txt}"
MAP="${2:-latten}"
SPECS="/tmp/latten-specs.txt"
BREEDTE=600
KWALITEIT=70
# Een gewone browser; sommige winkels geven een kale aanvraag geen pagina.
AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"

if [ ! -f "$LIJST" ]; then
  echo "Kan $LIJST niet vinden. Draai dit script vanuit de map waar dat bestand staat."
  exit 1
fi

mkdir -p "$MAP"
: > "$SPECS"

nieuw=0; over=0; mislukt=0
mislukte_namen=""
pagina="$(mktemp)"

while read -r naam url; do
  case "$naam" in ''|'#'*) continue ;; esac
  [ -z "${url:-}" ] && continue

  doel="$MAP/$naam.jpg"

  # Alleen https, ook na een doorverwijzing.
  if ! curl -fsSL --proto '=https' --proto-redir '=https' --retry 2 --max-time 60 -A "$AGENT" -o "$pagina" "$url"; then
    echo "$naam  (pagina niet op te halen)" >> "$SPECS"
    if [ ! -f "$doel" ]; then
      mislukt=$((mislukt + 1)); mislukte_namen="$mislukte_namen $naam"; printf 'x'
    fi
    continue
  fi

  # De titel, voor de controle van de maten.
  titel="$(tr '\n' ' ' < "$pagina" | sed -n 's/.*<title>\([^<]*\)<\/title>.*/\1/p' | sed 's/^ *//;s/ *$//')"
  echo "$naam  $titel" >> "$SPECS"

  if [ -f "$doel" ]; then
    over=$((over + 1))
    continue
  fi

  # De foto: og:image, anders twitter:image. Volgorde van de attributen
  # verschilt per site, dus beide kanten op zoeken.
  foto="$(tr '\n' ' ' < "$pagina" | grep -oE '<meta[^>]+(og:image|twitter:image)[^>]*>' | head -1 \
          | grep -oE 'content="[^"]+"' | head -1 | sed 's/^content="//;s/"$//' | sed 's/&amp;/\&/g')"
  case "$foto" in
    //*) foto="https:$foto" ;;
    /*)  foto="https://www.jongeneel.nl$foto" ;;
  esac

  # Alleen een https-adres (geen file:// of iets anders uit de pagina).
  case "$foto" in https://*) ;; *) foto="" ;; esac

  if [ -z "$foto" ]; then
    echo "   (geen foto gevonden op de pagina)" >> "$SPECS"
    mislukt=$((mislukt + 1)); mislukte_namen="$mislukte_namen $naam"; printf 'x'
    continue
  fi

  tijdelijk="$doel.bezig"
  if curl -fsSL --proto '=https' --proto-redir '=https' --retry 2 --max-time 60 -A "$AGENT" -o "$tijdelijk" "$foto"; then
    # Alleen een plaatje (jpeg, png of webp) gaat de map in; iets anders
    # (een foutpagina, of erger) wordt weggegooid.
    soort="$(file -b --mime-type "$tijdelijk" 2>/dev/null)"
    case "$soort" in
      image/jpeg|image/png|image/webp) ;;
      *) rm -f "$tijdelijk"; echo "   (geen plaatje: $soort)" >> "$SPECS"
         mislukt=$((mislukt + 1)); mislukte_namen="$mislukte_namen $naam"; printf 'x'; continue ;;
    esac
    if command -v sips >/dev/null 2>&1; then
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
    mislukt=$((mislukt + 1)); mislukte_namen="$mislukte_namen $naam"; printf 'x'
  fi
  # Rustig aan: niet 29 pagina's in één seconde.
  sleep 1
done < "$LIJST"

rm -f "$pagina"

echo
echo "Klaar. $nieuw nieuw, $over stonden er al, $mislukt mislukt."
echo "De titels staan in $SPECS: vergelijk de maten met latten.js."
if [ "$mislukt" -gt 0 ]; then
  echo "Mislukt:$mislukte_namen"
  echo "Open die pagina's in Safari en sla de foto zelf op als $MAP/<id>.jpg,"
  echo "of laat ze weg: de app tekent dan de doorsnede."
fi
