# AgentPulse Commerce — CLAUDE.md

> Dự án AI Agent Harness + E-Commerce Platform cho POD (Print on Demand) và Dropshipping.

## 🚨 Nguyên Tắc Tối Thượng

1. **LUÔN tạo branch mới** — không bao giờ commit trực tiếp vào `main`.
2. **Mọi thay đổi phải qua PR** — không merge nếu chưa review + E2E + user simulator.
3. **Kết quả phải DÙNG ĐƯỢC THẬT** — production code, không mock, không half-done, không "sẽ làm sau".
4. **E2E + User Simulator là gate cuối** — không kill, không bỏ qua.
5. **Không kill daemon (port 7456) hoặc web (port 20128)** — server đang chạy, giữ nguyên.

---

## Vòng Lặp Task BẮT BUỘC

Mỗi task — dù nhỏ — phải đi qua vòng lặp này. Không skip bước nào.

```
┌─────────────────────────────────────────────────────┐
│  0. Research & Reuse (gh search, docs, existing)    │
├─────────────────────────────────────────────────────┤
│  1. Plan — dùng planner agent → tạo branch          │
├─────────────────────────────────────────────────────┤
│  2. TDD — dùng tdd-guide agent → test trước         │
├─────────────────────────────────────────────────────┤
│  3. Implement — code thật, không mock, không agent   │
├─────────────────────────────────────────────────────┤
│  4. Code Review — dùng code-reviewer agent          │
├─────────────────────────────────────────────────────┤
│  5. E2E + User Simulator — e2e-runner agent          │
├─────────────────────────────────────────────────────┤
│  6. Commit → PR → Merge (feature branch → main)     │
├─────────────────────────────────────────────────────┤
│  7. Cập nhật codemaps + docs                        │
└─────────────────────────────────────────────────────┘
```

### Chi Tiết Từng Bước

#### Bước 0: Research & Reuse
- `gh search repos` / `gh search code` tìm implementation có sẵn
- Tra docs chính thức qua Context7 hoặc vendor docs
- Kiểm tra npm/PyPI/crates.io trước khi viết utility mới
- Nếu có open-source giải 80%+ bài toán → ưu tiên adopt/port

#### Bước 1: Plan + Branch

```bash
# Dùng planner agent (bắt buộc cho feature phức tạp)
# Sau đó tạo branch:
git checkout -b feat/<tên-ngắn-gọn>
```

- Feature phức tạp → **planner** agent
- Bug fix / new feature → **tdd-guide** agent
- Architectural decision → **architect** agent

#### Bước 2: TDD

```bash
# Viết test trước (RED)
# Implement tối thiểu để pass (GREEN)
# Refactor (IMPROVE)
pnpm test        # Unit + Integration
```

- Coverage tối thiểu: **80%**
- Dùng **tdd-guide** agent PROACTIVELY

#### Bước 3: Implement

- **Business logic = code thuần**, không agent fallback trong production
- CRUD, state machine, validation, calculation → TypeScript code
- Agent (Claude) CHỈ dùng cho creative/analytical tasks (research, copy, design)
- Tuân thủ `packages/ecommerce-core/` pattern (interface → service → storage)
- Route pattern: service dùng storage interface, route cung cấp SQLite adapter
- Immutability: luôn tạo mới, không mutate

#### Bước 4: Code Review

```bash
# Bắt buộc sau mọi code change
# Dùng code-reviewer agent
# Nếu có security implication → dùng security-reviewer agent
```

Checklist:
- [ ] CRITICAL issues fixed (block merge)
- [ ] HIGH issues resolved
- [ ] MEDIUM issues considered
- [ ] No hardcoded secrets
- [ ] Error handling explicit
- [ ] Input validation at boundaries

#### Bước 5: E2E + User Simulator (GATE CUỐI)

```bash
# Dùng e2e-runner agent
# Chạy user simulator — đóng vai end-user test thực tế
# Fix tất cả lỗi trước khi merge
```

- E2E phải pass 100%
- User simulator phải xác nhận trải nghiệm OK
- Nếu có lỗi → quay lại Bước 2

#### Bước 6: Commit → PR → Merge

```bash
# Commit message format:
<type>: <mô tả ngắn>

# Types: feat, fix, refactor, docs, test, chore, perf, ci

# Push + tạo PR:
git push -u origin <branch>
# Dùng /pr skill để tạo PR tự động
```

- PR cần: summary + test plan
- Merge chỉ khi review approved + E2E pass

#### Bước 7: Cập nhật Docs

```bash
# Chạy update-codemaps skill
/update-codemaps
```

---

## Branch Naming Convention

| Loại | Format | Ví dụ |
|------|--------|-------|
| Feature | `feat/<tên>` | `feat/etsy-listing` |
| Bug fix | `fix/<tên>` | `fix/amazon-nan-margin` |
| Refactor | `refactor/<tên>` | `refactor/agent-adapter` |
| Docs | `docs/<tên>` | `docs/codemap-update` |
| Chore | `chore/<tên>` | `chore/deps-update` |

---

## ECC Agents — Khi Nào Dùng

| Agent | Khi nào |
|-------|---------|
| **planner** | Feature phức tạp, refactoring lớn — dùng NGAY trước khi code |
| **tdd-guide** | Bug fix, new feature — test-first methodology |
| **code-reviewer** | SAU KHI viết code — quality + maintainability |
| **security-reviewer** | Auth, user input, DB queries, API endpoints |
| **architect** | Quyết định system design, scalability |
| **e2e-runner** | E2E testing, user simulator — gate cuối |
| **build-error-resolver** | Build/type errors — fix nhanh |
| **doc-updater** | Cập nhật codemaps, docs |

---

## Coding Standards

### Immutability (BẮT BUỘC)
```ts
// WRONG — mutate
item.status = 'active'

// CORRECT — return new copy
const updated = { ...item, status: 'active' }
```

### File Organization
- `packages/ecommerce-core/src/` — business logic THUẦN (entities, services, state machines)
- `apps/daemon/src/routes/` — Express routes (mỏng, chỉ wiring)
- `apps/web/src/` — Next.js pages + components
- Mỗi file < 800 dòng, mỗi hàm < 50 dòng

### Error Handling
- Validate đầu vào tại trust boundaries
- ValidationError cho business logic errors
- Không silent catch — handle explicit
- User-friendly message ở UI, detailed log ở server

### Naming
- `camelCase` cho functions/variables
- `PascalCase` cho types/interfaces/components
- `UPPER_SNAKE_CASE` cho constants
- `is`/`has`/`should` prefix cho booleans

### Performance Checklist
- [ ] No N+1 queries
- [ ] Pagination trên tất cả list endpoints
- [ ] Compositor-friendly properties cho animation (transform, opacity)
- [ ] Dynamic import cho heavy libraries

---

## Project Structure

```
apps/
  daemon/     Express + SQLite daemon (REST routes, port 7456)
  web/        Next.js 16 App Router frontend (port 20128)

packages/
  agent-adapter/   Agent interface + pool + routing matrix
  mcp-server/      MCP stdio protocol server
  skill-system/    SKILL.md parser + executor
  plugin-system/   Plugin manifest + pipeline
  design-system/   DESIGN.md parser + tokens CSS
  ecommerce-core/  Business logic (entities, services, state machines)
  contracts/       Shared TypeScript types
  cli/             CLI tooling
  ui/              Shared UI components

agents/            Agent personalities (SKILL.md format)
skills/            E-commerce skills
```

---

## Architecture Decisions (xem DECISIONS.md)

- **ADR-015**: Business logic = code thuần, KHÔNG agent fallback
- **ADR-016**: 11-phase delivery (domain → channels → fulfillment → finance → research → support → launch → BI → agents)
- **ADR-017**: User Experience Review Agent — mỗi phase xong phải có end-user test
- **Database**: SQLite via better-sqlite3 (local-first)
- **Runtime**: Node.js 22+, TypeScript ESM, pnpm workspace

---

## Running Servers (KHÔNG ĐỤNG VÀO)

| Service | Port | PID | Notes |
|---------|------|-----|-------|
| Daemon | 7456 | — | Express API server |
| Web | 20128 | — | Next.js frontend |

- Có thể restart nếu cần nhưng phải báo trước
- `pnpm dev` chạy cả daemon + web concurrently

---

## Quick Commands

```bash
pnpm dev              # Chạy daemon + web
pnpm test             # Unit + Integration tests
pnpm build            # Build tất cả packages
pnpm --filter @ngocminh2k/daemon dev   # Chỉ daemon
pnpm --filter @ngocminh2k/web dev      # Chỉ web
```
