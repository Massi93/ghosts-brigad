@echo off
:: ============================================================
::  GhostsBrigad - Installateur automatique pour MetaTrader 5
::  Double-clique ce fichier : il copie le bot dans MT5 et le
::  compile. MT5 doit avoir ete lance au moins une fois.
:: ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALL.ps1"
pause
