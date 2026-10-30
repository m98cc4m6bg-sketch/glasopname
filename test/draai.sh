#!/usr/bin/env bash
# Draait de tests van Glasopname in één keer en zegt per reeks goed of FOUT.
#
#   test/draai.sh kern       de snelle kern (±1–2 min); GitHub draait hem bij elke pull request
#   test/draai.sh batterij   de kern plus alle oudere reeksen (±30–60 min); GitHub draait hem elke nacht
#
# Werkt in de cloudomgeving van Claude en op GitHub (Actions) op dezelfde manier.
# Verwacht jsdom, jspdf, jspdf-autotable en playwright in /home/claude/node_modules
# en Chromium op /opt/pw-browsers/chromium (die paden staan vast in de reeksen;
# de workflows in .github/workflows/ zetten ze klaar).
#
# OUD = de map met wat nu live staat (voor test-overgang.js). Niet opgegeven:
# dan maakt dit script hem zelf uit origin/main (git archive).
# Stopt nooit halverwege: alle reeksen draaien, aan het eind volgt een overzicht.
# Eindcode 0 = alles goed, 1 = minstens één reeks FOUT (of overgeslagen).
#
# Herkansing (alleen bij "batterij", keuze Jan 28-10-2026): een rode reeks
# draait nog één keer. Goed bij de tweede keer = "goed (haperde)": zichtbaar in
# het overzicht, maar geen fout en dus geen mail. Twee keer rood = FOUT.
# Reden: de oudere reeksen wachten met vaste tijden en haperen soms op een
# computer van een andere snelheid (stap 3 van de strategie haalt die weg).
# De snelle kern ("kern") krijgt géén herkansing: die blijft streng.

set -u
cd "$(dirname "$0")/.."
WORTEL=$(pwd)
SOORT=${1:-kern}
LOGMAP=${LOGMAP:-$(mktemp -d /tmp/glasopname-testlog-XXXX)}
mkdir -p "$LOGMAP"
BUN=$(command -v bun || echo /root/.bun/bin/bun)

FOUTEN=0
HAPERDE=0
OVERZICHT=""
HERKANSING=0
[ "$SOORT" = batterij ] && HERKANSING=1

# Pakt een oude versie uit naar een map (eenmalig). Haalt de commit zo nodig
# op, want GitHub en de cloudomgeving hebben vaak maar een ondiepe kopie.
maak_oud() { # map commit
  local map=$1 commit=$2
  [ -f "$map/index.html" ] && return 0
  git cat-file -e "$commit^{commit}" 2>/dev/null || git fetch -q --depth=1 origin "$commit"
  mkdir -p "$map" && git archive "$commit" | tar -x -C "$map"
}

# Eén poging: commando naar het logbestand; zegt goed, FOUT of FOUT (overgeslagen).
poging() { # log commando...
  local log=$1; shift
  "$@" > "$log" 2>&1
  local code=$?
  # test-overgang.js slaat zichzelf over zonder OUD: dat telt hier als fout.
  if grep -q '^OVERGESLAGEN' "$log"; then echo "FOUT (overgeslagen)"
  elif [ $code -ne 0 ]; then echo "FOUT"
  else echo "goed"; fi
}

# Draait één reeks: naam, dan het commando. Uitvoer naar LOGMAP; bij FOUT de
# laatste 40 regels op het scherm. Bij een herkansing blijft de uitvoer van de
# eerste poging bewaard als <naam>.poging1.txt.
draai() {
  local naam=$1; shift
  local log="$LOGMAP/$naam.txt" begin eind duur status
  begin=$(date +%s)
  status=$(poging "$log" "$@")
  if [ "$status" = "FOUT" ] && [ $HERKANSING -eq 1 ]; then
    mv "$log" "$LOGMAP/$naam.poging1.txt"
    status=$(poging "$log" "$@")
    if [ "$status" = "goed" ]; then status="goed (haperde)"; HAPERDE=$((HAPERDE + 1)); fi
  fi
  eind=$(date +%s); duur=$((eind - begin))
  printf '%-28s %-20s %4ss\n' "$naam" "$status" "$duur"
  case "$status" in
    goed*) ;;
    *) FOUTEN=$((FOUTEN + 1))
       echo "  ---- laatste regels van $naam ----"; tail -n 40 "$log" | sed 's/^/  | /' ;;
  esac
  OVERZICHT="$OVERZICHT| $naam | $status | $duur s |"$'\n'
}

kern() {
  if [ -z "${OUD:-}" ]; then
    OUD=/tmp/glasopname-live
    rm -rf "$OUD"; mkdir -p "$OUD"
    # Vers ophalen; lukt dat niet (geen netwerk), dan de laatst bekende main.
    if git fetch -q --depth=1 origin main 2>/dev/null; then LIVE=FETCH_HEAD; else LIVE=origin/main; fi
    git archive "$LIVE" | tar -x -C "$OUD" || { echo "Kon wat live staat niet uitpakken ($LIVE)."; exit 1; }
  fi
  draai test-index          node test-index.js
  draai test-naslag         node test-naslag.js
  draai test-cloudguard     node test-cloudguard.js
  draai test-herstel        node test-herstel.js
  draai test-start          node test-start.js
  draai test-import         node test-import.js
  draai test-slot           node test-slot.js
  draai test-offline        node test-offline.js
  draai test-rook           node test-rook.js
  draai test-leverpagina    node test-leverpagina.js
  draai test-leverpagina.py python3 test-leverpagina.py
  draai test-overgang       env OUD="$OUD" node test-overgang.js
  draai test-mailfunctie    "$BUN" test-mailfunctie.ts
}

batterij() {
  # Oude versies die sommige reeksen nodig hebben (zie docs/testen.md).
  maak_oud /tmp/live109  b306e16fb9edd4ad8a5cdb5e96f68a9c628b23b8   # v109, voor test-v111
  maak_oud /tmp/v103live 3380dcf868d950f4bd1879051d5d62cc8a5693cc   # v103, voor test-v106
  maak_oud /tmp/live123  b9296d79511d2b0bd1969704e1fefda524cbe7e4   # v123, voor test-v124-werkpunten
  draai test-verbinding     node test-verbinding.js
  draai test-verwijderen    node test-verwijderen.js
  draai test-mail-en-slot   node test-mail-en-slot.js
  draai test-v91            node test-v91.js
  draai test-v93            node test-v93.js
  draai test-v98            node test-v98.js
  draai test-v98.py         python3 test-v98.py
  draai test-v99            node test-v99.js
  draai test-v102           node test-v102.js
  draai test-v103           node test-v103.js
  draai test-v104           node test-v104.js
  draai test-v105           node test-v105.js
  draai test-v106           env OUD105=/tmp/v103live node test-v106.js
  draai test-v109           node test-v109.js
  draai test-v110           node test-v110.js
  draai test-v111           env OUD=/tmp/live109 node test-v111.js
  draai test-v112           node test-v112.js
  draai test-v113           node test-v113.js
  draai test-v114           node test-v114.js
  draai test-v115           node test-v115.js
  draai test-v116           node test-v116.js
  draai test-v117           node test-v117.js
  draai test-v118           node test-v118.js
  draai test-v119           node test-v119.js
  draai test-v120           node test-v120.js
  draai test-v121           node test-v121.js
  draai test-v122           node test-v122.js
  draai test-v123           node test-v123.js
  draai test-v124-rechten   node test-v124-rechten.js
  draai test-v124-werkpunten env OUD123=/tmp/live123 node test-v124-werkpunten.js
  draai test-v124-herstel   node test-v124-herstel.js
  draai test-v124-tekeningen node test-v124-tekeningen.js
  draai test-v124-toebehoren node test-v124-toebehoren.js
  draai test-v124-cycli     node test-v124-cycli.js
  draai test-v125           node test-v125.js
}

START=$(date +%s)
case "$SOORT" in
  kern)     kern ;;
  batterij) kern; batterij ;;
  *) echo "Gebruik: test/draai.sh kern | batterij"; exit 2 ;;
esac
TOTAAL=$(( $(date +%s) - START ))

echo
DUUR="$SOORT, $((TOTAAL / 60)) min $((TOTAAL % 60)) s"
if [ $FOUTEN -eq 0 ]; then KOP="Alles goed ($DUUR)"
else KOP="$FOUTEN reeks(en) FOUT ($DUUR)"; fi
if [ $HAPERDE -gt 0 ]; then KOP="$KOP; $HAPERDE reeks(en) haperde(n) en ging(en) bij de herkansing goed"; fi
echo "$KOP"
echo "Uitvoer per reeks: $LOGMAP"

# Op GitHub: het overzicht ook bovenaan de pagina van de run.
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  { echo "### $KOP"; echo; echo "| reeks | uitslag | duur |"; echo "|---|---|---|"; printf '%s' "$OVERZICHT"; } >> "$GITHUB_STEP_SUMMARY"
fi
[ $FOUTEN -eq 0 ]
