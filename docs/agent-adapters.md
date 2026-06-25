# Agent Adapters

## Interface

Each CLI agent must implement the `AgentAdapter` interface:

```typescript
interface AgentAdapter {
  readonly id: string
  readonly name: string

  // PATH lookup + version detection
  detect(): Promise<AgentDetection | null>

  // Static capabilities
  capabilities(): AgentCapabilities

  // Execute a task (streaming events)
  run(params: AgentRunParams): AsyncIterable<AgentEvent>

  // Cancel running task
  cancel(runId: string): Promise<void>

  // Optional: resume interrupted run
  resume?(runId: string, msg: string): AsyncIterable<AgentEvent>
}
```

## Available Adapters

| Adapter | ID | CLI Command | Status |
|---------|-----|-------------|--------|
| Mock | mock | — (dev only) | ✅ |
| Claude Code | claude-code | `claude --print --output-format stream-json` | ✅ |
| Codex | codex | `codex exec --cwd <dir>` | 🔜 Planned |
| Cursor | cursor | `cursor-agent` | 🔜 Planned |
| Copilot | copilot | `copilot -p` | 🔜 Planned |
| Gemini | gemini | `gemini` | 🔜 Planned |

## Adding a New Adapter

1. Create `packages/agent-adapter/src/adapters/<name>Adapter.ts`
2. Extend `BaseAdapter` and implement all abstract methods
3. Register in `apps/daemon/src/server.ts` pool
4. Add routing rules in `routingMatrix.ts`

## Agent Events (Streaming Format)

```
thinking     → Agent is reasoning (shown as streaming text)
tool_call    → Agent wants to use a tool
tool_result  → Tool execution result
text_delta   → Generated text output
file_write   → File artifact created
error        → Error occurred
done         → Run completed (reason: completed|cancelled|error)
```
