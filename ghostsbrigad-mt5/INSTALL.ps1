# ============================================================
#  GhostsBrigad - Installateur automatique MetaTrader 5
#  1. Trouve le(s) dossier(s) de donnees MT5
#  2. Copie Experts/GhostsBrigad, presets et scripts
#  3. Compile l'EA avec MetaEditor (si trouve)
# ============================================================
$ErrorActionPreference = "Stop"
$src = $PSScriptRoot

Write-Host ""
Write-Host "=== Installateur GhostsBrigad ===" -ForegroundColor Cyan

# --- 1. Verifier les fichiers source ------------------------
if (-not (Test-Path "$src\Experts\GhostsBrigad\GhostsBrigad_EA.mq5")) {
    Write-Host "ERREUR: lance ce script depuis le dossier ghostsbrigad-mt5 du ZIP." -ForegroundColor Red
    exit 1
}

# --- 2. Trouver les data folders MT5 -------------------------
$terminals = Get-ChildItem "$env:APPDATA\MetaQuotes\Terminal" -Directory -ErrorAction SilentlyContinue |
             Where-Object { Test-Path "$($_.FullName)\MQL5" }
if (-not $terminals) {
    Write-Host "ERREUR: aucun dossier MT5 trouve." -ForegroundColor Red
    Write-Host "Installe MetaTrader 5 (exness.com) et lance-le UNE fois, puis relance ce script."
    exit 1
}

$installed = 0
foreach ($t in $terminals) {
    $mql5 = "$($t.FullName)\MQL5"
    Write-Host ""
    Write-Host "MT5 trouve : $($t.Name)" -ForegroundColor Yellow

    # --- 3. Copier les fichiers ------------------------------
    New-Item -ItemType Directory -Force -Path "$mql5\Experts" | Out-Null
    Copy-Item "$src\Experts\GhostsBrigad" "$mql5\Experts\" -Recurse -Force
    Write-Host "  [OK] EA copie -> MQL5\Experts\GhostsBrigad"

    New-Item -ItemType Directory -Force -Path "$mql5\Presets" | Out-Null
    Copy-Item "$src\presets\*.set" "$mql5\Presets\" -Force
    Write-Host "  [OK] 3 presets copies -> MQL5\Presets"

    New-Item -ItemType Directory -Force -Path "$mql5\Scripts" | Out-Null
    Copy-Item "$src\Scripts\*.mq5" "$mql5\Scripts\" -Force
    Write-Host "  [OK] Script d'urgence copie -> MQL5\Scripts"

    # --- 4. Compiler avec MetaEditor --------------------------
    $editor = $null
    $originFile = "$($t.FullName)\origin.txt"
    if (Test-Path $originFile) {
        $origin = (Get-Content $originFile -Raw).Trim()
        if (Test-Path "$origin\metaeditor64.exe") { $editor = "$origin\metaeditor64.exe" }
    }
    if (-not $editor) {
        foreach ($guess in @("C:\Program Files\MetaTrader 5\metaeditor64.exe",
                             "C:\Program Files\MetaTrader 5 EXNESS\metaeditor64.exe")) {
            if (Test-Path $guess) { $editor = $guess; break }
        }
    }

    if ($editor) {
        Write-Host "  Compilation en cours..." -NoNewline
        $ea = "$mql5\Experts\GhostsBrigad\GhostsBrigad_EA.mq5"
        $log = "$env:TEMP\ghostsbrigad_compile.log"
        Start-Process -FilePath $editor -ArgumentList "/compile:`"$ea`"","/log:`"$log`"" -Wait -WindowStyle Hidden
        if (Test-Path "$mql5\Experts\GhostsBrigad\GhostsBrigad_EA.ex5") {
            Write-Host " [OK] GhostsBrigad_EA.ex5 genere !" -ForegroundColor Green
        } else {
            Write-Host " [!] Compilation a verifier : ouvre MetaEditor (F4) et compile (F7)." -ForegroundColor Yellow
            if (Test-Path $log) { Get-Content $log -Encoding Unicode | Select-Object -Last 5 }
        }
    } else {
        Write-Host "  [!] MetaEditor introuvable : ouvre MT5, touche F4, puis F7 sur GhostsBrigad_EA.mq5" -ForegroundColor Yellow
    }
    $installed++
}

# --- 5. Instructions finales ---------------------------------
Write-Host ""
Write-Host "=== Installation terminee ($installed terminal(aux)) ===" -ForegroundColor Green
Write-Host ""
Write-Host "Il te reste 3 gestes dans MT5 :" -ForegroundColor Cyan
Write-Host "  1. Outils > Options > Expert Advisors : coche 'Autoriser WebRequest'"
Write-Host "     et ajoute :  https://api.telegram.org"
Write-Host "  2. Glisse GhostsBrigad_EA (Ctrl+N > Experts) sur un graphique"
Write-Host "     XAUUSD M5 (ou BTCUSD M15), charge le preset correspondant,"
Write-Host "     colle ton token + chat id Telegram dans NOTIFICATIONS, OK."
Write-Host "  3. Active le bouton 'Algo Trading' (il doit etre vert)."
Write-Host ""
Write-Host "Puis envoie /status a ton bot Telegram pour verifier. Bon trading !"
