#!/usr/bin/env bash
# CI only: runs inside reactivecircus/android-emulator-runner once the emulator has booted.
# Installs the APK, points its dev server at Metro on the host (10.0.2.2:8180, same as start-all.sh),
# turns animations off, then records this shard's pages. Never fails the job: a failed take is usually the doc defect.
set +e
cd "$(dirname "$0")/../.."
APK="${APK:-apk/app-debug.apk}"
export ANDROID_SERIAL="${ANDROID_SERIAL:-$(adb devices | awk '/emulator-/{print $1; exit}')}"
echo "device: $ANDROID_SERIAL"
for s in window_animation_scale transition_animation_scale animator_duration_scale; do adb shell settings put global $s 0; done
for i in 1 2 3 4 5; do adb install -r "$APK" 2>&1 | tee /tmp/install.log | grep -q Success && break; echo "install attempt $i failed"; sleep 10; done
# HARNESS: same command as start-all.sh: the APK's dev server host = Metro on the host machine
adb shell "run-as com.claudesdkts sh -c 'mkdir -p shared_prefs && echo \"<?xml version=\\\"1.0\\\" encoding=\\\"utf-8\\\" standalone=\\\"yes\\\" ?><map><string name=\\\"debug_http_host\\\">10.0.2.2:8180</string></map>\" > shared_prefs/com.claudesdkts_preferences.xml'"
adb shell "run-as com.claudesdkts cat shared_prefs/com.claudesdkts_preferences.xml"; echo
adb reverse tcp:8180 tcp:8180 || true   # belt and braces: localhost:8180 also reaches Metro
mkdir -p logs
# HARNESS: react-native-worklets Bundle Mode writes .worklets/<id>.js on the fly and Metro fails the first
# bundles with "Failed to get the SHA-1" (react-native-streamdown README, Bundle Mode step 3: "reload the app a
# few times"). Warm the bundle here until Metro serves it (HTTP 200), so the app opens on the first page.
BUNDLE_URL="http://localhost:8180/index.bundle?platform=android&dev=true&lazy=true&minify=false&app=com.claudesdkts&modulesOnly=false&runModule=true"
fails=0
for i in $(seq 1 15); do
  code=$(curl -s -o /tmp/bundle.js -w '%{http_code}' --max-time 300 "$BUNDLE_URL")
  echo "bundle warm attempt $i: HTTP $code ($(wc -c < /tmp/bundle.js) bytes)"
  [ "$code" = "200" ] && break
  echo "--- body (first 600 bytes) ---"; head -c 600 /tmp/bundle.js; echo; echo "---"
  fails=$((fails + 1))
  if [ "$fails" -ge 3 ]; then
    # HARNESS fallback: a fresh Metro indexes the .worklets/ files written so far (README: "reload a few times").
    echo "3 failed warm attempts in a row: restarting Metro on :8180"
    pkill -f "react-native start --port 8180" || true; sleep 3
    (cd MyCopilotApp && nohup npx react-native start --port 8180 >> ../logs/metro-8180.log 2>&1 &)
    for j in $(seq 1 60); do curl -s -o /dev/null http://localhost:8180/status && break; sleep 2; done
    fails=0
  fi
  sleep 3
done
adb logcat -v time > logs/logcat.log 2>&1 &
# HARNESS: wait for each page's runtime info route on :8183 (harness-runtime.ts) before the app asks for it;
# a 404 after 60 s is a real missing route, logged as such.
for id in $(echo "$PAGES" | tr ',' ' '); do
  for i in $(seq 1 30); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "http://localhost:8183/api/$id/copilotkit/info")
    [ "$code" = "200" ] && break; sleep 2
  done
  echo "runtime info /api/$id/copilotkit/info: HTTP $code (try $i)"
done
node autorecorder/scripts/write-versions.mjs 2>/dev/null || echo "::warning::write-versions failed or missing"
if [ "${MODE:-record}" = "probe" ]; then
  # Probe mode (WORKFLOW.md B1, owner 2026-11-19): 1 run per page; a page that failed (red box,
  # log errors, prompt not sent or no reply) gets a 2nd run. probe-android.mts writes out/probe/<id>/
  # fresh each call, so each run is moved to run<N>.
  IDS=$(echo "$PAGES" | tr ',' ' ')
  TSX=autorecorder/node_modules/.bin/tsx
  [ -x "$TSX" ] || TSX="npx -y tsx"
  mkdir -p out/probe-runs
  probe_run() { # $1 = run number, rest = page ids
    local r=$1; shift
    for id in "$@"; do
      $TSX tools/probe-android.mts "$id" 2>&1 | tee -a logs/probe.log
      if [ -d "out/probe/$id" ]; then mkdir -p "out/probe-runs/$id"; rm -rf "out/probe-runs/$id/run$r"; mv "out/probe/$id" "out/probe-runs/$id/run$r"; fi
    done
  }
  probe_run 1 $IDS
  FAILED=$(python3 - out/probe-runs $IDS <<'PY'
import json, sys
from pathlib import Path
root = Path(sys.argv[1])
for pid in sys.argv[2:]:
    f = root / pid / "run1" / "result.json"
    try:
        r = json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        print(pid); continue
    texts = r.get("screenTexts") or []
    before = set(r.get("textsBeforeSend") or [])
    prompted = any(str(s.get("s", "")).startswith("typed:") for s in r.get("steps", []))
    bad = (not r.get("appAlive") or not texts or r.get("redbox") or r.get("errors")
           or r.get("sent") is False or (prompted and not [t for t in texts if t not in before])
           or any(not x.get("ok") for x in r.get("followUps") or []))
    if bad: print(pid)
PY
)
  [ -n "$FAILED" ] && { echo "probe: 2nd run for failing pages: $FAILED"; probe_run 2 $FAILED; }
  rm -rf out/probe && mv out/probe-runs out/probe
  exit 0
fi
cd autorecorder
export FRONTEND_URL=http://localhost:8189  # HARNESS: device mirror off Metro's :8180 (EADDRINUSE in CI)
xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" \
  npm run record -- "--pages=$PAGES" 2>&1 | tee ../logs/record.log
echo "record exit=${PIPESTATUS[0]}"
exit 0
