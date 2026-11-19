// HARNESS: every line in this file is tester-written. The tool-rendering and state-rendering pages use these
// names (Emit, ExecuteTool, normalizeClaudeAgentSdkModel, zodShapeFromJsonSchema, runAgenticLoop) but never define them.
import { z } from "zod";
import type { BaseEvent } from "@ag-ui/core";

export type Emit = (event: BaseEvent) => void; // HARNESS: undefined on the page
export type ExecuteTool = ( // HARNESS: undefined on the page; shape read from its call in buildBackendToolServer
  toolName: string,
  toolInput: Record<string, unknown>,
  state: Record<string, unknown>,
  emit: Emit,
) => Promise<{ resultText: string; state?: Record<string, unknown> }>;

// HARNESS: undefined on the page; pass the model id through
export function normalizeClaudeAgentSdkModel(model: string): string {
  return model;
}

// HARNESS: undefined on the page; minimal JSON Schema -> zod raw shape for the sdk tool() call
export function zodShapeFromJsonSchema(schema: any): Record<string, z.ZodTypeAny> {
  const props = (schema?.properties ?? {}) as Record<string, any>;
  const required = new Set<string>(schema?.required ?? []);
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, prop] of Object.entries(props)) {
    let t: z.ZodTypeAny =
      prop.type === "string" ? z.string()
      : prop.type === "number" || prop.type === "integer" ? z.number()
      : prop.type === "boolean" ? z.boolean()
      : prop.type === "array" ? z.array(prop.items?.type === "string" ? z.string() : z.any())
      : z.any();
    if (prop.description) t = t.describe(prop.description);
    shape[key] = required.has(key) ? t : t.optional();
  }
  return shape;
}
