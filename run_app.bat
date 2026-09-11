@echo off
title Tra Frames - Launcher
echo ========================================================
echo        Starting Tra Frames Web Application...
echo ========================================================
echo.
echo Launching local server via PowerShell...
powershell -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Server could not be bound, opening index.html directly...
    start "" "%~dp0index.html"
)
pause
