#!/bin/bash
# Glasopname — foto's van de Duco-ventilatieroosters ophalen
#
# Zet de zes foto's verkleind in ./roosters/. Draai dit vanuit de hoofdmap
# van de repo, net als fotos-ophalen.sh:
#
#     bash roosterfotos-ophalen.sh
#
# Dit is hetzelfde script als fotos-ophalen.sh, alleen met een andere lijst
# en een andere map. Staan de bestanden er niet, dan haalt de app de foto's
# rechtstreeks bij Duco op — dan werkt de tabel wel, maar niet meer zonder
# bereik. Daarom toch even draaien.

exec bash "$(dirname "$0")/fotos-ophalen.sh" roosterfotos.txt roosters
