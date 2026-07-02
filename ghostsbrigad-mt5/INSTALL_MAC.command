#!/bin/bash
# ============================================================
#  GhostsBrigad - Installateur automatique pour MT5 sur macOS
#  Prerequis : MetaTrader 5 pour Mac installe (dmg Exness ou
#  MetaQuotes) et lance au moins une fois.
#  Ouvrir avec : clic droit > Ouvrir (1ere fois, Gatekeeper)
# ============================================================
cd "$(dirname "$0")"

echo ""
echo "=== Installateur GhostsBrigad (macOS) ==="

if [ ! -f "Experts/GhostsBrigad/GhostsBrigad_EA.mq5" ]; then
  echo "ERREUR : lance ce script depuis le dossier ghostsbrigad-mt5 du ZIP."
  read -p "Appuie sur Entree pour fermer..."; exit 1
fi

# MT5 pour Mac est un paquet Wine : le dossier MQL5 vit dans la
# "bouteille" Wine, sous ~/Library/Application Support
FOUND=0
for MQL5 in \
  "$HOME/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5/MQL5" \
  "$HOME/Library/Application Support/"*"/drive_c/Program Files/MetaTrader"*"/MQL5" \
  "$HOME/Library/Application Support/MetaTrader 5/Bottles/metatrader5/drive_c/Program Files/MetaTrader 5/MQL5" ; do
  [ -d "$MQL5" ] || continue
  FOUND=1
  echo ""
  echo "MT5 trouve : $MQL5"

  mkdir -p "$MQL5/Experts" "$MQL5/Presets" "$MQL5/Scripts"
  cp -R "Experts/GhostsBrigad" "$MQL5/Experts/"
  echo "  [OK] EA copie -> MQL5/Experts/GhostsBrigad"
  cp presets/*.set "$MQL5/Presets/"
  echo "  [OK] 3 presets copies -> MQL5/Presets"
  cp Scripts/*.mq5 "$MQL5/Scripts/"
  echo "  [OK] Script d'urgence copie -> MQL5/Scripts"
done

if [ $FOUND -eq 0 ]; then
  echo ""
  echo "ERREUR : dossier MT5 introuvable."
  echo "1. Installe MetaTrader 5 pour macOS (espace Exness > Plateformes)"
  echo "2. Lance-le UNE fois, puis relance ce script."
  echo "(Sinon : dans MT5, Fichier > Ouvrir le dossier des donnees,"
  echo " et copie Experts/, presets/ et Scripts/ a la main dans MQL5/)"
  read -p "Appuie sur Entree pour fermer..."; exit 1
fi

echo ""
echo "=== Fichiers installes ! Il reste 3 gestes dans MT5 : ==="
echo "  1. Touche F4 (MetaEditor) > ouvre GhostsBrigad_EA.mq5 > touche F7"
echo "     -> '0 erreur' attendu (la compilation ne peut pas etre"
echo "     automatisee sur Mac, mais c'est un seul raccourci clavier)"
echo "  2. Outils > Options > Expert Advisors > 'Autoriser WebRequest'"
echo "     + ajoute : https://api.telegram.org"
echo "  3. Glisse GhostsBrigad_EA sur XAUUSD M5 (ou BTCUSD M15),"
echo "     charge le preset, colle ton token/chat id Telegram, OK,"
echo "     bouton Algo Trading vert."
echo ""
read -p "Appuie sur Entree pour fermer..."
