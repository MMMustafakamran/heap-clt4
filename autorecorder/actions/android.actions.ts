/**
 * Demo segment on the Android emulator. The recorder's browser shows the device mirror
 * (android-mirror.ts); everything the "person" does goes to the device through adb:
 * open the page by deep link, tap the composer, type the prompt at a human pace, tap send,
 * wait for the screen to settle. The cursor glides to the matching spot on the mirrored
 * screen before each tap, so the clip reads like someone clicking in the emulator window.
 *
 * Same verdicts as tools/probe-android.mts: red box, app died, no reply -> ctx.fail.
 * The device's logcat for the take is appended to <repo>/logs/android-logcat.log, so the
 * failure terminal (core/failure-terminal.ts reads <repo>/logs) can show it.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Page } from 'playwright';
import { type ActionContext, type PageActionHandler, type PageRecordConfig } from '../core/types';
import { humanClick, humanGlide, sleep } from '../core/overlays/cursor';
import { checkpoint, logAction, mark } from '../core/timeline';
import { type DocEvidence, showFinding } from './doc-evidence';
import { registerDocEvidence } from '../core/doc-evidence';
import {
  appAlive, byLabel, center, dump, inputText, isRedbox, logcat, openDeepLink, sh, tapXY, texts, withDeviceLock,
  type UiNode,
} from './adb';

/** Finding clips (❌/⚠️, level 1): doc highlight before the IDE, Notepad after the demo. Filled per page.
 *  DRAFT 2026-11-19: written from the doc text only, no probe yet (no Anthropic credit). Recheck after probing. */
export const FINDING_NOTES: Record<string, string> = {
  quickstart: `this is the claude agent sdk react native quickstart,should give u a chat running on a claude agent
but the runtime only registers a built in openai agent, model openai gpt 6 luna
so the chat answers but its not claude at all
no pip install for ag-ui claude sdk,no python server,nothing that hooks claude into the runtime
had to guess the claude adapter backend and an httpagent from ag-ui client myself`,
  'tool-rendering': `page says the agent runs get_weather and the weather card renders in the chat
but the agent is just two pieces of a claude agent sdk adapter file plus the weather tool
it uses normalizeclaudeagentsdkmodel, zodshapefromjsonschema, emit, executetool,none defined anywhere,no imports
and no route or server that runs the adapter
had to write the helpers and the wiring myself`,
  'shared-state': `page says the agent reads and writes notes and preferences shared with the app
but the agent code is just chunks of a showcase agent_server and adapter file
runagenticloop, runwithclaudeagentsdk, executebackendtool, zodshapefromjsonschema all never defined,no imports
and the messages api fallback it mentions isnt shown either,cant run it as written
wrote the whole loop myself`,
  subagents: `page says the delegation log renders live as the supervisor calls sub agents
but theres no react native code for the log, just one sentence
and the run loop that calls the sub agents and writes delegations is never shown,only prompts and tool schemas
wrote both the loop and the log myself`,
  'state-rendering': `page says the research progress panel updates while the agent works
but the panel reads status draft completed total from an agent called researcher
the agent on the page only writes notes and preferences,and researcher is never registered
so nothing the agent does can move the panel
runner function isnt shown either`,
  'state-streaming': `page says the document streams into the view while the agent writes it
but it only shows one branch that runs inside the streamed tool argument handler
the handler,the route and the write_document tool executor are never shown
plus a second helper emitstreamingdocumentstate doing the same thing,no word which one to use
had to build the handler myself`,
  'agent-config': `page says the agent reads tone and expertise config and folds it into the prompt
but theres no react native frontend code at all for setting the config
and it names three ways to send it,shared state,forwarded props,useagentcontext
latestvalidconfig is just pseudocode
had to guess both the frontend and the backend side`,
};
export const FINDING_EVIDENCE: Record<string, DocEvidence[]> = {
  quickstart: [
    { text: 'model: "openai:gpt-6-luna",', caption: 'Only a built-in OpenAI agent; no Claude agent (FINDINGS.md #1)' },
  ],
  'tool-rendering': [
    { text: 'model: normalizeClaudeAgentSdkModel(model),', caption: 'Adapter helpers never defined' },
  ],
  'shared-state': [
    { text: 'await runAgenticLoop(req, res, {', caption: 'runAgenticLoop / runWithClaudeAgentSdk never shown (FINDINGS.md #9)' },
  ],
  subagents: [
    { text: 'On the frontend, the delegation log is a reactive render of the', caption: 'No frontend code for the log (FINDINGS.md #16)' },
  ],
  'state-rendering': [
    { text: 'agentId: "researcher",', caption: 'Panel reads an agent/state the backend never provides (FINDINGS.md #17)' },
  ],
  'state-streaming': [
    { text: 'branch runs inside the streamed tool-argument handler.', caption: 'Handler never shown (FINDINGS.md #18)' },
  ],
  'agent-config': [
    { text: 'The Claude Agent SDK demo reads configuration from shared state and folds it', caption: 'No RN frontend; three config channels (FINDINGS.md #20)' },
  ],
};
/** Level 2 (already reported): clip ends after the demo. */
export const KNOWN_ISSUE = new Set<string>([]);
registerDocEvidence(FINDING_EVIDENCE, { skip: KNOWN_ISSUE });

/** Pages whose composer is the doc's own ChatScreen with a "Send" button; the rest use CopilotChat's "↑". */
const SEND_LABEL: Record<string, string> = {
  quickstart: 'Send', 'headless-ui': 'Send', markdown: 'Send', 'multimodal-attachments': 'Send',
};

/** Steps after the reply settles: tap a node by its text, wait N seconds, or wait until a text shows up. */
type ThenStep = { tap?: string; wait?: number; waitfor?: string; timeout?: number; /** device px: x1,y1,x2,y2 */ swipe?: [number, number, number, number];
  /** HARNESS: press Back only while the soft keyboard is up (it covered the swipe area) */ hideKeyboard?: boolean;
  /** drag the node with this text up to 20% of the screen height (e.g. a bottom sheet header); device-size independent */ dragUp?: string };
type PromptCfg = { prompt?: string; tap?: string; settle?: number; timeout?: number; noInput?: boolean; then?: ThenStep[];
  /** steps before typing (e.g. open a modal) */ before?: ThenStep[]; /** which text field is the chat composer */ input?: 'first' | 'last';
  /** HARNESS: the composer sits under the soft keyboard (page has no keyboard avoiding view): press Back before tapping Send */ hideKeyboardBeforeSend?: boolean };

/** First node whose text/desc equals the label, else the first one containing it (case-insensitive). */
function findText(nodes: UiNode[], label: string): UiNode | undefined {
  const l = label.trim().toLowerCase();
  return byLabel(nodes, label) ?? nodes.find((n) => (n.text || n.desc).toLowerCase().includes(l) && n.bounds[2] > n.bounds[0]);
}
async function waitForText(label: string, timeoutS: number): Promise<UiNode | undefined> {
  const end = Date.now() + timeoutS * 1000;
  for (;;) {
    const n = findText(dump().nodes, label);
    if (n || Date.now() > end) return n;
    await sleep(1500);
  }
}
/** One before/then step: wait for a text, tap a node by its text (glide-click on the mirror), or wait. */
async function runStep(page: Page, step: ThenStep, ctx: ActionContext): Promise<void> {
  if (step.waitfor) {
    const n = await waitForText(step.waitfor, step.timeout ?? 60);
    logAction('waitfor', step.waitfor, n ? 'ok' : 'timeout');
    if (!n) ctx.warn(`"${step.waitfor}" never showed up on screen`);
  }
  if (step.tap) {
    const n = await waitForText(step.tap, step.timeout ?? 10);
    if (n) { const d = deviceSize(dump().nodes); await tapNode(page, n, step.tap, d.w, d.h); }
    else ctx.warn(`No "${step.tap}" on screen to tap`);
    await sleep(1500);
  }
  if (step.hideKeyboard && /mInputShown=true/.test(sh('dumpsys input_method'))) { sh('input keyevent 4'); logAction('key', 'back (hide keyboard)'); await sleep(1000); }
  if (step.swipe) { const [a, b, c, d] = step.swipe; sh(`input swipe ${a} ${b} ${c} ${d} 600`); logAction('swipe', step.swipe.join(',')); await sleep(1500); }
  if (step.dragUp) {
    const nodes = dump().nodes; const n = byLabel(nodes, step.dragUp); const d = deviceSize(nodes);
    if (n) { const [x, y] = center(n); sh(`input swipe ${x} ${y} ${x} ${Math.round(d.h * 0.2)} 800`); logAction('swipe', `${step.dragUp} up`); await sleep(2000); }
    else ctx.warn(`No "${step.dragUp}" on screen to drag up`);
  }
  if (step.wait) await sleep(step.wait * 1000);
}
/** tools/probe-prompts.json (main session keeps it), read per take so edits apply without a restart. */
function promptFor(root: string, config: PageRecordConfig): PromptCfg {
  const file = join(root, 'tools', 'probe-prompts.json');
  let all: Record<string, PromptCfg> = {};
  try { if (existsSync(file)) all = JSON.parse(readFileSync(file, 'utf8')); } catch {}
  const p = all[config.id] ?? {};
  return { ...p, prompt: p.prompt ?? config.prompt, tap: p.tap ?? SEND_LABEL[config.id] ?? '↑' };
}

/** Device pixel -> viewport point on the mirrored screen (<img id="screen">, object-fit: contain). */
async function toViewport(page: Page, x: number, y: number, devW: number, devH: number): Promise<{ x: number; y: number } | null> {
  return page.evaluate(([dx, dy, dw, dh]) => {
    const img = document.getElementById('screen') as HTMLImageElement | null;
    if (!img) return null;
    const r = img.getBoundingClientRect();
    const s = Math.min(r.width / dw, r.height / dh);
    const ox = r.left + (r.width - dw * s) / 2, oy = r.top + (r.height - dh * s) / 2;
    return { x: ox + dx * s, y: oy + dy * s };
  }, [x, y, devW, devH]).catch(() => null);
}

/** Glide to a node on the mirrored screen, click (visual only), tap it on the device. */
async function tapNode(page: Page, node: UiNode, what: string, devW: number, devH: number): Promise<void> {
  const [x, y] = center(node);
  mark('click', what);
  const pt = await toViewport(page, x, y, devW, devH);
  if (pt) { await humanGlide(page, pt.x, pt.y, 22); await humanClick(page); }
  tapXY(x, y);
  logAction('tap', what, 'ok', { x, y });
}

/** Human-paced typing through adb: 1-3 characters per `input text`, small pauses, a longer one now and then. */
async function typeHuman(prompt: string): Promise<void> {
  let i = 0;
  while (i < prompt.length) {
    const n = 1 + Math.floor(Math.random() * 3);
    const chunk = prompt.slice(i, i + n);
    i += n;
    inputText(chunk);
    await sleep(60 + Math.random() * 120 + (chunk.includes(' ') && Math.random() < 0.15 ? 350 : 0));
  }
}

/** Device size as the screenshots see it (uiautomator bounds use the same pixels). */
function deviceSize(nodes: UiNode[]): { w: number; h: number } {
  const root = nodes[0]?.bounds;
  return root && root[2] > 0 ? { w: root[2], h: root[3] } : { w: 1080, h: 2400 };
}

/**
 * The standard Android take: deep link, prompt, send, settle. Returns the final screen texts.
 * The device lock is held for the whole demo, so a probe on the same emulator waits.
 */
export async function runAndroidChat(page: Page, config: PageRecordConfig, root: string, ctx: ActionContext): Promise<string[]> {
  return withDeviceLock(root, async () => {
    const cfg = promptFor(root, config);
    const timeoutMs = (cfg.timeout ?? 120) * 1000;
    const settleMs = (cfg.settle ?? 12) * 1000;
    const t0 = Date.now();

    openDeepLink(config.id);
    logAction('deeplink', `copilotqaclt://page/${config.id}`);
    await sleep(6000);

    // Optional steps before the prompt (tools/probe-prompts.json `before`), e.g. open a bottom sheet.
    for (const step of cfg.before ?? []) await runStep(page, step, ctx);

    let screen = dump();
    // The dev build loads its JS bundle from Metro first: wait (up to 60 s) for the page's composer to appear.
    if (cfg.prompt && !cfg.noInput) {
      const until = Date.now() + 60_000;
      while (!screen.nodes.some((n) => n.cls.endsWith('EditText')) && Date.now() < until) {
        await sleep(2000);
        screen = dump();
      }
    }
    const { w, h } = deviceSize(screen.nodes);
    let sentAt = 0;
    let afterSend: string[] = [];

    if (cfg.prompt && !cfg.noInput) {
      const inputs = screen.nodes.filter((n) => n.cls.endsWith('EditText'));
      const input = cfg.input === 'last' ? inputs[inputs.length - 1] : inputs[0];
      if (!input) {
        ctx.fail('No text input on the app screen');
      } else {
        await tapNode(page, input, 'composer', w, h);
        await sleep(600);
        mark('action', `type: ${cfg.prompt}`);
        await typeHuman(cfg.prompt);
        await sleep(700);
        if (cfg.hideKeyboardBeforeSend) await runStep(page, { hideKeyboard: true }, ctx);
        screen = dump();
        const label = cfg.tap!;
        const btn = byLabel(screen.nodes, label) ?? byLabel(screen.nodes, label === 'Send' ? '↑' : 'Send');
        // Baseline = screen before sending: a fast reply can land within the 2 s below.
        afterSend = texts(screen.nodes);
        if (btn) await tapNode(page, btn, `send (${label})`, w, h);
        else { sh('input keyevent 66'); logAction('key', 'enter (no send button)'); }
        sentAt = Date.now();
        await sleep(2000);
      }
    } else if (cfg.tap && cfg.noInput) {
      const btn = byLabel(screen.nodes, cfg.tap);
      if (btn) await tapNode(page, btn, cfg.tap, w, h);
      else ctx.warn(`No "${cfg.tap}" button on screen`);
    }

    // Settle: visible text stops changing for settleMs, or the timeout. The cursor idles meanwhile.
    let last = JSON.stringify(texts(dump().nodes)), stableSince = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      await sleep(3000);
      const now = JSON.stringify(texts(dump().nodes));
      if (now !== last) { last = now; stableSince = Date.now(); }
      else if (Date.now() - stableSince >= settleMs) break;
    }

    // Optional follow-up steps (tools/probe-prompts.json `then`), each tap a glide-click on the mirror.
    for (const step of cfg.then ?? []) await runStep(page, step, ctx);

    const finalTexts = texts(dump().nodes);
    const alive = appAlive();
    const red = finalTexts.filter(isRedbox);
    const log = (() => { try { return logcat(); } catch { return ''; } })();
    try {
      const logs = join(root, 'logs');
      mkdirSync(logs, { recursive: true });
      appendFileSync(join(logs, 'android-logcat.log'), `\n===== ${new Date().toISOString()} ${config.id} =====\n${log}`);
    } catch {}

    void checkpoint('app-alive', 'app process still running', () => alive);
    void checkpoint('no-redbox', 'no red box on screen', () => red.length === 0);
    if (!alive) ctx.fail('The app process died during the take (see logs/android-logcat.log)');
    if (red.length) { mark('error', red[0]); ctx.fail(`Red box on screen: ${red.slice(0, 3).join(' | ')}`); }
    if (sentAt) {
      const fresh = finalTexts.filter((t) => !afterSend.includes(t) && t !== cfg.prompt);
      void checkpoint('reply', 'new text on screen after the prompt', () => fresh.join(' | ').slice(0, 300) || null);
      if (!fresh.length && !red.length) ctx.fail('The agent never replied (screen unchanged after sending the prompt)');
    }
    await sleep(1500);
    sh('input keyevent 3'); // HARNESS (recorder): go home so the next take's demo does not open on this page
    return finalTexts;
  });
}

export const runAndroidStandard: PageActionHandler = async (page, config, root, ctx) => {
  try {
    await runAndroidChat(page, config, root, ctx);
  } finally {
    if (FINDING_NOTES[config.id] && !KNOWN_ISSUE.has(config.id)) {
      await showFinding(page, config, FINDING_EVIDENCE[config.id], FINDING_NOTES[config.id]);
    }
  }
};
