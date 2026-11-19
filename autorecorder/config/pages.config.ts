/**
 * One entry per page of https://docs.copilotkit.ai/react-native/claude-sdk-typescript, in
 * assignment.json order (ids = assignment ids). Clips: CLAUDESDKTS-rn-<NN>-<videoName>.
 *
 * Demo: `route` is the device mirror's query (`/?page=<id>`); the take opens the page in the
 * Android app by deep link copilotqaclt://page/<id> and drives it through adb
 * (actions/android.actions.ts). Prompts and the send button label come from
 * tools/probe-prompts.json at take time; `prompt` here is only the fallback.
 * IDE tabs: the page's files under MyCopilotApp/pages/<id>/ (quickstart: VERSIONS.md, App.tsx,
 * src/ChatScreen.tsx, server.ts, index.js). Generated with full-file ranges: narrow them by hand.
 */
import { definePages } from '../core/types';

/** Registered but not recorded, with the reason printed on every run. */
export const SKIP_RECORDING: Record<string, string> = {
  'generative-ui': 'overview page, no code to run (N/A row, no route in the app)',
};

export const PAGES = definePages([
  {
    id: 'quickstart',
    name: "Quickstart (React Native)",
    videoName: 'Quickstart',
    docPath: '',
    route: '?page=quickstart',
    ideFile: 'VERSIONS.md',
    startLine: 6,
    endLine: 9,
    extraTabs: [
      { filePath: 'MyCopilotApp/App.tsx', startLine: 1, endLine: 17 },
      { filePath: 'MyCopilotApp/src/ChatScreen.tsx', startLine: 1, endLine: 82 },
      { filePath: 'MyCopilotApp/server.ts', startLine: 1, endLine: 26 },
      { filePath: 'MyCopilotApp/index.js', startLine: 1, endLine: 10 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'prebuilt-components',
    name: "Prebuilt Components",
    videoName: 'PrebuiltComponents',
    docPath: 'prebuilt-components',
    route: '?page=prebuilt-components',
    ideFile: 'MyCopilotApp/pages/prebuilt-components/App.tsx',
    startLine: 1,
    endLine: 25,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/prebuilt-components/BottomSheetApp.tsx', startLine: 1, endLine: 30 },
      { filePath: 'MyCopilotApp/pages/prebuilt-components/DropInApp.tsx', startLine: 1, endLine: 21 },
      { filePath: 'MyCopilotApp/pages/prebuilt-components/PopupApp.tsx', startLine: 1, endLine: 17 },
      { filePath: 'MyCopilotApp/pages/prebuilt-components/PropsApp.tsx', startLine: 1, endLine: 19 },
      { filePath: 'MyCopilotApp/pages/prebuilt-components/runtime.ts', startLine: 1, endLine: 13 },
      { filePath: 'agent/src/pages/prebuilt-components.ts', startLine: 1, endLine: 12 },
      { filePath: 'MyCopilotApp/pages/prebuilt-components/src/AssistantPopup.tsx', startLine: 1, endLine: 47 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'markdown',
    name: "Markdown Rendering",
    videoName: 'MarkdownRendering',
    docPath: 'custom-look-and-feel/markdown',
    route: '?page=markdown',
    ideFile: 'MyCopilotApp/pages/markdown/App.tsx',
    startLine: 1,
    endLine: 13,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/markdown/runtime.ts', startLine: 1, endLine: 13 },
      { filePath: 'agent/src/pages/markdown.ts', startLine: 1, endLine: 12 },
      { filePath: 'MyCopilotApp/pages/markdown/src/AssistantBubble.tsx', startLine: 1, endLine: 19 },
      { filePath: 'MyCopilotApp/pages/markdown/src/ChatScreen.tsx', startLine: 1, endLine: 69 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'headless-ui',
    name: "Headless UI",
    videoName: 'HeadlessUi',
    docPath: 'custom-look-and-feel/headless-ui',
    route: '?page=headless-ui',
    ideFile: 'MyCopilotApp/pages/headless-ui/App.tsx',
    startLine: 1,
    endLine: 26,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/headless-ui/runtime.ts', startLine: 1, endLine: 13 },
      { filePath: 'agent/src/pages/headless-ui.ts', startLine: 1, endLine: 12 },
      { filePath: 'MyCopilotApp/pages/headless-ui/src/ChatScreen.tsx', startLine: 1, endLine: 130 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'multimodal-attachments',
    name: "Multimodal Attachments",
    videoName: 'MultimodalAttachments',
    docPath: 'multimodal-attachments',
    route: '?page=multimodal-attachments',
    ideFile: 'MyCopilotApp/pages/multimodal-attachments/App.tsx',
    startLine: 1,
    endLine: 14,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/multimodal-attachments/runtime.ts', startLine: 1, endLine: 13 },
      { filePath: 'agent/src/pages/multimodal-attachments.ts', startLine: 1, endLine: 12 },
      { filePath: 'MyCopilotApp/pages/multimodal-attachments/src/ChatScreen.tsx', startLine: 1, endLine: 57 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'frontend-tools',
    name: "Frontend Tools",
    videoName: 'FrontendTools',
    docPath: 'frontend-tools',
    route: '?page=frontend-tools',
    ideFile: 'MyCopilotApp/pages/frontend-tools/App.tsx',
    startLine: 1,
    endLine: 19,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/frontend-tools/runtime.ts', startLine: 1, endLine: 14 },
      { filePath: 'MyCopilotApp/pages/frontend-tools/src/TaskScreen.tsx', startLine: 1, endLine: 26 },
      { filePath: 'agent/src/pages/frontend-tools.ts', startLine: 1, endLine: 42 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'generative-ui',
    name: "Overview",
    videoName: 'Overview',
    docPath: 'generative-ui',
    route: '?page=generative-ui',
    // Overview page: no code to run, nothing to drive on the device.
    docOnly: true,
    ideFile: 'MyCopilotApp/App.tsx',
    startLine: 1,
    endLine: 1,
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'tool-based',
    name: "Components as Tools",
    videoName: 'ComponentsAsTools',
    docPath: 'generative-ui/tool-based',
    route: '?page=tool-based',
    ideFile: 'MyCopilotApp/pages/tool-based/App.tsx',
    startLine: 1,
    endLine: 15,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/tool-based/runtime.ts', startLine: 1, endLine: 14 },
      { filePath: 'MyCopilotApp/pages/tool-based/src/BarChart.tsx', startLine: 1, endLine: 39 },
      { filePath: 'MyCopilotApp/pages/tool-based/src/ChatScreen.tsx', startLine: 1, endLine: 14 },
      { filePath: 'agent/src/pages/tool-based.ts', startLine: 1, endLine: 42 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'tool-rendering',
    name: "Tool Call Rendering",
    videoName: 'ToolCallRendering',
    docPath: 'generative-ui/tool-rendering',
    route: '?page=tool-rendering',
    ideFile: 'MyCopilotApp/pages/tool-rendering/App.tsx',
    startLine: 1,
    endLine: 25,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/tool-rendering/runtime.ts', startLine: 1, endLine: 14 },
      { filePath: 'MyCopilotApp/pages/tool-rendering/src/ToolCallCard.tsx', startLine: 1, endLine: 20 },
      { filePath: 'MyCopilotApp/pages/tool-rendering/src/WeatherCard.tsx', startLine: 1, endLine: 34 },
      // HARNESS addition the finding is about: imports and helpers the adapter excerpts never define
      { filePath: 'agent/src/pages/tool-rendering.ts', startLine: 1, endLine: 60, addedText: 'import { type Emit, type ExecuteTool, normalizeClaudeAgentSdkModel, zodShapeFromJsonSchema } from "./_genui-harness.js"; // HARNESS: helpers never defined on the page' },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'shared-state',
    name: "Shared State",
    videoName: 'SharedState',
    docPath: 'shared-state',
    route: '?page=shared-state',
    ideFile: 'MyCopilotApp/pages/shared-state/App.tsx',
    startLine: 1,
    endLine: 22,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/shared-state/runtime.ts', startLine: 1, endLine: 13 },
      { filePath: 'MyCopilotApp/pages/shared-state/src/LanguageButton.tsx', startLine: 1, endLine: 26 },
      { filePath: 'MyCopilotApp/pages/shared-state/src/NotesCard.tsx', startLine: 1, endLine: 36 },
      // FINDINGS.md #9: the runner the page calls but never shows
      { filePath: 'agent/src/pages/shared-state.ts', startLine: 354, endLine: 447, addedText: 'export async function runAgenticLoop(' },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'shared-state-rendering',
    name: "Render agent state in your app",
    videoName: 'RenderAgentStateInYourApp',
    docPath: 'shared-state/rendering-in-app',
    route: '?page=shared-state-rendering',
    ideFile: 'MyCopilotApp/pages/shared-state-rendering/App.tsx',
    startLine: 1,
    endLine: 26,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/shared-state-rendering/runtime.ts', startLine: 1, endLine: 13 },
      { filePath: 'MyCopilotApp/pages/shared-state-rendering/src/TaskBoard.tsx', startLine: 1, endLine: 60 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'agent-readonly',
    name: "Agent Read-Only Context",
    videoName: 'AgentReadOnlyContext',
    docPath: 'shared-state/agent-readonly',
    route: '?page=agent-readonly',
    ideFile: 'MyCopilotApp/pages/agent-readonly/App.tsx',
    startLine: 1,
    endLine: 32,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/agent-readonly/runtime.ts', startLine: 1, endLine: 13 },
      { filePath: 'MyCopilotApp/pages/agent-readonly/src/ProfileScreen.tsx', startLine: 1, endLine: 29 },
      { filePath: 'agent/src/pages/agent-readonly.ts', startLine: 1, endLine: 24 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'hitl',
    name: "HITL Overview",
    videoName: 'HitlOverview',
    docPath: 'human-in-the-loop',
    route: '?page=hitl',
    ideFile: 'MyCopilotApp/pages/hitl/App.tsx',
    startLine: 1,
    endLine: 23,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/hitl/runtime.ts', startLine: 1, endLine: 13 },
      { filePath: 'MyCopilotApp/pages/hitl/src/MeetingApproval.tsx', startLine: 1, endLine: 44 },
      // the page shows no agent; served by the quickstart adapter
      { filePath: 'agent/src/rn-genui.ts', startLine: 19, endLine: 30 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'use-interrupt',
    name: "Pausing the Agent for Input",
    videoName: 'PausingTheAgentForInput',
    docPath: 'human-in-the-loop/useInterrupt',
    route: '?page=use-interrupt',
    ideFile: 'MyCopilotApp/pages/use-interrupt/App.tsx',
    startLine: 1,
    endLine: 13,
    extraTabs: [
      // the page's backend snippet renders as 'snippet skipped'; served by the quickstart adapter
      { filePath: 'agent/src/rn-genui.ts', startLine: 19, endLine: 30 },
      { filePath: 'MyCopilotApp/pages/use-interrupt/runtime.ts', startLine: 1, endLine: 13 },
      { filePath: 'MyCopilotApp/pages/use-interrupt/src/MeetingChat.tsx', startLine: 1, endLine: 25 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'hitl-headless',
    name: "Headless Interrupts",
    videoName: 'HeadlessInterrupts',
    docPath: 'human-in-the-loop/headless',
    route: '?page=hitl-headless',
    ideFile: 'MyCopilotApp/pages/hitl-headless/App.tsx',
    startLine: 1,
    endLine: 18,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/hitl-headless/runtime.ts', startLine: 1, endLine: 13 },
      { filePath: 'MyCopilotApp/pages/hitl-headless/src/ChatScreen.tsx', startLine: 1, endLine: 3 },
      { filePath: 'MyCopilotApp/pages/hitl-headless/src/MeetingRequestPanel.tsx', startLine: 1, endLine: 50 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'governed-actions',
    name: "Governed Action Approval UI",
    videoName: 'GovernedActionApprovalUi',
    docPath: 'human-in-the-loop/governed-actions',
    route: '?page=governed-actions',
    ideFile: 'MyCopilotApp/pages/governed-actions/App.tsx',
    startLine: 1,
    endLine: 25,
    extraTabs: [
      // FINDINGS.md #14: page's agent is LangGraph; the served Claude adapter is HARNESS
      { filePath: 'agent/src/pages/governed-actions.ts', startLine: 1, endLine: 49 },
      { filePath: 'MyCopilotApp/pages/governed-actions/runtime.ts', startLine: 1, endLine: 13 },
      { filePath: 'MyCopilotApp/pages/governed-actions/src/GovernedActionApproval.tsx', startLine: 1, endLine: 40 },
      { filePath: 'MyCopilotApp/pages/governed-actions/src/GovernedActionCard.tsx', startLine: 1, endLine: 56 },
      { filePath: 'MyCopilotApp/pages/governed-actions/src/GovernedActionTool.tsx', startLine: 1, endLine: 37 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'webmcp',
    name: "WebMCP",
    videoName: 'Webmcp',
    docPath: 'webmcp',
    route: '?page=webmcp',
    ideFile: 'MyCopilotApp/pages/webmcp/App.tsx',
    startLine: 1,
    endLine: 27,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/webmcp/runtime.ts', startLine: 1, endLine: 13 },
      { filePath: 'MyCopilotApp/pages/webmcp/webmcp.ts', startLine: 1, endLine: 26 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'subagents',
    name: "Sub-agents",
    videoName: 'SubAgents',
    docPath: 'multi-agent/subagents',
    route: '?page=subagents',
    ideFile: 'MyCopilotApp/pages/subagents/App.tsx',
    startLine: 1,
    endLine: 34,
    // FINDINGS.md #16: the delegation log is not on the page
    ideAddedText: '// HARNESS: not on the page (the reader must write their own delegation log)',
    extraTabs: [
      { filePath: 'agent/src/pages/subagents.ts', startLine: 115, endLine: 161, addedText: 'const anthropic = new Anthropic(); // HARNESS: reads ANTHROPIC_API_KEY' },
      { filePath: 'MyCopilotApp/pages/subagents/runtime.ts', startLine: 1, endLine: 12 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'inspector',
    name: "Inspector",
    videoName: 'Inspector',
    docPath: 'inspector',
    route: '?page=inspector',
    ideFile: 'MyCopilotApp/pages/inspector/App.tsx',
    startLine: 1,
    endLine: 16,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/inspector/runtime.ts', startLine: 1, endLine: 13 },
    ],
    // Overridden per take by tools/probe-prompts.json when it has this page.
    prompt: "Say hello in one short sentence",
  },
  {
    id: 'state-rendering',
    name: "State Rendering",
    videoName: 'StateRendering',
    docPath: 'generative-ui/state-rendering',
    route: '?page=state-rendering',
    ideFile: 'MyCopilotApp/pages/state-rendering/App.tsx',
    startLine: 1,
    endLine: 19,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/state-rendering/runtime.ts', startLine: 1, endLine: 14 },
      { filePath: 'MyCopilotApp/pages/state-rendering/src/ResearchProgress.tsx', startLine: 1, endLine: 30 },
      // runner and helpers never shown
      { filePath: 'agent/src/pages/state-rendering.ts', startLine: 186, endLine: 245, addedText: 'async function runAgenticLoop( // HARNESS' },
    ],
    prompt: "Write a short report on solar power",
  },
  {
    id: 'state-streaming',
    name: "State Streaming",
    videoName: 'StateStreaming',
    docPath: 'shared-state/streaming',
    route: '?page=state-streaming',
    ideFile: 'MyCopilotApp/pages/state-streaming/App.tsx',
    startLine: 1,
    endLine: 20,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/state-streaming/runtime.ts', startLine: 1, endLine: 14 },
      { filePath: 'MyCopilotApp/pages/state-streaming/src/DocumentView.tsx', startLine: 1, endLine: 20 },
      // FINDINGS.md #18: the handler around the page's branch is HARNESS
      { filePath: 'agent/src/pages/state-streaming.ts', startLine: 120, endLine: 184, addedText: 'export function registerStateStreaming(app: Express) { // HARNESS: route never shown' },
    ],
    prompt: "Write a short poem about the sea",
  },
  {
    id: 'programmatic-control',
    name: "Programmatic Control",
    videoName: 'ProgrammaticControl',
    docPath: 'programmatic-control',
    route: '?page=programmatic-control',
    ideFile: 'MyCopilotApp/pages/programmatic-control/App.tsx',
    startLine: 1,
    endLine: 51,
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/programmatic-control/runtime.ts', startLine: 1, endLine: 14 },
      { filePath: 'agent/src/pages/programmatic-control.ts', startLine: 1, endLine: 12 },
      { filePath: 'MyCopilotApp/pages/programmatic-control/src/AgentTrigger.tsx', startLine: 1, endLine: 37 },
      { filePath: 'MyCopilotApp/pages/programmatic-control/src/useMeetingRequest.ts', startLine: 1, endLine: 29 },
    ],
    prompt: "Summarize the latest sales data",
  },
  {
    id: 'agent-config',
    name: "Agent Config",
    videoName: 'AgentConfig',
    docPath: 'agent-config',
    route: '?page=agent-config',
    ideFile: 'MyCopilotApp/pages/agent-config/App.tsx',
    startLine: 1,
    endLine: 20,
    // FINDINGS.md #20: no React Native frontend on the page
    ideAddedText: 'import { AgentConfigPanel } from "./src/AgentConfigPanel"; // HARNESS: not on the page',
    extraTabs: [
      { filePath: 'MyCopilotApp/pages/agent-config/runtime.ts', startLine: 1, endLine: 14 },
      { filePath: 'MyCopilotApp/pages/agent-config/src/AgentConfigPanel.tsx', startLine: 1, endLine: 39 },
      { filePath: 'agent/src/pages/agent-config.ts', startLine: 1, endLine: 110, addedText: 'function latestValidConfig(context: RunAgentInput["context"]): Record<string, unknown> {' },
    ],
    prompt: "What is an API?",
  },
]);
