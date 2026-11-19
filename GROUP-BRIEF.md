# Route-building brief (Claude Agent SDK TypeScript × React Native)

Repo: `c:\Users\QS\Desktop\Copilotkit\1-frameworks\claude-sdk-typescript\react-native`. Docs: `https://docs.copilotkit.ai/react-native/claude-sdk-typescript/<page>`.
Rules: `c:\Users\QS\Desktop\Copilotkit\2-shared\instructions\WORKFLOW.md` and `QA-RULES.md` (§1 verbatim code, §2 HARNESS edits, §3 ambiguity = defect, §8a levels; false ❌ are penalised). Page list: `PAGES-PLAN.md`.

Copied from the Claude Agent SDK **Python** RN harness (`1-frameworks/claude-sdk-python/react-native`, read-only for you). `MyCopilotApp/pages/<id>/` holds that page's RN frontend; the Python `backend/` is gone.

**Copy code from the RENDERED page**, or strip every fumadocs marker (`{/* [!code highlight] */}`, `// [!code highlight:N]`) from the `.md` export: a leftover marker after `>` renders a bare " " text child and crashes RN ("Text strings must be rendered within a <Text> component"). The Python copy still has such leftovers (agent-readonly ProfileScreen.tsx:14, frontend-tools TaskScreen.tsx:9, headless-ui ChatScreen.tsx:47/:80, hitl MeetingApproval.tsx:11, shared-state NotesCard.tsx:13, state-rendering ResearchProgress.tsx:13, state-streaming DocumentView.tsx:6, tool-based ChatScreen.tsx:6, tool-rendering ToolCallCard.tsx:5): remove them.

## Per page
1. Diff the live claude-sdk-typescript page against the live claude-sdk-python page. Frontend blocks the same → keep the file; different → make it verbatim to the TS page.
2. Backend: the page's **TypeScript** Claude agent code, verbatim, in `agent/src/pages/<id>.ts`. Serve it from your group's `agent/src/rn-<group>.ts` (express, `POST /<id>`, `GET /health`, port from `AGENT_PORT`: chat 8184, genui 8185, state 8186, misc 8188), modelled on the quickstart's `agent/src/agent-server.ts` (`ClaudeAgentAdapter`, verbatim from `/claude-sdk-typescript/quickstart`). When the page gives no usable agent (fragment, undefined helpers), add the smallest harness code that lets it run, every line marked `// HARNESS: <why>`; judge the gap by QA-RULES §8a (missing import / obvious helper = ✅ + Note).
3. Runtime: `MyCopilotApp/pages/<id>/runtime.ts` → `HttpAgent({ url: "http://localhost:<port>/<id>" })`.
4. Recorder: update the page's `ideTabs` in `autorecorder/config/pages.config.ts` (the Python ones point at `backend/agents/*.py`) and drop Python-only `FINDING_EVIDENCE` / notes in `autorecorder/actions/android.actions.ts`.

## Limits (the PC is shared)
- **No** npm install, gradle, emulator, adb, Metro or long-running servers. The owner session runs those.
- You may type-check one file: `cd agent && npx tsc --noEmit --skipLibCheck --module nodenext --moduleResolution nodenext src/rn-<group>.ts`.
- Don't touch `assignment.json`, `FINDINGS.md`, `start-all.sh`, `.github/`, or other groups' files.

## Output
Write `notes/group-<X>.md`: per page, TS vs Python diff, files written, HARNESS lines, expected status + finding (level + one line), probe prompt. Reply with a 10-line summary.
