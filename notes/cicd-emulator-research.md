# CI/CD and emulator research (heap-clt4, React Native on Android)

Written 2026-11-19. Read-only analysis: nothing in the repo was changed, nothing dispatched.
Line numbers refer to `.github/workflows/daily.yml` in **this** repo (heap-clt4) unless marked `ntg4`.
heap-clt4 has no Actions runs yet, so every timing comes from the sister repo heap-ntg4, which uses the same workflow (its diff is only secrets, ports and agent env).

> Limits and pricing in section 2 are taken from GitHub's docs as I know them up to mid-2026. Check the linked pages before you rely on an exact number.

## TL;DR: top 5 actions, ranked by impact

1. **Stop local filming and local probes on the laptop, and use CI (`mode=probe`) as the default probe loop.** A warm ntg4 run takes 16–18 min wall time for every page, with 4 KVM shards in parallel. Each shard boots the emulator from a cached snapshot in under 1 min and records about 10 min of pages. Locally, one probe takes about 200 s and the emulator hangs after a few hours. CI minutes are free for a public repo. Saves hours per day.
2. **Key the APK cache on native inputs only** (line 289). Today the key hashes `package-lock.json` *after* today's resolved lockfile is copied in (line 281). So every new CopilotKit / AG-UI release, which is pure JS, forces a 14.5 min cold Gradle build (ntg4 run 44320725997: Build APK 14:08→14:22). A debug APK loads its JS from Metro, so only native packages matter. Hash `android/**` (excluding `build/`), `app.json`, and a list of native deps (`node_modules/*/android/**` or `npx expo-modules-autolinking resolve` + `react-native config` output). Saves about 14 min on most version-bump days.
3. **Remove the local `C:\rnc` copy:** enable Win32 long paths, `git config --system core.longpaths true`, and use `subst R: <repo>` or a short clone path for the CMake/Ninja part. Then switch the emulator to an **ATD image** (`aosp_atd`, API 34/35, x86_64) with `-no-snapshot-save -no-boot-anim -no-audio -gpu host -memory 3072 -cores 4`, WHPX on, density 320, animations off. This should cut the ANRs and cut boot plus probe time roughly in half. ATD has no Play Services and a trimmed System UI, which is what was triggering the "Process system isn't responding" ANRs.
4. **Faster cold Gradle build in CI** (line 330, gradle.properties `org.gradle.workers.max=1`). Pass `-Dorg.gradle.workers.max=4 --build-cache --configuration-cache` (or use `gradle/actions/setup-gradle@v4` in place of the hand-rolled cache at lines 314–323), and add a ccache/`.cxx` cache for the worklets/reanimated CMake output. The runner has 4 vCPU and 16 GB, but the build uses 1 worker. Expected: cold build 14.5 → about 6–8 min.
5. **Cache the system image and the Playwright apt deps, and fix the node_modules cache miss on shard 1.** In ntg4 run 44352517313, shard 1 spent 3 min 27 s on "Install dependencies" while shards 2 and 3 took 13 s: a cache restore-key race or miss. Add `$ANDROID_HOME/system-images/android-36/google_apis/x86_64` to the AVD cache (line 465–471). Move `playwright install --with-deps` (line 416) to `playwright install chromium` plus a cached `install-deps`, or use the `mcr.microsoft.com/playwright` deps list. Saves about 1–4 min per shard.

---

## 1. CI analysis

### 1.1 Pipeline shape (both repos, same structure)

| Job | runs-on | timeout | What it does |
|---|---|---|---|
| `plan` (l.59) | ubuntu-latest | default 360 | recorder `npm ci`, uv, `versions.mjs` (latest CopilotKit/AG-UI), drift, shard matrix from cached `page-durations.json` |
| `build` (l.261) | ubuntu-latest | 75 | APK cache → (miss) setup-node/java17/android, node_modules cache, `npm install`, Gradle cache, `assembleDebug -PreactNativeArchitectures=x86_64 --no-daemon` |
| `record` (l.344) | ubuntu-latest, matrix, `fail-fast: false` | 170 | uv sync, node_modules+Playwright cache, `npm install`, `playwright install --with-deps`, `NO_EMU=1 start-all.sh`, KVM udev, AVD cache, emulator-runner (snapshot create on miss), `emulator-record.sh`, clip checks, upload shard |
| `report` (l.543) | ubuntu-latest | 90 | ffmpeg cache, merge shards, durations cache save, narration fit/mix, upload `run-<date>`, delete shard artifacts |

Shards: the default is 4. With `pages=` set it is `ceil(pages/3)`, at most 20. Pages are balanced longest-first onto the least-loaded bin, using the previous run's measured durations (unknown pages get the median), plus isolated single-page shards (l.224–247). That is a sound strategy. The only weakness is that every shard pays about 5–6 min of fixed setup, so shards with less than ~5 min of recording are waste.

### 1.2 Timings (heap-ntg4)

Last 9 runs (all `workflow_dispatch`, 2026-11-18): 15m35s – 33m23s, one cancelled.

**Warm run 44352517313 (18m04s, APK cache hit):**

| Step | Shard 1 | Shard 2 | Shard 3 |
|---|---|---|---|
| plan job total | 57 s (of which `versions.mjs` 36 s) | | |
| build job total | 14 s (APK **hit**) | | |
| checkout, setup-node, uv, uv sync | ~20 s | ~15 s | ~10 s |
| Cache node_modules + Playwright | 14 s | 21 s | 13 s |
| Install dependencies (npm install + playwright --with-deps) | **3 m 27 s** (miss/partial) | 14 s | 13 s |
| Start servers | 22 s | 36 s | 22 s |
| Cache AVD snapshot (restore) | 55 s | 50 s | 41 s |
| Record on the emulator (boot + system image + pages) | **10 m 15 s** | 11 m 21 s | 10 m 00 s |
| Clip checks | 28 s | 43 s | 30 s |
| report job | 25 s | | |

**Cold run 44320725997 (32m36s, APK cache miss):** Build APK alone took **14 m 30 s** (14:08:04 → 14:22:34). Then 4 record shards ran 13–16 min each. So the APK build is ~45 % of wall time on any day the APK key changes.

Cache hits and misses:
- APK: hit on the 18m run, miss on the 32/33m runs. The key includes the resolved `package-lock.json`, so it misses whenever a dependency moves.
- node_modules: a stable key on the committed lockfile with restore-keys (l.404). Hit on shards 2 and 3, slow on shard 1. Concurrent shards can't save the same key (only the first save wins), and a partial restore-key hit makes `npm install` do real work. Pre-warm it in `build`/`plan` and make record shards `actions/cache/restore` only.
- AVD snapshot: hit (41–55 s to restore, likely 1–2 GB). The system image itself is **not** in the cached paths, so the emulator-runner fetches it via sdkmanager inside "Record on the emulator". That is probably 30–90 s of the 10 min (confirm from the step log).
- ffmpeg and page-durations caches: hit, negligible time.

Failure points seen or likely:
- One cancelled run (44340600990, 25 min), dispatched over by a newer one.
- `emulator-boot-timeout: 900` hides slow boots. A cold boot on swiftshader can take 3–6 min.
- `-no-snapshot-save` on record plus `force-avd-creation: false` is correct. But the snapshot is created with `disable-animations: false` and then animations are disabled at record time, which is fine.
- Playwright `--with-deps` apt calls are the flakiest network step (already retried 3x, l.416).

### 1.3 Where the minutes go

| Bucket | Warm day | Cold day |
|---|---|---|
| APK build | 0 | 14.5 min (1 runner) |
| Per-shard fixed setup (checkout → servers) | ~1–4 min | same |
| AVD restore + boot | ~1 min restore + boot inside record step (~1–2 min) | +3–6 min on a snapshot miss |
| npm/uv install | 13 s – 3.5 min | same |
| Actual recording | ~8–9 min per shard | same |

Billable total for a warm 3-shard run is about 45 runner-min, and about 75 for a cold 4-shard run. Both are free on a public repo.

### 1.4 Concrete optimizations (file · line · expected saving)

| # | Change | Where | Saves |
|---|---|---|---|
| 1 | APK key on native inputs only: drop the resolved `package-lock.json`, and hash `android/**` (excluding `build/`), `app.json`, `babel.config.js` is JS-only (drop it), plus a generated list of autolinked native packages with versions | daily.yml l.282–289 | ~14 min on every JS-only bump day |
| 2 | Use `gradle/actions/setup-gradle@v4` (build cache + configuration cache, saves per-branch) in place of the manual cache. Pass `-Dorg.gradle.workers.max=4 --build-cache --configuration-cache`. Drop `--no-daemon` (a single invocation doesn't matter, but it blocks config-cache reuse) | l.314–330; gradle.properties `org.gradle.workers.max=1` (CI override only, keep the local 1 if RAM-bound) | cold 14.5 → ~6–8 min |
| 3 | ccache for CMake (worklets/reanimated/hermes): `hendrikmuhs/ccache-action`, `CMAKE_CXX_COMPILER_LAUNCHER=ccache` via `ANDROID_CCACHE` or the `externalNativeBuild` args | build job | another 2–4 min on a cold build |
| 4 | Cache the system image: add `/usr/local/lib/android/sdk/system-images/android-36/google_apis/x86_64` to the AVD cache paths | l.465–471 | 30–90 s per shard |
| 5 | Move node_modules install to one job (build) and **save** there. In record use `actions/cache/restore@v4` with the exact key, never restore-keys | l.398–404 | up to 3 min on the unlucky shard |
| 6 | `playwright install chromium` plus a separately cached apt step (or `apt-get install` of the fixed list from `npx playwright install-deps --dry-run`) | l.416 | 20–60 s, fewer flakes |
| 7 | Consider an ATD image in CI: `target: aosp_atd`, `api-level: 34` or 35 (ATD stops at 35 as of my knowledge), `arch: x86_64`, `channel: canary` not needed for 34/35. It boots faster and uses less RAM. **Caveat:** the doc targets the RN 0.88 minSdk/targetSdk 36; check `minSdkVersion`. A 34/35 device runs a target-36 APK fine as long as minSdk ≤ 34 | l.476/492 | ~30–60 s boot, steadier UI |
| 8 | Skip the separate "Create AVD snapshot" runner call on a hit (already done) and add `-no-metrics -no-audio`. On the snapshot-create call, add `-memory 3072` to match | l.481/497 | small |
| 9 | Fewer, longer shards for small runs: `ceil(pages/4)` rather than `/3` once fixed setup is ~5 min | l.224 | runner-minutes, not wall time |
| 10 | Upload one APK artifact with `retention-days: 1` and shard artifacts with `retention-days: 1` (they are deleted anyway) | build/record upload steps | storage quota |

---

## 2. GitHub Actions limits (relevant to this pipeline)

| Item | Value | Bites us? |
|---|---|---|
| Minutes, public repo, standard GitHub-hosted runners | Free and unlimited | No. Keep heap-clt4 public |
| Concurrent jobs | Free: 20 (max 5 macOS). Pro: 40. Team: 60. Enterprise: 500 (account-wide, across repos) | Yes. All repos under MMMustafakamran share the 20. Several framework repos dispatched at once (B1 says "every assigned repo at once") queue each other |
| Max job time (hosted) | 6 h per job. Workflow run max 35 days. Queue wait max 24 h | No (timeouts set to 75/170) |
| Matrix | max 256 jobs per workflow run | No |
| Cache | 10 GB per repo by default (since late 2025 repos can buy more). Least-recently-used eviction when full. Entries not accessed for 7 days are removed | Possible. APK (~150 MB) + node_modules (2 copies, ~1 GB) + Gradle (~1–2 GB) + AVD snapshot (~2 GB) + system image (~1.5 GB) is about 6–7 GB; versioned keys pile up. Delete stale keys (`gh cache delete`) |
| Artifacts | Public repos: storage free. Default retention 90 days (configurable 1–90 public) | Clips are big. Set `retention-days` on the run artifact (e.g. 14) so old runs don't clutter |
| ubuntu-latest (public repo) | 4 vCPU, 16 GB RAM, 14 GB SSD, x86_64, **KVM available** (nested virtualization enabled on Linux larger and standard runners since 2024) | Disk: 14 GB free is tight with SDK + AVD + node_modules + clips. Add a "free disk" step if `No space left` appears |
| ubuntu-24.04-arm (public repo, free since 2025) | 4 vCPU arm64, 16 GB. **No KVM / nested virt** on hosted arm64 | Not usable for the emulator (no acceleration). It could run an arm64 image only in pure software, which is far too slow |
| Larger runners | Team/Enterprise only, billed per minute even on public repos (e.g. 8-core Linux ~$0.022/min, GPU runners exist) | Not on the free plan |
| macOS runners | Free on public repos. On private repos the macOS minute multiplier is 10x (Linux 1x, Windows 2x). macOS-14/15 arm64 (M1) has no nested virt for the Android emulator: HVF is unavailable in the VM | Don't use macOS for the emulator |
| `workflow_dispatch` inputs | max 25 inputs (raised from 10 in Dec 2025). Payload max 65,535 chars | `pages=` is a CSV; fine |
| Workflow file / log | Log per step is truncated beyond ~64 KB in UI (full log via download). Run log retention follows artifact retention | Use `gh run view --log` for full timings |
| API rate limit for `GITHUB_TOKEN` | 1,000 requests/hour/repo | The delete-artifacts step is fine |

Sources:
- Billing and free minutes: https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions
- Usage limits (job time, concurrency, matrix, queue): https://docs.github.com/en/actions/reference/limits
- Runner specs: https://docs.github.com/en/actions/using-github-hosted-runners/using-github-hosted-runners/about-github-hosted-runners#standard-github-hosted-runners-for-public-repositories
- KVM on Linux runners: https://github.blog/changelog/2024-04-02-github-actions-hardware-accelerated-android-virtualization-now-available/
- arm64 runners for public repos: https://github.blog/changelog/2025-01-16-linux-arm64-hosted-runners-now-available-for-free-in-public-repositories-public-preview/
- Cache limits and eviction: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/caching-dependencies-to-speed-up-workflows#usage-limits-and-eviction-policy
- Artifact retention: https://docs.github.com/en/organizations/managing-organization-settings/configuring-the-retention-period-for-github-actions-artifacts-and-logs-in-your-organization
- workflow_dispatch inputs: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#onworkflow_dispatchinputs
- Larger runners: https://docs.github.com/en/actions/using-github-hosted-runners/about-larger-runners

---

## 3. Lighter emulator alternatives

Constraints from our pipeline: we need `adb` (deep link `am start`, `uiautomator dump`, `input tap/text`, `adb reverse`, `run-as`), `screenrecord` (H.264 → ffmpeg → mirror), an x86_64 debug APK (or rebuild for arm64), and Metro reachable via 10.0.2.2 or `adb reverse`.

| Option | Windows local | CI | RAM/CPU | adb + uiautomator | screenrecord | APK ABI | License / cost | Known issues |
|---|---|---|---|---|---|---|---|---|
| **AOSP emulator, google_apis (current)** | Works (WHPX) | Works (KVM) | 3–4 GB + 2–4 cores; heavy System UI and GMS | Full | Yes | x86_64 | Free | ANRs from GMS/System UI on 2 cores, swiftshader freezes |
| **AOSP emulator, ATD image (`aosp_atd`/`google_atd`)** | Works | Works (`target: aosp_atd`) | ~20–40 % less RAM/CPU; no launcher apps, many services stripped; headless-optimized | Full | Yes | x86_64 (or arm64 on Apple Silicon) | Free | API 30–35 only as of my knowledge; some apps expect GMS (we don't); "hardware rendering is disabled" by design, use `-gpu swiftshader_indirect` or `host` |
| AOSP Go images | Works | Works | Lower RAM (~1 GB guest) | Full | Yes | x86_64 | Free | Low-RAM device class, aggressive process killing, so RN debug + Hermes can be killed; not recommended |
| **Genymotion Desktop** | Very good (VirtualBox, or Hyper-V/QEMU on Windows since 3.6) | Not on GH-hosted (no VirtualBox nested) | Lighter, smoother UI | Full (it's a regular adb device) | Yes | x86_64 images (ARM translation optional) | Free for personal use only. Business use needs a paid licence ($412/yr/seat as last published) | Licensing: this is commercial QA work, so the free tier likely doesn't apply |
| Genymotion SaaS / Device image | n/a | Yes (`genymotion/genymotion-saas-github-action`), adb over a tunnel | Cloud | Full | Yes | x86_64 | Pay per minute (~$0.05/min) | Tunnel latency, cost |
| Waydroid | No (Linux, Wayland) | Hard on GH runners (needs binder kernel modules) | Light (container) | adb over IP | Partial (no standard screenrecord encoder on many hosts) | x86_64 | GPL/free | Kernel modules, not on stock Azure kernels |
| **redroid (Docker)** | No (WSL2 kernel lacks binderfs by default) | Possible on ubuntu runners after `modprobe binder_linux` (`linux-modules-extra-$(uname -r)`); flaky | Very light, boots in seconds | Full adb over `adb connect localhost:5555` | Works with software encoder; slow | x86_64 | Apache-2.0 | Binder module availability on Azure kernels varies; no official GitHub support; System UI minimal. Worth a spike only if KVM emulator becomes the bottleneck |
| BlueStacks 5 / LDPlayer / MEmu | Runs, adb on 127.0.0.1:5555/5556 (setting toggle) | No | 2–4 GB | adb yes; uiautomator mostly works | Often missing or restricted; vendor ROMs differ | Mostly x86/x86_64 with ARM translation | Free with ads/telemetry; closed source | Not stock Android (old API levels, Android 9/11 bases), bundled software. Unfit for doc QA evidence |
| Windows Subsystem for Android | **Discontinued 2025-03-05** | No | | | | | | Gone, don't use |
| Firebase Test Lab | n/a | Yes (`gcloud firebase test android run`) | Cloud | **No interactive adb**; only instrumentation/Robo/game-loop tests | Yes (video of the test) | any | Spark free: 10 virtual + 5 physical tests/day | Can't drive with our adb script, so it doesn't fit |
| AWS Device Farm | n/a | Yes | Cloud | Remote access sessions are interactive (web), not scriptable adb for our tooling | Video yes | any | 1,000 free device minutes one-time, then $0.17/min | No scriptable adb |
| BrowserStack App Live/Automate, Sauce Labs | n/a | Yes (Appium) | Cloud | Appium, not raw adb (BrowserStack has limited "adb shell" on App Automate) | Video yes | any | Free tier tiny / open-source program on request | Would need an Appium rewrite of probe-android.mts |
| reactivecircus/android-emulator-runner (current CI) | n/a | Yes | runner | Full | Yes | x86_64 | MIT | Already used; options below |

Useful `reactivecircus/android-emulator-runner@v2` inputs: `api-level`, `target` (`default|google_apis|aosp_atd|google_atd|playstore`), `arch`, `profile` (e.g. `pixel_6`), `cores`, `ram-size`, `heap-size`, `disk-size`, `emulator-options`, `disable-animations`, `disable-spellchecker`, `disable-linux-hw-accel`, `enable-hw-keyboard`, `emulator-boot-timeout`, `force-avd-creation`, `channel`, `pre-emulator-launch-script`, `emulator-build`. Its README recommends a snapshot-generation step plus `-no-snapshot-save`, which we already do. Add `cores: 4` (the runner has 4) and `disable-spellchecker: true`.

**Expo dev client / RN-web as a non-emulator path:** not acceptable as the QA surface. The docs under test are React Native docs. A reader runs them on a device, so the native bridge, Hermes, the worklets/reanimated native module, `fetch`/SSE streaming on RN's networking stack, Android keyboard/IME behaviour, and the debug APK's Metro connection (10.0.2.2) are all part of what can break. RN-web would swap all of that for the browser (react-native-web DOM shims, browser fetch/EventSource). It would hide native-only defects, which breaks QA-RULES §1, and it would create web-only defects that a reader never sees. The Expo dev client is still an Android app on an emulator or device, so it doesn't remove the emulator. RN-web is usable at most as a fast smoke check of the JS logic, never as evidence.

Sources:
- ATD images: https://developer.android.com/studio/test/gradle-managed-devices#gmd-atd
- Emulator command line flags: https://developer.android.com/studio/run/emulator-commandline
- Emulator acceleration (WHPX/AEHD, KVM): https://developer.android.com/studio/run/emulator-acceleration
- AEHD (the Android Emulator hypervisor driver, deprecated in favour of WHPX on newer emulators): https://github.com/google/android-emulator-hypervisor-driver
- Quickboot snapshots: https://developer.android.com/studio/run/emulator-snapshots
- android-emulator-runner: https://github.com/ReactiveCircus/android-emulator-runner
- Genymotion pricing/licence: https://www.genymotion.com/pricing/ ; SaaS action: https://github.com/Genymobile/genymotion-saas-github-action
- redroid: https://github.com/remote-android/redroid-doc
- Waydroid: https://docs.waydro.id/
- WSA end of support: https://learn.microsoft.com/en-us/windows/android/wsa/
- Firebase Test Lab quotas: https://firebase.google.com/docs/test-lab/usage-quotas-pricing
- AWS Device Farm pricing: https://aws.amazon.com/device-farm/pricing/
- BlueStacks adb: https://support.bluestacks.com/hc/en-us/articles/360061342631

### Recommendation

**CI (best):** keep the AOSP emulator on KVM via android-emulator-runner. Try ATD first:

```yaml
api-level: 35            # newest ATD; confirm minSdk <= 35
target: aosp_atd
arch: x86_64
profile: pixel_6
cores: 4
ram-size: 3072M
disk-size: 6G
force-avd-creation: false
disable-animations: true
disable-spellchecker: true
emulator-options: -no-snapshot-save -no-window -gpu swiftshader_indirect -noaudio -no-boot-anim -camera-back none -no-metrics
```

Keep google_apis 36 as a fallback key if the doc demands API 36 behaviour. Bump the AVD cache key (`avd-api35-aosp_atd-…`) and include the system image path in it.

**Local (best):** the same AOSP emulator, ATD image, WHPX, GPU host, no GMS:

```powershell
# once
sdkmanager "system-images;android-35;aosp_atd;x86_64" "emulator" "platform-tools"
avdmanager create avd -n rnqa_atd -k "system-images;android-35;aosp_atd;x86_64" -d pixel_6
# in ~/.android/avd/rnqa_atd.avd/config.ini: hw.lcd.density=320, hw.lcd.width=720, hw.lcd.height=1440,
#   hw.ramSize=3072, vm.heapSize=512, hw.cpu.ncore=4, hw.keyboard=yes, hw.audioInput=no, hw.camera.back=none
# run
emulator -avd rnqa_atd -no-window -no-audio -no-boot-anim -gpu host -accel on -memory 3072 -cores 4 -no-snapshot-save -no-metrics
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb shell settings put global package_verifier_enable 0
```

If the laptop has spare money and no licence concern, Genymotion Desktop is the smoothest local option. Its free tier is personal-use only, so it is probably not allowed here.

---

## 4. Local optimization checklist (Windows 11 laptop)

**Hypervisor**
- [ ] Turn on "Windows Hypervisor Platform" (`optionalfeatures` → Windows Hypervisor Platform; or `Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform`). The emulator uses WHPX. AEHD is legacy; don't mix it with Hyper-V.
- [ ] Check with `emulator -accel-check` → "WHPX ... is installed and usable".
- [ ] Turn off Memory Integrity (Core Isolation) only if WHPX is slow and the owner agrees. It costs VM performance.
- [ ] Power plan: Best performance, plugged in. Thermal throttling is a likely reason for "hangs after hours".

**Emulator**
- [ ] Use an ATD image (section 3). If you stay on google_apis, disable GMS: `adb shell pm disable-user --user 0 com.google.android.gms` (and `com.android.vending`), plus the launcher widgets.
- [ ] `-cores 4` rather than 2. Two cores is the main reason system_server ANRs while Metro bundles and screenrecord encodes at once.
- [ ] Lower resolution/density (720x1440 @ 320). That makes screenrecord and the ffmpeg mirror cheaper too. Also pass `screenrecord --size 720x1440 --bit-rate 4000000`.
- [ ] `-no-snapshot-save` and one cold boot per session, or a saved quickboot snapshot taken right after first boot plus APK install (`adb emu avd snapshot save ready`, then `-snapshot ready -no-snapshot-save`). That gives a 5–10 s start.
- [ ] Restart the emulator every N probes (e.g. 20) in the probe tool rather than letting it run for hours.
- [ ] Animations off (three `settings put global` lines above), `adb shell settings put secure show_ime_with_hard_keyboard 0`.

**Gradle (`MyCopilotApp/android/gradle.properties`, local only; HARNESS-marked if committed)**
- [ ] `org.gradle.daemon=true`, `org.gradle.parallel=true`, `org.gradle.caching=true`, `org.gradle.configuration-cache=true` (RN 0.7x+ supports it; turn it off if a plugin complains).
- [ ] `org.gradle.workers.max=4` (it is 1 now) if RAM allows. `org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g`.
- [ ] Keep `reactNativeArchitectures=x86_64` (already set).
- [ ] **Don't rebuild for JS-only changes.** A debug APK fetches JS from Metro, so only native module or `android/` changes need `assembleDebug`. Reinstall is not needed either: `adb shell am force-stop` plus the deep link reloads it.
- [ ] Incremental builds: `./gradlew :app:installDebug` (not `clean`). With daemon and build cache a no-change rebuild is under 1 min.
- [ ] Exclude the repo, `%USERPROFILE%\.gradle`, `%LOCALAPPDATA%\Android` and `node_modules` from Defender real-time scanning, or use a Dev Drive (ReFS, perf mode). This often gives 20–40 % on Gradle and npm.

**Metro**
- [ ] Keep one Metro running (`--port 8180`). Avoid `--reset-cache` unless the worklets patch changed.
- [ ] `maxWorkers: 2` in metro.config.js on the laptop (HARNESS) so Metro doesn't starve the emulator.
- [ ] Keep the worklets SHA-1 patch as a script (`tools/ci/patch-metro-worklets.sh`), re-applied after each `npm install`.

**Long paths: can the `C:\rnc` copy go?**
- [ ] `New-ItemProperty HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force` (admin), then reboot.
- [ ] `git config --system core.longpaths true`.
- Partly. The registry flag fixes Node, git, Java and Gradle, but **CMake/Ninja and the NDK clang toolchain on Windows still fail past 260 chars** in several versions, and Ninja's object paths under `.cxx/` get very long. The known RN advice is to keep the project path short. What works without the copy:
  - `subst R: C:\Users\QS\Desktop\Copilotkit\1-frameworks\claude-sdk-typescript\react-native` and build from `R:\MyCopilotApp\android` (no file copy, same files), or
  - point the native build dir somewhere short: `android.externalNativeBuild`'s `buildStagingDirectory "C:/b/${project.name}"` in the module, if worklets exposes it (it usually doesn't, hence subst).
- Try LongPathsEnabled + core.longpaths + `subst`. If the worklets CMake still fails, keep the short path but use `subst` (or a directory junction `mklink /J C:\rnc <repo>`) so there is one copy of the files rather than two.

Sources:
- Long paths: https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation
- RN on Windows path issue: https://github.com/facebook/react-native/issues/36530 (CMake path limit), and https://developer.android.com/ndk/guides/cmake (NDK CMake)
- Gradle performance: https://docs.gradle.org/current/userguide/performance.html ; configuration cache: https://docs.gradle.org/current/userguide/configuration_cache.html
- gradle/actions setup-gradle: https://github.com/gradle/actions/blob/main/docs/setup-gradle.md
- Dev Drive: https://learn.microsoft.com/en-us/windows/dev-drive/
- Metro config: https://metrobundler.dev/docs/configuration
