#!/usr/bin/env bash
# HARNESS: build the debug APK from a short-path copy (C:\rnc). The repo path is too long for Windows'
# 260-char limit in react-native-worklets' CMake build (ninja: mkdir ... No such file or directory).
# Rerun after any native change (new native package, android/ edit). JS-only changes need no rebuild.
# Usage: bash tools/build-apk.sh        (LIST_ONLY=1 shows what robocopy would copy, no build)
set -e
cd "$(dirname "$0")/.."
SRC="$(cygpath -w "$PWD/MyCopilotApp")"
# robocopy called directly (no cmd.exe //c quoting); MSYS path conversion off so the Windows paths and
# /switches reach it as written. Only the app's own android build dirs and .cxx are skipped, never a bare
# `build` (that would also drop node_modules/*/build, which the native build needs).
set +e
MSYS2_ARG_CONV_EXCL='*' robocopy "$SRC" 'C:\rnc' /MIR \
  /XD "$SRC\android\app\build" "$SRC\android\build" "$SRC\android\.gradle" .cxx \
  /NFL /NDL /NJH /NP /MT:4 ${LIST_ONLY:+/L}
rc=$?
set -e
[ "$rc" -lt 8 ] || { echo "robocopy failed (exit $rc)"; exit "$rc"; }
[ -n "$LIST_ONLY" ] && exit 0
cd /c/rnc/android && ./gradlew.bat assembleDebug --no-daemon
