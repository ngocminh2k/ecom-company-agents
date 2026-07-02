# OpenSEO Agent Integration Review

## Changes Reviewed
- `apps/daemon/src/server.ts`: Adjusted adapter registrations (`MockAdapter`, `ClaudeCodeAdapter`) to pass full `RuntimeAgentDef` configurations instead of zero-argument constructors.
- `apps/openseo/src/agents/onboarding/OnboardingChatAgent.ts`: New file implementing the `AIChatAgent`. It uses a Durable Object structure with SQLite state persistence, metering (Autumn billing integration), and integration with `ai` (Vercel AI SDK) for `streamText`.
- `apps/openseo/src/agents/onboarding/onboardingChatTools.ts`: Split tools definition out of the agent file. Uses Vercel AI SDK `tool` with Zod schemas. Connects to `DomainService` and `KeywordResearchService`.
- `apps/openseo/src/agents/onboarding/onboardingMarketTools.ts`: Separated market-focused tools (domain overview, SERP, competitors, backlinks) from core site tools.
- `packages/agent-adapter/src/adapters/claudeCodeAdapter.ts`: Removed duplicate `activeProcesses` definition.
- `packages/agent-adapter/src/baseAdapter.ts`: Changed `activeProcesses` from `private` to `protected` so child classes can access it.
- `packages/agent-adapter/src/index.ts`: Exported `MockAdapter` and `ClaudeCodeAdapter`.

## Architectural Observations & Suggestions

### 1. `AIChatAgent` Base Class Mocking/Import
In `OnboardingChatAgent.ts`, the `AIChatAgent` class is mocked out at the top of the file:
```typescript
// import { AIChatAgent } from "@cloudflare/ai-chat";
export class AIChatAgent {
  public messages: any[] = [];
  public name: string = "";
  constructor() {}
}
```
**Suggestion:** If we are migrating away from Cloudflare AI Chat, we should extract `AIChatAgent` into our own shared `packages/agent-adapter/src` or a dedicated interface file, rather than keeping an inline mock class in the production code.

### 2. Durable Object Persistence & Coupling
The `OnboardingChatAgent` documentation notes it's a Durable Object (DO) persisting to `this.messages`.
However, the inline mock of `AIChatAgent` does not provide the SQLite DO bindings. If this runs inside a standard Node/Bun worker (like our local ECC daemon) outside of Cloudflare Workers, `this.messages` will just be an in-memory array that resets on restart.
**Suggestion:** Decouple the state management. Pass a `StateAdapter` or `MessageRepository` to the agent instead of relying on the Cloudflare DO inherited state pattern.

### 3. Separation of Concerns in Tools
The separation between `onboardingChatTools.ts` (core tools) and `onboardingMarketTools.ts` (expensive tools) is excellent. It explicitly manages tool costs and context scopes.
**Suggestion:** The `ctx: ToolContext` approach is clean. Ensure `dfsClient` (DataForSEO client) handles rate-limiting internally, as parallelizing `DomainService.getOverview` and `DomainService.getSuggestedKeywords` might hit API limits under high concurrency.

### 4. Adapter Instantiation
In `daemon/src/server.ts`, the adapters now take massive inline objects:
```typescript
const claudeAdapter = new ClaudeCodeAdapter({
  id: 'claude-code',
  name: 'Claude Code',
  capabilities: { ... },
  // ...
})
```
**Suggestion:** Move these configurations into the adapter classes themselves as default properties or static factories (e.g., `ClaudeCodeAdapter.create()`) to prevent `server.ts` from becoming bloated as more adapters are added.

### 5. `AbortSignal` Handling
`options?.abortSignal` is passed to `streamText`, which is good for cancelling LLM requests if the client disconnects.
However, if the request is aborted, the `onFinish` block might not fire or might fire with partial usage.
**Suggestion:** Ensure that billing usage is still tracked correctly if the stream is aborted mid-generation.

## Summary
The port from Cloudflare AI Chat to a localized/agnostic Vercel AI SDK implementation is solid. The primary cleanup needed is formalizing the `AIChatAgent` base class (removing the inline mock) and abstracting the Durable Object state persistence so it functions correctly in our local ECC daemon environment.