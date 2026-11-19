# Group C: state / HITL / multi-agent (Claude Agent SDK TypeScript x React Native), 2026-11-19

Backend: `backend/rn_state_main.py`, one FastAPI on **:8186** (`uv run uvicorn rn_state_main:app --port 8186`). Subagents are on it too (no :8188 server needed).
Shared HARNESS loop: `backend/agents/_messages_loop.py`. The pages' Python is all showcase excerpts of a raw Anthropic Messages API loop ("intentionally uses its own Messages API loop. It does not use `ClaudeAgentAdapter`"), and that loop is never shown. This file holds the loop (AG-UI message conversion, text/tool-call/state events, server tools loop, frontend tools end the run) plus `normalize_claude_model` (identity) and `DEFAULT_ANTHROPIC_MODEL` (`claude-opus-4-8`, as in quickstart main.py). Every line is HARNESS.
Pages with no Python at all use the quickstart `ClaudeAgentAdapter` unchanged.

| Path on :8186 | Agent file | Kind |
|---|---|---|
| /shared-state-read-write | agents/shared_state.py (endpoint verbatim in rn_state_main.py) | Messages loop, page fragments inline |
| /shared-state-rendering | agents/shared_state_rendering.py | quickstart adapter |
| /agent-readonly | agents/agent_readonly.py | Messages loop + page fragment |
| /state-streaming | agents/state_streaming.py | Messages loop + page fragments |
| /agent-config | agents/agent_config.py | Messages loop + page code |
| /governed-actions | agents/governed_actions.py | quickstart adapter (doc's LangGraph code kept as a string) |
| /hitl-headless | agents/hitl_headless.py | quickstart adapter |
| /subagents | agents/subagents.py | Messages loop + page code |

**Main session TODO, registry (I did not edit it, its header says builders report entries):**
- `pages/registry.ts`: `import StateStreamingPage from "./state-streaming/App";` and `import AgentConfigPage from "./agent-config/App";`, entries `"state-streaming": StateStreamingPage, "agent-config": AgentConfigPage`.
- `pages/runtimes.ts`: `import StateStreamingRuntime from "./state-streaming/runtime";`, `import AgentConfigRuntime from "./agent-config/runtime";`, entries `"state-streaming"`, `"agent-config"`.
- Runtime ports changed: governed-actions and hitl-headless now point at :8186 (they were :8187, Antigravity's HITL server). Subagents now points at :8186 (it was :8188). shared-state points at `:8186/shared-state-read-write`.
- `start-all.sh` needs `rn_state_main:app --port 8186`. `backend/.env` must hold ANTHROPIC_API_KEY (4-private/.env has no Anthropic key).
- Side effect: a `sed` replacing `react-native/google-antigravity/` with `react-native/claude-sdk-typescript/` in the doc-URL comments ran over every `pages/*/App.tsx` and `pages/*/src/*.tsx`, other groups' pages included (comment lines only).

**PAGES-PLAN correction:** shared-state/streaming does **not** show the "Not available on this framework yet" banner on the rendered page. The `.md` export holds both branches of `<WhenFrameworkSupports>`. The rendered page shows the code, `DocumentView` and no banner, and the shared-state page also shows the streaming code. So it is a testable page, not N/A.

---

## shared-state (sidebar)
- **Diff vs antigravity:** the tsx (NotesCard, Button, useCopilotKit snippet) is identical. The Python is different: three excerpts of `shared_state_read_write_agent.py` (SYSTEM_PROMPT/SET_NOTES_TOOL/helpers, `client.messages.stream(...)`, the set_notes result loop) plus `agent_server.py` `@app.post("/shared-state-read-write")`, then a callout saying it doesn't use ClaudeAgentAdapter. It also shows the streaming backend block.
- **Files:** frontend unchanged (already verbatim; runtime.ts → `:8186/shared-state-read-write`). `backend/agents/shared_state.py`, plus the endpoint in rn_state_main.py.
- **HARNESS:** imports (`json`, `dedent`, `Any`, `anthropic`, ag_ui events), `run_shared_state_read_write_agent` (never shown: client, state coercion, preferences injection, message conversion, streaming events, turn loop), `normalize_claude_model`, `DEFAULT_ANTHROPIC_MODEL`. Frontend: App/ChatScreen and LanguageButton (existing harness fill-ins).
- **Expected finding: level 1.** The agent is three fragments of a loop the page never shows: `run_shared_state_read_write_agent`, `client`, `messages`, `system`, `tool_calls`, `msg_id`, `normalize_claude_model` and `DEFAULT_ANTHROPIC_MODEL` are undefined, and there are no imports or install. A reader can't build the agent without guesswork. Minor: the `useCopilotKit` snippet is a bare fragment (`newLanguage` undefined, top-level await).
- **Probe:** "Remember that I like green tea." Then check that a note appears in NotesCard. Tap "Prefer short answers", then ask "Explain photosynthesis."

## shared-state-rendering (sidebar, shared-state/rendering-in-app)
- **Diff vs antigravity:** identical (0 diff lines). No Python on the page.
- **Files:** frontend unchanged (verbatim). `backend/agents/shared_state_rendering.py` = quickstart adapter.
- **HARNESS:** the whole agent (quickstart adapter, verbatim options).
- **Expected finding:** depends on the probe. The page shows only the frontend; whether the plain adapter edits `items` is unknown. The board renders from the client-side initial state either way. If Claude can't change the board → level 1 ("no backend shown that writes the board state"). If the adapter's state tool works → ✅.
- **Probe:** open the modal and ask "Mark 'Build a prototype' as done and add a task 'Launch beta'." Check the TaskBoard (strike-through, new row).

## agent-readonly (sidebar, shared-state/agent-readonly)
- **Diff vs antigravity:** the tsx is identical. The Python is new: a Claude `agent.py` excerpt that appends `input_data.context` to `system` (antigravity had a different agent).
- **Files:** frontend unchanged. `backend/agents/agent_readonly.py`.
- **HARNESS:** the function around the excerpt, the base `system` prompt (quickstart's), the loop.
- **Expected finding: level 3 (minor).** The excerpt is a fragment (`system` and `input_data` come from an unseen function), but it is self-explanatory, and the default adapter route may also pass context. If the probe answers the name correctly → ✅ with a note. Note the doc's callout: values arrive as JSON strings, and the excerpt pastes the raw JSON (fine for prompting).
- **Probe:** "What is my name?" → "Ada Lovelace". Change the TextInput to "Grace Hopper" and ask again.

## state-streaming (in-content, shared-state/streaming; NEW folder)
- **Diff vs antigravity:** the antigravity page returned empty (0 bytes) when fetched here. Built from the claude page alone: `agent.py` branch (inside the tool-args handler), `state_streaming_backend.py`, src/DocumentView.tsx.
- **Files:** `MyCopilotApp/pages/state-streaming/{App.tsx, runtime.ts, src/DocumentView.tsx}` (DocumentView verbatim). `backend/agents/state_streaming.py`.
- **HARNESS:** App/ChatScreen. Backend: the streamed tool-args handler around the `agent.py` branch, the loop, the system prompt telling Claude to call `write_document`, passing `WRITE_DOCUMENT_TOOL_SCHEMA`, and the final-value save (prose says to do it, no code). `stream_document_state` is verbatim but unused, because it swallows text events and can't be the run's only stream as written.
- **Expected finding: level 1 (likely).** The page has a helper and a branch "inside the streamed tool-argument handler", but no handler, loop, prompt or wiring of the tool. Two overlapping versions of the same logic (the inline branch and `stream_document_state`) with no word on which to call. If the owner sees it as a fill-in, level 3.
- **Probe:** "Write a short poem about the sea." The document text should grow in DocumentView (several state snapshots) and the spinner should go away at the end.

## agent-config (in-content, from inspector; NEW folder)
- **Diff vs antigravity:** the Python is new: Claude `agent_config_agent.py` (Literals, `read_properties(forwarded_props)`, `build_system_prompt`), in place of antigravity's. Both pages have the `Backend flow` pseudocode and no RN frontend.
- **Files:** `MyCopilotApp/pages/agent-config/{App.tsx, runtime.ts, src/AgentConfigPanel.tsx}` (all HARNESS). `backend/agents/agent_config.py`.
- **HARNESS:** the whole frontend (a config panel publishing `{tone, expertise, responseLength}` via `useAgentContext`). Backend: imports, `_latest_config` (context first, then forwarded_props), the loop.
- **Expected finding: level 1.** There is no React Native frontend code. The page contradicts itself on the channel: the step says "reads configuration from shared state", the code reads `forwarded_props`, the prose says `useAgentContext` (and `<CopilotKit properties>` for the Built-in Agent, a web component). `latestValidConfig` is pseudocode. A reader has to guess both ends.
- **Probe:** select Tone=enthusiastic and Length=detailed, then ask "What is an API?". Compare with professional/concise.

## governed-actions (sidebar, human-in-the-loop/governed-actions)
- **Diff vs antigravity:** identical (0 diff lines). The same LangGraph `agent.py` is shown on both.
- **Files:** frontend unchanged (verbatim; runtime.ts → :8186). `backend/agents/governed_actions.py` keeps the doc's LangGraph code as a string. The served agent is the quickstart adapter, so only the `useHumanInTheLoop` path (`approve_governed_action`) can run.
- **HARNESS:** the adapter; the App root (existing).
- **Expected finding: level 1 / level 2 if the team doc already has it (the sister page is ❌, same reason).** The interrupt half's backend is LangGraph (`langchain_core`, `langgraph.types.interrupt`), the wrong framework, and the page shows no Claude Agent SDK way to emit an interrupt. The page points to useInterrupt for "other frameworks". The tool-call half may work.
- **Probe:** "Send an email to bob@example.com with subject Hi and body Hello. It needs approval first." Check that the approval card appears (via approve_governed_action), tap "Approve and run", and check the reply.

## hitl-headless (sidebar, human-in-the-loop/headless)
- **Diff vs antigravity:** identical (0 diff lines). No Python.
- **Files:** frontend unchanged (verbatim; runtime.ts → :8186; `src/ChatScreen.tsx` re-exports the quickstart one). `backend/agents/hitl_headless.py` = quickstart adapter.
- **HARNESS:** ChatScreen re-export, the adapter.
- **Expected finding: level 3** (App.tsx imports `./src/ChatScreen`, which the page never shows: it is the quickstart one). ✅ if the slot buttons appear and the answer goes back.
- **Probe:** "Schedule a meeting about the Q3 roadmap." The panel shows "Pick a slot for …" with Tue 3 PM / Wed 10 AM. Tap one; the agent confirms the time.

## subagents (sidebar, multi-agent/subagents)
- **Diff vs antigravity:** fully different backend. The Claude page has `_delegation_tool_schema` / `SUPERVISOR_TOOLS` (shown 3 times), `SUB_AGENT_PROMPTS`, `SUPERVISOR_SYSTEM_PROMPT` and `_invoke_sub_agent` (raw `anthropic.AsyncAnthropic`). Neither page has frontend code.
- **Files:** frontend unchanged (existing HARNESS DelegationLog, runtime.ts → :8186). `backend/agents/subagents.py`.
- **HARNESS:** imports, `run_subagents_agent` (the comment refers to "the subagents-delegation-flow region", which is not on the page), writing `delegations` (id-merged, as the callout asks), `normalize_claude_model`, `DEFAULT_ANTHROPIC_MODEL`. Only completed/failed entries are visible (no "running" state in the harness).
- **Expected finding: level 1.** The run loop that delegates and records `delegations` is missing (referenced, never shown). Undefined helpers and env (`ANTHROPIC_SUBAGENT_MODEL`). The "Rendering a live delegation log" section has no code at all. The prose describes the Built-in Agent's STATE_DELTA and a "LangGraph excerpt above" that isn't on this page.
- **Probe:** "Write a short blog paragraph about solar power." Check that `delegations: 3` appears with research/writing/critique entries, then a summary reply.
