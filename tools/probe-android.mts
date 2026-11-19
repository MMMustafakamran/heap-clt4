// HARNESS tool: the Android counterpart of .qa/tools/probe.mts (that one drives a browser page).
// Opens a doc page in the app by deep link, optionally types a prompt and taps a button, waits
// for the screen to settle, and saves evidence:
//   out/probe/<page>/final.png, shot-<t>s.png (every 5 s), ui.xml (final view tree),
//   logcat.txt (ReactNativeJS + crashes), result.json (texts on screen, errors, timing).
// Usage (from the repo root, emulator running, app installed, servers up):
//   npx tsx tools/probe-android.mts <page-id>... [--prompt "..."] [--tap Send] [--serial emulator-5554]
//        [--timeout 120] [--settle 12] [--no-input]
// Without --prompt it uses the default from tools/probe-prompts.json (page id -> {prompt, tap}).
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const opt = (k: string, d?: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const flag = (k: string) => argv.includes(`--${k}`);
const valued = new Set(["prompt", "tap", "serial", "timeout", "settle"]);
const ids = argv.filter((a, i) => !a.startsWith("--") && !valued.has(argv[i - 1]?.slice(2) ?? ""));
const SDK = process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk");
const ADB = path.join(SDK, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
const SERIAL = opt("serial", process.env.ANDROID_SERIAL || "emulator-5554")!;
const PKG = "com.claudesdkts";
const TIMEOUT = Number(opt("timeout", "120")) * 1000;
const SETTLE = Number(opt("settle", "12")) * 1000;
type Step = { tap?: string; wait?: number; send?: string };
const prompts: Record<string, { prompt?: string; tap?: string; steps?: Step[] }> =
  fs.existsSync("tools/probe-prompts.json") ? JSON.parse(fs.readFileSync("tools/probe-prompts.json", "utf8")) : {};

const adb = (...a: string[]) => execFileSync(ADB, ["-s", SERIAL, ...a], { maxBuffer: 64 << 20 });
const sh = (cmd: string) => adb("shell", cmd).toString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Node = { text: string; desc: string; hint: string; clickable: boolean; cls: string; bounds: [number, number, number, number] };
function dump(): { xml: string; nodes: Node[] } {
  sh("uiautomator dump /sdcard/ui.xml >/dev/null 2>&1");
  const xml = adb("exec-out", "cat", "/sdcard/ui.xml").toString();
  const nodes: Node[] = [];
  for (const m of xml.matchAll(/<node [^>]*>/g)) {
    const a = (k: string) => m[0].match(new RegExp(`${k}="([^"]*)"`))?.[1] ?? "";
    const b = a("bounds").match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    nodes.push({ text: unesc(a("text")), desc: unesc(a("content-desc")), hint: unesc(a("hint")), clickable: a("clickable") === "true", cls: a("class"), bounds: b ? [+b[1], +b[2], +b[3], +b[4]] as any : [0, 0, 0, 0] });
  }
  return { xml, nodes };
}
const unesc = (s: string) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#10;/g, "\n").replace(/&amp;/g, "&");
const center = (n: Node) => [Math.round((n.bounds[0] + n.bounds[2]) / 2), Math.round((n.bounds[1] + n.bounds[3]) / 2)];
const tap = (n: Node) => { const [x, y] = center(n); sh(`input tap ${x} ${y}`); };
// The command is one device-shell line: single-quote the argument (only ' needs the '\'' dance, every
// other char is literal inside '...'); `input text` splits on spaces, so spaces become %s.
const typeText = (t: string) => sh(`input text '${t.replace(/ /g, "%s").replace(/'/g, `'\\''`)}'`);
const shot = (file: string) => fs.writeFileSync(file, adb("exec-out", "screencap", "-p"));
const label = (n: Node) => (n.text || n.desc).trim().toLowerCase();
// step targets: "re:<regex>" = first node matching; else exact text/content-desc (case-insensitive, [brackets] ignored), else the first node containing it
const findLabel = (nodes: Node[], want: string) => {
  if (want.startsWith("re:")) { const re = new RegExp(want.slice(3), "i"); return nodes.find((n) => re.test((n.text || n.desc).trim()) && n.bounds[2] > n.bounds[0]); }
  const w = want.trim().toLowerCase(), strip = (x: string) => x.replace(/^\[|\]$/g, "");
  return nodes.find((n) => strip(label(n)) === w) || nodes.find((n) => label(n).includes(w) && n.bounds[2] > n.bounds[0]);
};
// chat input: the EditText whose hint/placeholder reads like "Type a message...", else the last EditText
const chatInput = (nodes: Node[]) => {
  const eds = nodes.filter((n) => n.cls.endsWith("EditText"));
  return eds.find((n) => /type a message|message|ask/i.test(n.hint)) || eds.find((n) => /^type a message/i.test(n.text)) || eds[eds.length - 1];
};
// send button: text/desc "Send" (or the configured label) or an arrow icon, else the clickable just right of the input
const sendButton = (nodes: Node[], input: Node, want: string) => {
  const w = want.toLowerCase();
  const byName = nodes.find((n) => label(n) === w || /^(send|send message|submit|↑|➤|→)$/i.test((n.text || n.desc).trim()));
  if (byName) return byName;
  const [, iy1, ix2, iy2] = input.bounds, mid = (iy1 + iy2) / 2;
  return nodes.filter((n) => n.clickable && n.bounds[0] >= ix2 - 4 && n.bounds[1] <= mid + 40 && n.bounds[3] >= mid - 40 && n.bounds[2] > n.bounds[0])
    .sort((a, b) => a.bounds[0] - b.bounds[0])[0];
};
const hideKeyboard = () => { if (/mInputShown=true/.test(sh("dumpsys input_method"))) sh("input keyevent 4"); };
const swipeUp = () => { const size = sh("wm size").match(/(\d+)x(\d+)/); const w = size ? +size[1] : 320, h = size ? +size[2] : 640;
  sh(`input swipe ${Math.round(w / 2)} ${Math.round(h * 0.6)} ${Math.round(w / 2)} ${Math.round(h * 0.25)} 400`); };
const texts = (nodes: Node[]) => nodes.map((n) => n.text || n.desc).filter(Boolean);

async function probe(id: string) {
  const out = path.join("out", "probe", id);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const t0 = Date.now();
  const res: any = { page: id, serial: SERIAL, startedAt: new Date().toISOString(), steps: [], errors: [] };
  const step = (s: string) => { res.steps.push({ t: +((Date.now() - t0) / 1000).toFixed(1), s }); console.log(`[${id}] ${s}`); };

  sh("logcat -c");
  sh(`am force-stop ${PKG}`);
  sh(`am start -W -a android.intent.action.VIEW -d "copilotqaclt://page/${id}" ${PKG}`);
  step("opened by deep link");
  const shots = setInterval(() => { try { shot(path.join(out, `shot-${Math.round((Date.now() - t0) / 1000)}s.png`)); } catch {} }, 5000);
  await sleep(6000);

  const cfg = prompts[id] || {};
  const prompt = opt("prompt", cfg.prompt);
  const tapLabel = opt("tap", cfg.tap ?? "Send");
  // HARNESS: "before" steps (probe-prompts.json) run before the prompt: waitfor / tap / wait / swipe [x1,y1,x2,y2]
  for (const b of (cfg.before || []) as any[]) {
    if (b.waitfor) { const end = Date.now() + (b.timeout ?? 60) * 1000; while (Date.now() < end && !findLabel(dump().nodes, b.waitfor)) await sleep(2000); }
    if (b.tap) { const n = findLabel(dump().nodes, b.tap); if (n) { tap(n); step(`before: tapped "${n.text || n.desc}"`); } else step(`before: no "${b.tap}"`); }
    if (b.swipe) { const [x1, y1, x2, y2] = b.swipe; sh(`input swipe ${x1} ${y1} ${x2} ${y2} 500`); step("before: swipe"); }
    if (b.wait) await sleep(b.wait * 1000);
  }
  let before = dump();
  // first open of a page builds its bundle and renders slowly: wait up to 45 s for the input
  for (let i = 0; prompt && !flag("no-input") && i < 13 && !before.nodes.some((n) => n.cls.endsWith("EditText")); i++) {
    await sleep(3000); before = dump();
  }
  const sendText = async (text: string): Promise<boolean> => {
    const input = chatInput(dump().nodes);
    if (!input) { res.errors.push("no text input on screen"); step("no EditText found"); return false; }
    tap(input); await sleep(500); typeText(text); step(`typed: ${text}`);
    await sleep(2000); // keyboard slide moves the Send button; let the layout settle before reading its bounds
    const cur = dump();
    res.textsBeforeSend = texts(cur.nodes);
    const inp = chatInput(cur.nodes) || input;
    const btn = sendButton(cur.nodes, inp, tapLabel || "Send");
    if (btn) { tap(btn); step(`tapped send "${btn.text || btn.desc}" at ${center(btn)}`); }
    else { sh("input keyevent 66"); step("no send button, pressed Enter"); }
    await sleep(3000);
    const after = dump();
    const key = text.slice(0, 12);
    const inp2 = chatInput(after.nodes);
    const cleared = !inp2 || !inp2.text.includes(key);
    const shown = after.nodes.some((n) => !n.cls.endsWith("EditText") && (n.text || n.desc).includes(key));
    const sent = cleared || shown;
    hideKeyboard(); // the IME covers half the screen (cards, approve buttons) on a small emulator
    step(sent ? `sent (${cleared ? "input cleared" : "message shown"})` : "NOT sent: prompt still in the input");
    return sent;
  };
  if (prompt && !flag("no-input")) {
    res.sent = await sendText(prompt);
  } else if (tapLabel && opt("tap")) {
    const btn = findLabel(before.nodes, tapLabel);
    if (btn) { tap(btn); step(`tapped "${tapLabel}"`); } else res.errors.push(`no "${tapLabel}" button`);
  }

  // settle: the visible text stops changing for SETTLE ms, or the time limit
  let stableSince = Date.now();
  const settle = async (limit: number) => {
    const end = Date.now() + limit;
    let last = JSON.stringify(texts(dump().nodes)); stableSince = Date.now();
    while (Date.now() < end) {
      await sleep(3000);
      const now = JSON.stringify(texts(dump().nodes));
      if (now !== last) { last = now; stableSince = Date.now(); }
      else if (Date.now() - stableSince >= SETTLE) break;
    }
  };
  await settle(Math.max(15000, TIMEOUT - (Date.now() - t0)));
  // follow-up steps (probe-prompts.json "steps"), each after the screen settled; step<N>.png after each
  const followUps: Step[] = cfg.steps || [];
  res.followUps = [];
  for (let i = 0; i < followUps.length; i++) {
    const st = followUps[i];
    const rec: any = { step: st };
    if (st.tap) {
      let n = findLabel(dump().nodes, st.tap);
      // not visible: the target can sit below the fold of the chat list; scroll the content up and look again
      for (let k = 0; !n && k < 3; k++) { hideKeyboard(); swipeUp(); await sleep(1500); n = findLabel(dump().nodes, st.tap); }
      if (n) { tap(n); step(`step ${i + 1}: tapped "${n.text || n.desc}"`); rec.ok = true; }
      else { step(`step ${i + 1}: no "${st.tap}" on screen`); res.errors.push(`step ${i + 1}: no "${st.tap}" on screen`); rec.ok = false; }
    }
    if (st.send) { rec.sent = await sendText(st.send); rec.ok = rec.sent; if (!rec.sent) res.sent = false; }
    if (st.wait) { await sleep(st.wait * 1000); if (rec.ok === undefined) rec.ok = true; }
    await settle(90000);
    try { shot(path.join(out, `step${i + 1}.png`)); } catch {}
    rec.screenTexts = texts(dump().nodes);
    res.followUps.push(rec);
  }
  clearInterval(shots);
  const fin = dump();
  shot(path.join(out, "final.png"));
  fs.writeFileSync(path.join(out, "ui.xml"), fin.xml);
  const log = adb("logcat", "-d", "-v", "time", "ReactNativeJS:V", "ReactNative:V", "AndroidRuntime:E", "*:S").toString();
  fs.writeFileSync(path.join(out, "logcat.txt"), log);

  res.durationS = +((Date.now() - t0) / 1000).toFixed(1);
  res.screenTexts = texts(fin.nodes);
  res.settled = Date.now() - stableSince >= SETTLE;
  if (res.sent === undefined && prompt && !flag("no-input")) res.sent = false;
  res.appAlive = sh(`pidof ${PKG}`).trim() !== "";
  res.logErrors = log.split("\n").filter((l) => /^\S+ \S+ E\/|FATAL|Error:|TypeError|ReferenceError|Unhandled/.test(l)).slice(0, 40);
  res.redbox = res.screenTexts.some((t: string) => /^(Render Error|Uncaught Error|Error|Console Error)$/.test(t) || /is not a function|undefined is not|Cannot read propert/.test(t));
  fs.writeFileSync(path.join(out, "result.json"), JSON.stringify(res, null, 1));
  step(`done in ${res.durationS}s, ${res.screenTexts.length} texts, ${res.logErrors.length} log errors${res.redbox ? ", RED BOX" : ""}`);
}

if (!ids.length) { console.error("usage: npx tsx tools/probe-android.mts <page-id>... [--prompt ..]"); process.exit(2); }
if (!spawnSync(ADB, ["-s", SERIAL, "get-state"]).stdout?.toString().includes("device")) { console.error(`no device ${SERIAL}`); process.exit(2); }
// One device, several callers (2 probe agents share one emulator: RAM limit): a lock dir makes them
// take turns per page. mkdir is atomic; a lock older than 10 min is stale and is taken over.
const LOCK = path.join("out", `.lock-${SERIAL}`);
async function withLock(fn: () => Promise<void>) {
  fs.mkdirSync("out", { recursive: true });
  for (;;) {
    try { fs.mkdirSync(LOCK); break; } catch {
      try { if (Date.now() - fs.statSync(LOCK).mtimeMs > 600_000) { fs.rmSync(LOCK, { recursive: true, force: true }); continue; } } catch {}
      await sleep(2000);
    }
  }
  try { await fn(); } finally { fs.rmSync(LOCK, { recursive: true, force: true }); }
}
for (const id of ids) await withLock(() => probe(id)); // pages run one after another
