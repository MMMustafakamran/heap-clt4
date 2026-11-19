#!/usr/bin/env bash
# HARNESS: starts every Claude Agent SDK (TypeScript) React Native server on its harness port (never 3000/8000).
#   8180 Metro bundler            8181 Copilot Runtime (doc's server.ts, PORT=8181)
#   8182 Claude SDK quickstart agent (agent/src/agent-server.ts, verbatim from claude-sdk-typescript/quickstart)
#   8183 per-page Copilot Runtimes (harness-runtime.ts)   8184-8188 page agents (added per page)
# Emulator: AVD qa_pixel, headless. The app reaches the host at 10.0.2.2 (doc's own rule).
# Usage: bash start-all.sh            start servers + emulator + install/launch the app
#        NO_EMU=1 bash start-all.sh   servers only
cd "$(dirname "$0")"
mkdir -p logs
SDK="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"
ADB="$SDK/platform-tools/adb"

if [ -z "$NO_EMU" ] && ! "$ADB" devices | grep -q "emulator-"; then
  "$SDK/emulator/emulator" -avd qa_pixel -no-window -no-audio -no-boot-anim -memory 3072 -cores 2 \
    -gpu host > logs/emulator.log 2>&1 &  # HARNESS: swiftshader froze System UI (ANR) on this laptop
fi

# agent/.env holds ANTHROPIC_API_KEY + CLAUDE_MODEL + AGENT_PORT=8182 (doc's .env step; gitignored)
(cd agent && npx tsx src/agent-server.ts > ../logs/agent-8182.log 2>&1) &
# HARNESS: page agents (TS), one file per page group, one path per page (/<page-id>): agent/src/rn-<group>.ts
for g in chat:8184 genui:8185 state:8186 misc:8188; do
  f="agent/src/rn-${g%%:*}.ts"; p="${g##*:}"
  [ -f "$f" ] && (cd agent && AGENT_PORT=$p npx tsx "src/rn-${g%%:*}.ts" > "../logs/agent-$p.log" 2>&1) &
done
# Doc: `export OPENAI_API_KEY=sk-...` then `npx tsx server.ts`; the key comes from runtime.env (gitignored).
(cd MyCopilotApp && set -a && . ../runtime.env && set +a && PORT=8181 npx tsx server.ts > ../logs/runtime-8181.log 2>&1) &
# HARNESS: per-page runtimes (harness-runtime.ts) on :8183, at /api/<page-id>/copilotkit
(cd MyCopilotApp && set -a && . ../runtime.env && set +a && PORT=8183 npx tsx harness-runtime.ts > ../logs/runtimes-8183.log 2>&1) &
(cd MyCopilotApp && npx react-native start --port 8180 > ../logs/metro-8180.log 2>&1) &

if [ -z "$NO_EMU" ]; then
  "$ADB" wait-for-device
  until [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 3; done
  # HARNESS: the APK is built from a short-path copy (C:\rnc, see tools/build-apk.sh): the repo path is
  # past Windows' 260-char limit for the worklets CMake build. JS still comes from this repo via Metro.
  for s in window_animation_scale transition_animation_scale animator_duration_scale; do "$ADB" shell settings put global $s 0; done
  until "$ADB" install -r /c/rnc/android/app/build/outputs/apk/debug/app-debug.apk 2>&1 | grep -q Success; do sleep 10; done
  # HARNESS: the APK was built with the default Metro port; point its dev server at 10.0.2.2:8180
  "$ADB" shell "run-as com.claudesdkts sh -c 'mkdir -p shared_prefs && echo \"<?xml version=\\\"1.0\\\" encoding=\\\"utf-8\\\" standalone=\\\"yes\\\" ?><map><string name=\\\"debug_http_host\\\">10.0.2.2:8180</string></map>\" > shared_prefs/com.claudesdkts_preferences.xml'"
  echo "app installed; open a page: adb shell am start -a android.intent.action.VIEW -d copilotqaclt://page/<id> com.claudesdkts"
fi
wait
