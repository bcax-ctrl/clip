@echo off
REM ---------------------------------------------------------------------------
REM launch_tv_debug.bat
REM
REM Launches the TradingView Desktop app (an Electron app) with Chrome DevTools
REM Protocol remote debugging enabled, so an MCP server / Playwright / any CDP
REM client can attach on the debug port and drive charts, indicators, Pine
REM scripts, screenshots, etc.
REM
REM Usage:  scripts\launch_tv_debug.bat  [port]
REM Default port: 9222
REM ---------------------------------------------------------------------------
setlocal enableextensions

set "DEBUG_PORT=%~1"
if "%DEBUG_PORT%"=="" set "DEBUG_PORT=9222"
set "USER_DATA_DIR=%TEMP%\tv-debug-profile"

REM --- Locate TradingView.exe in the usual install locations -----------------
set "TV_EXE="
if exist "%LOCALAPPDATA%\Programs\TradingView\TradingView.exe" set "TV_EXE=%LOCALAPPDATA%\Programs\TradingView\TradingView.exe"
if exist "%ProgramFiles%\TradingView\TradingView.exe"          set "TV_EXE=%ProgramFiles%\TradingView\TradingView.exe"
if exist "%ProgramFiles(x86)%\TradingView\TradingView.exe"     set "TV_EXE=%ProgramFiles(x86)%\TradingView\TradingView.exe"

if not defined TV_EXE (
  echo [ERROR] Could not find TradingView.exe in the usual locations:
  echo         %%LOCALAPPDATA%%\Programs\TradingView\
  echo         %%ProgramFiles%%\TradingView\
  echo         %%ProgramFiles(x86)%%\TradingView\
  echo.
  echo Install the TradingView Desktop app, or edit TV_EXE at the top of this script.
  exit /b 1
)

echo Launching TradingView Desktop with remote debugging on port %DEBUG_PORT% ...
echo   exe:     %TV_EXE%
echo   profile: %USER_DATA_DIR%
echo.

start "" "%TV_EXE%" --remote-debugging-port=%DEBUG_PORT% --user-data-dir="%USER_DATA_DIR%"

echo Started. Verify the CDP endpoint is up:
echo   curl http://127.0.0.1:%DEBUG_PORT%/json/version
echo.
echo Then point your MCP server at CDP_URL=http://127.0.0.1:%DEBUG_PORT%
endlocal
