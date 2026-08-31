# Omnichannel Chat Platform — Full Project Analysis & Roadmap

> **Repo:** `automate-biz` (dir: `automate-sales`) · **Analyzed:** 2026-08-18
> **Analyzed commit:** `43957e6` on branch `cli` · **Last commit date:** 2024-02-29
> **Stated goal:** a WhatsApp-clone omnichannel inbox — receive & reply to WhatsApp, Instagram, Facebook, SMS (Twilio), email and more from one chat UI, plus a public-facing web chat widget.
>
> 📐 **Architecture design and revised roadmap: [`ARCHITECTURE.md`](./ARCHITECTURE.md)** — Supabase migration, where the ORM lives, cross-channel identity, multi-org, and the Odoo and CRM integration plan. Written after the decisions in §10 were answered.

---

## 0. Executive summary

You built a **solid, working single-channel product** (WhatsApp Business Cloud API) with a genuinely impressive breadth of message-type support — text, image, video, audio (with webm→ogg transcoding), documents, stickers, location, contact cards, link previews, templates, delivery receipts, read receipts, typing indicators, and "seen by" tracking. There are ~77 Cypress E2E assertions covering it. That is a lot more than most side projects get to.

The problem is not the code quality of what exists. It's three things:

1. **The abstraction was never built.** The whole system is hardcoded to WhatsApp — the database column is literally `whatsapp_id`, the route is `/whatsapp`, the SDK is `sdk/whatsapp.ts`. Every new channel currently means a schema migration plus a parallel copy of the entire pipeline. You already discovered this: the unmerged `ig` branch had to rename `whatsapp_id` → `source_id` across the whole codebase just to add one channel. **This is the single biggest thing to fix, and it's the prerequisite for everything else on your list.**

2. **It is not safe to expose to the internet in its current state.** There is no authentication on the outbound-message endpoint, none on the Socket.IO connection (which broadcasts *every* message of *every* conversation to *every* connected client), none on any of the Next.js server actions, and the Terraform opens Postgres to `0.0.0.0/0`. Details in §6.1 — there are 9 findings I'd call blocking.

3. **It's been dormant for ~2.5 years and won't build as-is.** Turborepo config uses the removed v1 `pipeline` schema, ~15 dependencies are pinned to the string `"latest"` (so the lockfile and the manifests disagree about reality), Node 24 / pnpm 9 are installed locally against a `packageManager: pnpm@8.6.10` pin and a v6 lockfile, and there are **no Prisma migrations at all** — the deploy path is `prisma db push --accept-data-loss`.

**My recommendation on architecture:** the current two-service split (Next.js reading Postgres directly + Express writing to the same Postgres) draws the boundary in the wrong place and is the root cause of the duplicated query logic. Collapse to a **modular monolith with a channel-adapter layer and an async ingest queue** — one Next.js app for the UI and API, one worker process, adapters as workspace packages. Full reasoning in §5.

**Realistic effort to reach "production-ready omnichannel with a web widget":** roughly 10–14 weeks of focused solo work. Phases 0–2 (~4 weeks) are the ones that unblock everything else. There is a "what I'd do first" 3-day list in §9.

---

## 1. Current state at a glance

| Dimension | State | Notes |
|---|---|---|
| **Builds today?** | ❌ No | Turbo v1 config, `"latest"` specifiers, toolchain drift |
| **Channels live** | 1 of ~6 | WhatsApp only. Instagram exists on an unmerged branch |
| **Web chat widget** | ❌ Not started | The second client in your goal doesn't exist |
| **Auth on the app** | ⚠️ Partial | Magic-link login works; nothing behind it is actually gated |
| **Auth on the API** | ❌ None | Send endpoint + Socket.IO are fully open |
| **DB migrations** | ❌ None | `db push --accept-data-loss` only |
| **Async processing** | ❌ None | Webhooks do S3 + LLM + CRM calls inline before ACK |
| **Horizontal scale** | ❌ No | In-memory Socket.IO adapter; single instance only |
| **Tests** | ⚠️ E2E only | 77 Cypress assertions, 0 unit/integration tests |
| **CI** | ⚠️ Minimal | One workflow, runs E2E via docker-compose; no lint/typecheck gate |
| **Deploy** | ⚠️ Broken | Terraform never successfully applied (see §6.4) |
| **Observability** | ❌ None | `pino` on the server, 76 stray `console.log` calls, no tracing/metrics/alerts |
| **Multi-tenant** | ❌ No | Single business, single phone number, hardcoded Monday board IDs |

**Code volume (excluding lockfiles/generated):** ~4,600 lines of TypeScript across 2 apps and 8 packages. 66 commits, 16 branches, 7 of them unmerged with real work on them.

---

## 2. Inventory — what's actually in here

### 2.1 Apps

#### `apps/automation-server` — Express + Socket.IO (3 source files, ~530 lines)
The ingest and egress service.

- `src/app.ts` (79 ln) — Express bootstrap, optional TLS from local PEM files, CORS locked to `CLIENT_URL`, Socket.IO server, raw-body capture for signature verification. Handles two socket events: `typing` (rebroadcast) and `seen_by` (DB write).
- `src/routes/whatsapp.ts` (271 ln) — the heart of the system. Three endpoints:
  - `GET /whatsapp/webhook` — Meta subscription handshake.
  - `POST /whatsapp/webhook` — inbound messages and status updates. Validates the Meta signature, parses the message, writes the chat, downloads and re-uploads media to S3, emits over Socket.IO, then optionally runs sentiment analysis, demographic extraction, and a Monday.com item creation.
  - `POST /whatsapp/message` — outbound. Accepts JSON or multipart, creates the chat row, uploads media, calls the WhatsApp Graph API, marks prior inbound chats as responded.
- `src/utils/prisma.ts` (176 ln) — data access. Transactional contact upsert + chat create, status-update conflict handling, `setRespondedChats`, `setSeenByChats`.

#### `apps/chat-client` — Next.js 14 App Router (~1,500 lines of TSX)
The agent-facing inbox.

- **Auth** — NextAuth v4, email magic-link via nodemailer, Prisma adapter, sign-in restricted to three hardcoded email domains (`torus-digital.com`, `ergonomicadesk.com`, `nauralsleep.com`). There's a stubbed-out `mondayAuth` path for embedding the app inside Monday.com.
- **Pages** — `/` (sidebar + placeholder "Hola"), `/contacts/[id]` (the actual chat view), `/contacts` (redirects to `/`).
- **Components** — `side-bar` + `side-bar-content` (conversation list with unread badge, live-updating over Socket.IO), `chat-history` + `chat-history-content` (message list, socket subscriptions, "get previous chats" pagination), `message-box` (190 ln — renders 9 distinct message types with per-type status icons), `chat-bar` (186 ln — composer with attachments menu, camera capture, in-browser audio recording, contact picker, sticker picker, emoji picker, and template selection), `contact-info`, `top-bar`, `user-menu`, `alert`.
- **Server actions** (`_actions.ts`) — `searchAction`, `getContacts`, `getChatHistory`, `sendMessage`, `getTemplates`.
- **Tests** — 7 Cypress specs, 77 `it()` blocks: login, sidebar, search, create contact, receive message (23), send message (18), status updates (15).

### 2.2 Packages

| Package | Lines | Purpose | Assessment |
|---|---|---|---|
| `sdk` | ~1,500 | WhatsApp Graph API, S3/minio, OpenAI, Monday.com GraphQL, phone normalization, ffmpeg audio conversion, OG link scraping, country codes | **The most valuable asset here.** Well-factored, genuinely reusable. Should become `packages/channels/*` |
| `database` | ~40 + schema | Prisma client re-export, schema, seed script | Schema needs redesign (§6.3); no migrations |
| `cli` | ~500 | oclif CLI. `automate dev` (docker-compose + turbo dev), `automate monday generate <board>` (scaffolds Monday boards from definitions) | Newest work. Tests reference `hello:world` commands that don't exist → `pnpm test` fails |
| `test-data` | — | Seed fixtures: contacts, chats, media | Fine |
| `ui` | 25 | **One placeholder component** rendering "hello" and "sopa" | Dead weight — either build a real design system here or delete it |
| `tsconfig`, `eslint-config-custom`, `tailwind-config` | — | Shared configs | Fine, standard Turborepo |

### 2.3 Infrastructure

- `main.tf` — RDS Postgres (`db.t3.micro`), public S3 media bucket, IAM user with S3 CRUD, commented-out CloudFront distribution.
- `server.tf` — EC2 `t3.micro` running the server container via `user_data`, ACM cert, classic ELB, Route53 records.
- `client.tf` — Vercel project + deployment with env vars wired from Terraform.
- `docker-compose.yml` — local Postgres, minio, ngrok.
- `docker-compose-test.yml` — full E2E stack including both apps.
- `.github/workflows/test.yml` — install → build → run E2E in docker-compose.
- `gh-actions/` — three **unused, non-functional draft** workflows (reference `apps/nextjs-app` which doesn't exist, `yarn` which isn't used, node 14, `your-package-name` placeholders).
- Shell scripts: `deploy.sh`, `docker_build.sh`, `docker_run.sh`, `test.sh`, `conditional-copy.sh`.

### 2.4 Unmerged branches — there's real work stranded here

| Branch | Last commit | What's on it | Verdict |
|---|---|---|---|
| **`ig`** | 2024-02-29 | **1,992 lines.** `packages/sdk/instagram.ts` + 8 supporting JS modules, `routes/instagram.ts` (229 ln), 427 lines of new Cypress specs, **and the full `whatsapp_id`→`source_id` / `chat_source` schema generalization** | **Highest-value branch.** Mine the schema generalization and the IG adapter |
| **`multinumber`** | 2024-02-29 | `PhoneNumber` model — per-number `whatsapp_phone_id` / `business_id` / `api_token`, `Chat.business_phone` FK | The right idea for multi-tenancy. Design is sound, keep it |
| **`monday_integration`** | 2024-02-29 | OpenAI function-calling for consistent JSON responses | Worth harvesting — fixes the `JSON.parse` fragility in §6.2 |
| **`audio_text`** | 2023-12-20 | Whisper audio→text transcription | Nice-to-have, harvest later |
| `rm`, `features`, `data_extraction`, `tests`, `tests_2`, `form-refactoring`, `template_message`, `docs`, `env_example` | 2023-11 → 2024-02 | Mostly merged or superseded | Delete after confirming |

⚠️ **Note:** the current branch `cli` **deleted `.env_example`** (it exists on `master`). Restore it.

---

## 3. What actually works today

Being fair to the project — this is a real feature list, not a skeleton:

**Inbound (WhatsApp)**
- ✅ Webhook subscription handshake + HMAC signature validation
- ✅ Text, image, video, audio, document, sticker, location, contact-card messages
- ✅ Automatic link detection with OpenGraph preview scraping (title/description/image)
- ✅ Media downloaded from Meta's Media API and re-hosted on S3/minio
- ✅ Contact auto-created/upserted on first message, with E.164 phone normalization and country inference across a 187-entry country-code table
- ✅ Delivery status ingestion (sent → delivered → read → failed) with out-of-order guard

**Outbound (WhatsApp)**
- ✅ Text, media (any of the above types), and approved template messages with `{{param}}` substitution
- ✅ In-browser audio recording, transcoded webm→ogg/opus via ffmpeg (WhatsApp requires opus)
- ✅ Camera capture, sticker picker, contact picker, emoji picker
- ✅ Media uploaded to Meta's Media API, then referenced by ID

**Inbox UX**
- ✅ Live conversation list, ordered by recency, with unread indicator
- ✅ Live message stream via Socket.IO — new messages and status changes appear without refresh
- ✅ Typing indicator, "seen by" per-agent tracking
- ✅ Cross-conversation search over contact names and message bodies
- ✅ Per-message status icons distinguishing incoming-unanswered / answered / sent / delivered / read / failed
- ✅ Response tracking: sending a reply retroactively marks all prior inbound messages as `responded` with timestamp and agent

**Enrichment (all optional, env-flagged)**
- ✅ `SENTIMENT_ANALYSIS` — language detection, sentiment, and emotional-insight tagging
- ✅ `DATA_EXTRACTION` — pulls name/email/nationality/ID/gender/birthdate/company/job title/interests from conversation text into the contact record
- ✅ `CRM_INTEGRATION` — mirrors every chat into a Monday.com board

**Dev experience**
- ✅ One-command local stack (Postgres + minio + ngrok static tunnel)
- ✅ Seeded test data including real media fixtures
- ✅ Prisma Studio + minio console for data browsing
- ✅ Full E2E suite runnable in docker-compose, wired into CI
- ✅ Detailed README covering Meta app setup, ngrok, Gmail app passwords

---

## 4. What's missing vs. your stated goal

### 4.1 Channels

| Channel | Status | What's needed |
|---|---|---|
| WhatsApp | ✅ Done | Refactor onto the adapter interface |
| Instagram DM | 🟡 On `ig` branch, unmerged | Merge, port to adapter, finish tests |
| Facebook Messenger | ❌ | Shares the Meta Graph pipeline with IG — cheapest channel to add once IG lands |
| SMS (Twilio) | ❌ | Different signature scheme (`X-Twilio-Signature`), different status callbacks, no media API (uses public URLs) |
| Email | ❌ | Hardest one. Needs IMAP/inbound-parse ingestion, threading via `Message-ID`/`In-Reply-To`, HTML sanitization, attachment handling, quoted-reply stripping |
| **Web chat widget** | ❌ | **Your second stated client.** Doesn't exist at all — see §4.3 |
| Telegram | ❌ | Easy add once the adapter exists |

### 4.2 Product capabilities absent from the inbox

- **Conversation assignment / ownership** — no concept of "this conversation is mine". Every agent sees everything, everyone gets every notification. This is the #1 thing that makes a shared inbox usable by more than one person.
- **Conversation state** — no open/pending/snoozed/closed lifecycle. `ContactStatus` is a CRM funnel stage, not an inbox state.
- **WhatsApp 24-hour window enforcement** — outside 24h of the last inbound message, WhatsApp *only* accepts templates. The app has templates but no window tracking, so sends will silently fail with an API error and the agent gets no explanation.
- **Template management** — the `Template` table exists but nothing populates it. No sync from Meta's template API, no creation/submission flow, no approval-status display.
- **Contact CRUD** — `/contacts` just redirects to `/`. There's a Cypress spec for creating a contact but no UI. No merge/dedupe for the same human arriving on two channels — which is the *core* value proposition of an omnichannel inbox.
- **Notes, tags, canned responses** — none.
- **Notifications** — no browser/push/sound/email notification when a message arrives.
- **Attachments UX** — no upload progress, no drag-and-drop, no paste-to-upload, no client-side size/type validation.
- **Message actions** — no reply-to-quote, no reactions, no forwarding, no delete, no edit.
- **Bulk / broadcast** — no way to send a template to a segment.
- **Reporting** — the schema captures `response_time` and `respondedAt` but nothing surfaces them. No first-response-time, resolution-time, or volume-by-channel dashboards.

### 4.3 The web chat widget (a project in itself)

Nothing exists. What it requires:

- An **embeddable script** (`<script src="…/widget.js">`) that mounts an isolated UI — Shadow DOM or iframe so host-page CSS can't break it. Must be tiny (target < 40 KB gzipped), so build it with Preact or vanilla, *not* by reusing the Next.js app.
- **Anonymous visitor identity** — a signed, httpOnly-ish token in localStorage that survives reloads and can later be linked to a real contact when the visitor gives an email/phone.
- **A public ingest API** with a per-site public key, strict origin allow-listing, aggressive rate limiting, and bot/abuse protection. This is your only *unauthenticated write* surface — it needs the most hardening in the system.
- **Realtime transport** the widget can reach — which forces the realtime decision in §5.
- **Offline/away handling** — capture email when no agent is online, continue the thread by email.
- Pre-chat forms, typing indicators, read receipts, file upload, unread badge, sound, mobile viewport handling.

---

## 5. Architecture: what you have, what I'd change

### 5.1 Current architecture

```
                       Meta Cloud API
                             │ webhook (HTTPS, HMAC-SHA1)
                             ▼
  ┌──────────────────────────────────────────┐
  │  automation-server (Express, EC2 t3.micro)│
  │  • verify signature                       │
  │  • parse message                          │───► S3 / minio  (public bucket)
  │  • write Chat + Contact  ─────────────┐   │
  │  • download+upload media              │   │───► OpenAI  (sentiment, extraction)
  │  • emit socket event                  │   │───► Monday.com (CRM mirror)
  │  • POST /message → Graph API           │   │
  └───────────────┬───────────────────┬───┘   │
                  │ Socket.IO         │       │
                  │ (in-memory,       │       │
                  │  broadcast-to-all)│       ▼
                  ▼                   │  ┌──────────┐
  ┌────────────────────────────────┐  └─►│ Postgres │
  │  chat-client (Next.js, Vercel) │◄────┤ (RDS)    │
  │  • server components query DB  │     └──────────┘
  │    DIRECTLY via Prisma         │          ▲
  │  • server actions read DB      │──────────┘
  │  • sends POST to Express       │
  └────────────────────────────────┘
```

### 5.2 The eight structural problems

**1. The service boundary is in the wrong place.**
Next.js reads Postgres directly (`side-bar.tsx:12`, `contact-info.tsx:26`, `_actions.ts:4`, `utils.ts:10`) *and* Express writes to Postgres. There is no single owner of the data. The direct consequence: the exact same 40-line contact-search query is duplicated verbatim in `side-bar.tsx:14-70` and `_actions.ts:6-59`. Any schema change means hunting through both apps. A boundary that doesn't encapsulate anything is pure overhead — you pay for two deploy targets, two runtimes, and two dependency trees and get no isolation in return.

**2. Webhook processing is synchronous and unbounded.**
`routes/whatsapp.ts:44-158` does, inside the HTTP handler, before ACKing Meta: a DB transaction, a Media API call, a full media download, an S3 upload, a second DB write, a socket emit, an OpenAI call, a second OpenAI call, and a Monday.com GraphQL mutation. Meta expects a fast `200` and **retries on timeout**. So a slow OpenAI call causes a retry, the retry re-processes, and you get duplicates or unique-constraint crashes. Worse, if *any* step throws, the `catch` at line 150 returns `500` in production — Meta retries the entire batch, including the messages that already succeeded. There is no idempotency key anywhere in the pipeline.

**3. Channel identity is baked into the schema.**
`Contact.whatsapp_id`, `Contact.whatsapp_name`, `Chat.whatsapp_id`. Adding Instagram forced the `ig` branch into a repo-wide rename. Adding SMS and email would force it again. A contact who messages you on WhatsApp *and* Instagram becomes two unrelated `Contact` rows with no way to merge them — which defeats the entire point of an omnichannel inbox.

**4. Realtime cannot scale and cannot be secured as built.**
`app.ts:41` uses the default in-memory Socket.IO adapter — two server instances means clients on instance A never see events from instance B. `io.emit(...)` at `whatsapp.ts:96` and `:238` broadcasts to **every connected socket** with no room scoping and no authentication handshake, so any anonymous client that connects receives every message in every conversation. And Socket.IO doesn't run on Vercel, which is why the split exists in the first place.

**5. Prisma client instantiation is unmanaged.**
Six separate `new PrismaClient()` calls across the codebase, several inside React server components that run per-request. Under Next.js dev hot-reload this exhausts the connection pool within minutes; against a `db.t3.micro` (default ~85 connections) it will exhaust it in production too. There's no singleton and no PgBouncer.

**6. No migration history.**
`db:push --accept-data-loss` is the only path from schema to database, and Terraform calls it on RDS creation (`main.tf:70`). There is no way to evolve production data safely, no rollback, and no record of what shape production is actually in.

**7. Media is world-readable with enumerable keys.**
The bucket policy grants `s3:GetObject` to `Principal: "*"` (`sdk/s3.ts:53`, `main.tf:81-91`), and keys are `media/chats/{chat.id}/{filename}` where `chat.id` is a **sequential integer**. Customer photos, voice notes, ID documents, and invoices are effectively public with a partially guessable URL. For a system whose stated job is handling customer conversations, this is a serious data-protection problem.

**8. Deployment is bespoke and fragile.**
The server Dockerfile copies `node_modules` **from the host** and hardcodes a pnpm content-addressed path (`/node_modules/.pnpm/@prisma+client@5.5.2_prisma@5.5.2/…`) that breaks the moment Prisma is upgraded. `conditional-copy.sh` exists purely to shuttle Prisma's native query engine `.so` into place. The image is architecture-specific, non-hermetic, single-stage, and runs as root.

### 5.3 Recommended architecture

**Modular monolith + channel adapters + async ingest.**

```
  WhatsApp   Instagram   Messenger   Twilio    Email     Web widget
      │          │           │          │        │           │
      └──────────┴───────────┴────┬─────┴────────┴───────────┘
                                  ▼
                   ┌──────────────────────────────┐
                   │  Ingest  (thin, always fast) │
                   │  1. verify signature          │
                   │  2. INSERT InboundEvent (raw) │   ← idempotency key
                   │  3. return 200                │      = provider msg id
                   └──────────────┬───────────────┘
                                  ▼
                        ┌──────────────────┐
                        │  Queue           │  pg-boss (no new infra)
                        │                  │  or BullMQ+Redis
                        └────────┬─────────┘
                                 ▼
              ┌──────────────────────────────────────┐
              │  Worker                              │
              │  ChannelAdapter[channel].parse()      │──► Object storage (PRIVATE
              │  → normalize → upsert Conversation    │     + presigned URLs)
              │  → persist Message                    │
              │  → publish realtime event             │──► Enrichment jobs
              │  → enqueue side-effects (LLM, CRM)    │     (separate queue,
              └──────────────────┬───────────────────┘      failures isolated)
                                 ▼
                      ┌────────────────────┐
                      │  Realtime layer    │  rooms: org:{id}, conv:{id}
                      │  (authenticated)   │  Ably/Pusher, or Socket.IO+Redis
                      └─────────┬──────────┘
                                ▼
        ┌───────────────────────────────────────────────┐
        │  Next.js app  ── the ONLY thing users talk to │
        │  • agent inbox (App Router)                    │
        │  • /api/webhooks/[channel]  (ingest)           │
        │  • /api/public/*  (widget, rate-limited)       │
        │  • all DB access through packages/core         │
        └───────────────────────────────────────────────┘
                                ▲
        ┌───────────────────────┴───────────────────────┐
        │  packages/                                     │
        │    core/       domain logic, the ONLY Prisma   │
        │                consumer (singleton client)     │
        │    channels/   whatsapp | instagram | messenger │
        │                | twilio | email | web           │
        │                each implements ChannelAdapter   │
        │    widget/     embeddable web-chat bundle       │
        └────────────────────────────────────────────────┘
```

**The `ChannelAdapter` contract** — every channel implements exactly this, and nothing outside `packages/channels/*` knows a channel exists:

```ts
interface ChannelAdapter {
  readonly channel: Channel;
  readonly capabilities: {
    media: MediaKind[];        // what this channel can send/receive
    templates: boolean;        // WhatsApp yes, SMS no
    reactions: boolean;
    readReceipts: boolean;
    sessionWindowHours?: number; // WhatsApp: 24. Others: undefined
  };

  verifyWebhook(req: RawRequest): boolean;          // signature check
  handshake?(req: RawRequest): Response;             // Meta hub.challenge
  parseInbound(raw: unknown): NormalizedInbound[];   // → domain objects
  sendOutbound(msg: OutboundMessage): Promise<SendResult>;
  parseStatus?(raw: unknown): StatusUpdate[];
  fetchMedia?(ref: string): Promise<MediaPayload>;
  resolveContact(raw: unknown): ExternalIdentity;
}
```

Adding Telegram then becomes: write one file, register it, done. No schema change, no new route, no UI change.

**Normalized data model** — replace `Contact`/`Chat` with:

- `Organization` — tenant root (enables multi-business and multi-number later)
- `ChannelAccount` — one per connected channel instance (a WhatsApp number, an IG page, a Twilio number). Holds that account's credentials. This is where the `multinumber` branch's idea belongs.
- `Contact` — the *human*. No channel fields at all.
- `ContactIdentity` — `(channel, external_id) → contact_id`, unique. **This is what lets one person be the same contact on WhatsApp and Instagram.** It's the single most important table in the redesign.
- `Conversation` — `(channel_account, contact)`, with `state` (open/pending/snoozed/closed), `assignee_id`, `last_message_at`, `session_window_expires_at`
- `Message` — `conversation_id`, `direction`, `type`, `body`, `external_id` (unique per channel), `status`, `sent_by_user_id`, `attachments[]`
- `Attachment` — separate table; a message can have several
- `InboundEvent` — raw provider payload + idempotency key + processing state

**Alternatives I considered and rejected:**
- *Keep the two-service split, fix the boundary* (Express becomes the sole API, Next only calls it). Legitimate, but you'd be paying for two deploy targets to serve one product with one developer. Only worth it if you later need long-running stateful work the serverless model can't host.
- *Full serverless* (Next on Vercel + Vercel/Upstash queues + Ably). Lowest ops burden and a genuinely good fit — but it makes the email/IMAP channel and any long-poll work awkward, and it locks you in harder. Take this if you want to minimize ops above all.
- *Event-sourcing / CQRS*. Massive over-engineering for this scale. No.

---

## 6. Findings

Severity: **P0** = fix before any internet exposure · **P1** = correctness bug users will hit · **P2** = design debt that compounds · **P3** = hygiene.

### 6.1 Security

| # | Sev | Finding | Location |
|---|---|---|---|
| S1 | **P0** | **The outbound-message endpoint has no authentication.** Anyone who can reach the server can send WhatsApp messages from your business number to any contact — impersonation, spam, and Meta account suspension. | `routes/whatsapp.ts:184` |
| S2 | **P0** | **Socket.IO has no auth handshake and no room scoping.** `io.emit()` broadcasts every message to every connected socket. Any anonymous client can connect to port 8000 and read all customer conversations in real time. | `app.ts:41-53`, `whatsapp.ts:96,238` |
| S3 | **P0** | **No Next.js server action checks the session.** `getContacts`, `getChatHistory`, `searchAction`, `getTemplates`, `sendMessage` are all callable by anyone who knows the action ID — server actions are POST endpoints, not private functions. | `_actions.ts` (entire file) |
| S4 | **P0** | **The root page doesn't gate on auth** — it logs the failure and renders anyway (`if(!user) console.log(...)`). Only `/contacts/[id]` actually redirects. | `page.tsx:8-10` |
| S5 | **P0** | **RDS is publicly accessible with the security group open to the world** — `publicly_accessible = true` plus `cidr_blocks = ["0.0.0.0/0"]` on port 5432. Every customer conversation is one credential-guess away. | `main.tf:38-60` |
| S6 | **P0** | **Media bucket is world-readable with sequential-integer keys.** `Principal: "*"` on `s3:GetObject` + `media/chats/{sequential_id}/{filename}`. Customer photos, voice notes and documents are enumerable. | `sdk/s3.ts:45-63`, `main.tf:79-99` |
| S7 | **P0** | **Agent identity is client-supplied.** The acting agent arrives as a form field (`data.append('agent', user.email)`) and as a socket payload (`socket.emit('seen_by', {agent})`). Any client can attribute actions to any agent, or mark another agent's conversations as seen/responded. | `chat-bar.tsx:99`, `app.ts:63`, `whatsapp.ts:199` |
| S8 | **P1** | **Webhook signature verification uses SHA-1 and a non-constant-time compare.** Meta's current header is `x-hub-signature-256` (HMAC-SHA256); SHA-1 is legacy. `sig === hash` is also timing-variable — use `crypto.timingSafeEqual`. | `sdk/whatsapp.ts:15-21` |
| S9 | **P1** | **Verification fails open in non-production.** A signature failure returns `200 'Unauthorized'`, and the generic `catch` returns `200` when `NODE_ENV !== 'production'` — so in staging the endpoint accepts and silently swallows anything. | `whatsapp.ts:51,156` |
| S10 | **P1** | No rate limiting, no body-size cap, and no request timeout on any endpoint. `bodyParser.json()` with default limits + unbounded media download = trivial resource exhaustion. | `app.ts:21-30` |
| S11 | **P1** | Secrets are passed as plain `-e` flags in EC2 `user_data`, which is readable via IMDS from anything on the instance and stored unencrypted in the launch config. | `server.tf:76-96`, `deploy.sh:66-88` |
| S12 | **P2** | The allowed-email-domain list is hardcoded in application source, so onboarding a new business is a code deploy. | `chat-client/app/utils.ts:56-60` |
| S13 | **P2** | No CSRF protection on the Express endpoints, and CORS is a single origin from env with no allow-list support. | `app.ts:31-33` |

### 6.2 Correctness bugs

| # | Sev | Finding | Location |
|---|---|---|---|
| B1 | **P1** | **Older messages load in reverse order.** The first page is reversed server-side (`chats.reverse()`), but `getPreviousChats` prepends the next page *without* reversing it — so scrolling back shows each block newest-to-oldest inside an oldest-to-newest list. | `chat-history.tsx:9` vs `chat-history-content.tsx:68-69` |
| B2 | **P1** | **Pagination cursor is corrupted by live messages.** `cursor = chatHistory.length` counts messages that arrived over the socket, so the `skip` offset drifts and pages get skipped or duplicated. Offset pagination on a live list is the wrong primitive — use a keyset cursor on `(chatDate, id)`. | `chat-history-content.tsx:14,68` |
| B3 | **P1** | **The composer's spinner sticks forever on a failed send.** `setIsLoading(false)` is only inside the `try`; the `catch` just logs. The agent sees a permanently disabled input with no error. | `chat-bar.tsx:96-116` |
| B4 | **P1** | **One malformed message kills an entire webhook batch.** `parseMessage` throws on any unrecognized type (`reaction`, `button`, `interactive`, `order`, `system`, `unsupported` — all real WhatsApp types), the throw escapes to the outer handler, and every message in that batch is lost. | `sdk/whatsapp.ts:167`, `whatsapp.ts:150` |
| B5 | **P1** | **No webhook idempotency.** Meta retries; `createReceivedChat` does an unconditional `chat.create`. You get either a unique-constraint 500 (which triggers *another* retry) or duplicate rows. | `utils/prisma.ts:33-66` |
| B6 | **P1** | **Status updates can regress.** Only the `delivered → sent` transition is guarded. An out-of-order `read → delivered` will overwrite `read`. Guard with a status rank instead. | `utils/prisma.ts:106-119` |
| B7 | **P1** | **Enrichment failures are swallowed silently.** `analyzeSentiment` / `extractDemographicData` `catch` and return `undefined`. Combined with `JSON.parse` on raw model output, a single malformed response silently disables enrichment with no signal. | `sdk/openai.ts:52-58,105-110` |
| B8 | **P2** | The sidebar refetches **every contact with a joined chat** on every single inbound message (`getContacts()` with no limit). At a few thousand contacts this is a full table scan per message. | `side-bar-content.tsx:24-27`, `_actions.ts:63-75` |
| B9 | **P2** | The search server action runs the query, **discards the result**, then redirects to a page that runs the same query again. | `side-bar.tsx:72-83` |
| B10 | **P2** | `bucketExists` has an always-truthy condition: `err.name === 'NoSuchBucket' \|\| 'NotFound'` — the right operand is a non-empty string literal, so *every* error is treated as "bucket doesn't exist". | `sdk/s3.ts:36` |
| B11 | **P2** | Missing React `key` on the outer `<div>` of the contact list (it's on the inner `<Link>` instead), causing unnecessary remounts. | `side-bar-content.tsx:42-44` |
| B12 | **P2** | The OpenAI integration targets the legacy `/v1/completions` endpoint with `gpt-3.5-turbo-instruct`, and parses free-text output with `JSON.parse`. Both the endpoint and the model are legacy. Move to a current messages/chat API with **structured output or tool-calling** so parsing can't fail. The `monday_integration` branch already started this. | `sdk/openai.ts:4,30,93` |
| B13 | **P3** | `updateChatByWaId` is imported into the route but never used; `getOrCreateContact` is exported but never called; `reqType`/`next` are unused. | `whatsapp.ts:13,184` |
| B14 | **P3** | The CLI's tests reference `hello:world` / `hello` commands that don't exist (only `dev` and `monday` do), so `pnpm test` fails in that package. | `packages/cli/test/commands/hello/*` |

### 6.3 Data model

| # | Sev | Finding |
|---|---|---|
| D1 | **P0** | **No migrations.** `prisma db push --accept-data-loss` is the only deploy path, and Terraform runs it against RDS on create. No history, no rollback, no safe evolution. |
| D2 | **P0** | **Channel is hardcoded into column names** (`whatsapp_id`, `whatsapp_name`). Blocks every other channel. The `ig` branch already proved the fix. |
| D3 | **P1** | **No `Conversation` entity.** Messages hang directly off `Contact`, so there's nothing to assign, close, snooze, or attach a session-window expiry to. |
| D4 | **P1** | **No cross-channel identity resolution.** One human on WhatsApp + Instagram = two unrelated `Contact` rows. This is the defining feature of an omnichannel inbox and the schema can't express it. |
| D5 | **P1** | **No tenant/organization boundary.** Monday board IDs (`5244743938`, `5244733915`) are hardcoded in source. Single business, single number, forever. |
| D6 | **P1** | **No indexes declared.** `Chat.contact_id`, `Chat.chatDate`, `Contact.last_chat_date`, and the search columns all need them. The sidebar's `orderBy last_chat_date` and the history's `orderBy createdAt` are both unindexed sorts today. |
| D7 | **P1** | `Chat.media` is a single nullable string — one attachment per message maximum. Real messages carry several. |
| D8 | **P2** | `fullTextSearch` is enabled as a Prisma preview feature but never used — search is `contains` + `mode: insensitive`, i.e. an unindexed `ILIKE '%…%'` scan on every keystroke-driven search. |
| D9 | **P2** | `seen_by` is an untyped `Json` blob keyed by email string, so it can't be queried, indexed, or joined to `User`. Should be a `MessageRead` join table. |
| D10 | **P2** | `Contact.agent` is `Json?` and unused. `ChatType` has both `contact` and `contacts`, and both `media` and specific types — overlapping, ambiguous variants. |
| D11 | **P2** | `Template` is never populated from Meta and has no link to a channel account. |
| D12 | **P3** | `createdBy`/`updatedBy` are free-text strings rather than FKs to `User`, so attribution can't be trusted or joined. |

### 6.4 Infrastructure & deployment

| # | Sev | Finding |
|---|---|---|
| I1 | **P0** | **Terraform has almost certainly never applied cleanly.** `data "aws_subnet_ids"` was removed in AWS provider v5 and deprecated in v4; `aws_route53_zone.primary` is *referenced but never declared*; `var.PROJECT_NAME` is used in `server.tf` but declared only in `main.tf`; `aws_s3_bucket_acl` with `public-read` fails under the default Object Ownership settings AWS enforced since April 2023. |
| I2 | **P0** | **The ELB/EC2 port wiring is wrong.** The security group opens only 443; the ELB forwards to instance port 80 and health-checks `HTTP:80/`; the container listens on 8000. Nothing can pass a health check. |
| I3 | **P1** | **The Dockerfile is non-hermetic** — it copies `node_modules` from the build host and hardcodes `@prisma+client@5.5.2_prisma@5.5.2` in a pnpm store path. Any Prisma bump silently breaks the image. `conditional-copy.sh` exists solely to work around this. |
| I4 | **P1** | Both images are single-stage, run as **root**, have no `HEALTHCHECK`, and pin `FROM node:20` / `cypress/browsers:latest` (unpinned). |
| I5 | **P1** | **No real deployment pipeline.** CI runs tests only. The three workflows in `gh-actions/` are broken drafts (reference `apps/nextjs-app`, `yarn`, node 14, `your-package-name`) and aren't even in `.github/`. Deploys are a manual `./deploy.sh` that SSHes into a box. |
| I6 | **P1** | **Single EC2 `t3.micro`, no ASG, no load balancer health that works, no zero-downtime deploy.** `docker stop && docker rm && docker run` = a hard outage every release, during which webhooks are dropped and Meta's retries eventually give up. |
| I7 | **P1** | No backup/restore procedure documented. RDS has `backup_retention_period = 30` but `skip_final_snapshot = true`, so a `terraform destroy` is unrecoverable. |
| I8 | **P2** | Five overlapping root env files (`.env`, `.env.development`, `.env.main`, `.env.prod`, `.env.test`) with unclear precedence, and `.env_example` was deleted on the current branch. No schema validation, so a missing var surfaces as a runtime crash. |
| I9 | **P2** | `turbo.json` uses the v1 `pipeline` key and `globalDotEnv`/`dotEnv`, all removed in Turborepo 2. |
| I10 | **P2** | Local dev depends on ngrok with a manually-created `ngrok.yml` (currently a 0-byte file), and the webhook URL must be re-registered in the Meta console by hand. |
| I11 | **P3** | `.DS_Store` files are committed in four directories despite being in `.gitignore`. |

### 6.5 Code quality & DX

- **76 `console.log` statements** in application source, many logging full message bodies and headers (`console.log('SIG: ', sig)`, `console.log('HEADERS: ', headers)` — the latter leaks the WhatsApp bearer token to stdout). `pino` is configured but barely used.
- **Zero unit or integration tests.** 77 Cypress assertions is genuine coverage of the happy path, but the E2E suite requires the full docker-compose stack (Postgres + minio + both apps + a fake SMTP server) so the feedback loop is minutes, not seconds. Nothing tests `parseMessage`, `normalizePhoneNumber`, `getTypeFromMime`, or the signature validator in isolation — all pure functions that are trivial to test and are exactly where the bugs are.
- **No typecheck or lint gate in CI.** The `lint` turbo task is declared but the workflow never invokes it.
- `any` used liberally at the boundaries — `parseMediaChat` returns `as any`, `updateChat(fields: {[key:string]: any})`, several untyped `catch (err: any)`.
- Large chunks of commented-out code left in place (`sdk/whatsapp.ts:38-80` migration function, `main.tf` CloudFront block, `cypress.config.ts` Lighthouse task, `utils.ts` monday auth, `user-menu.tsx` menu).
- No error boundaries, no `loading.tsx`, no `not-found.tsx`, no `error.tsx` anywhere in the App Router.
- Mixed Spanish/English in UI strings ("Hola", "Cerrar sesión", "Contactos") with no i18n framework.
- `layout.tsx` metadata is still `"Create Turborepo" / "Generated by create turbo"`.
- `packages/ui` contains one placeholder component rendering "hello" and "sopa".

---

## 7. Dependency & toolchain status

**Toolchain drift:** local Node **24.16.0** and pnpm **9.12.3**, against `packageManager: "pnpm@8.6.10"` and a **lockfileVersion 6.0** (pnpm 8 format). pnpm 9 will want to rewrite the lockfile to v9. Nothing here has been resolved against a modern Node.

**Framework versions as locked** (all ~2.5 years stale):

| Package | Locked | Notes |
|---|---|---|
| `next` | 14.0.2 | Several security advisories since; App Router has changed substantially |
| `react` / `react-dom` | 18.2.0 | React 19 is the current line |
| `next-auth` | 4.24.5 | v5 (Auth.js) is a breaking rewrite — plan for it |
| `@prisma/client` / `prisma` | 5.5.2 | Major versions behind; migration engine has changed |
| `typescript` | 5.2.2 / 5.3.3 (inconsistent across packages) | |
| `tailwindcss` | 3.3.5 | v4 is a config-format rewrite |
| `express` | ^4.14.0 (!) | The declared floor is from 2016; Express 5 is current |
| `socket.io` | ^4.7.2 | |
| `turbo` | `latest` | Config is v1 format |
| `cypress` | 13.6.1 | |

**~15 dependencies are pinned to the literal string `"latest"`** — including `dotenv`, `sharp`, `typescript`, `eslint`, `turbo`, `cypress`, `ts-node`, `axios`, `form-data`, `fluent-ffmpeg`, `@ffmpeg-installer/ffmpeg`, `nodemailer`, `uuid`. This makes builds non-reproducible and means a fresh `pnpm install --no-frozen-lockfile` can pull breaking majors without warning. **Fix this before touching anything else** — otherwise you can't tell whether a failure is your change or a silent upgrade.

`express: "^4.14.0"` is worth calling out separately: that's not just old, it means the manifest permits an eight-year-old version to satisfy the range.

---

## 8. Roadmap

Each task has an ID, a size (**S** ≈ ½–1 day · **M** ≈ 2–3 days · **L** ≈ 1 week · **XL** ≈ 2+ weeks), dependencies, and acceptance criteria. Phases 0–2 are strictly sequential; after that, Phase 4 channels can be parallelized.

---

### Phase 0 — Revival: make it build and run again
*Goal: `pnpm install && pnpm build && pnpm dev` works on current Node. ~1 week.*

| ID | Task | Size | Depends | Done when |
|---|---|---|---|---|
| **0.1** | **Branch triage.** Cherry-pick the schema generalization and IG adapter from `ig`, the `PhoneNumber` model design from `multinumber`, the function-calling fix from `monday_integration`, and Whisper from `audio_text` into documented notes or holding branches. Delete the other 11 branches. Restore `.env_example` (deleted on `cli`). | M | — | ≤4 branches remain; the harvest is written down |
| **0.2** | **Pin the toolchain.** `.nvmrc` + `engines` for Node 22 LTS, `packageManager: pnpm@9.x`, enable corepack, regenerate the lockfile. | S | 0.1 | `corepack enable && pnpm i` is clean on a fresh clone |
| **0.3** | **Kill every `"latest"` specifier.** Replace all ~15 with real semver ranges. Add Renovate or Dependabot so this never recurs. | S | 0.2 | No `"latest"` in any `package.json`; bot opens PRs |
| **0.4** | **Migrate `turbo.json` to v2** — `pipeline` → `tasks`, drop `globalDotEnv`/`dotEnv` in favour of explicit env loading. | S | 0.2 | `turbo build` runs on Turborepo 2 |
| **0.5** | **Upgrade framework majors** in one deliberate wave: Next 15, React 19, Prisma 6, Tailwind 4, Express 5, TypeScript 5.x (aligned across all packages). Do them one at a time, committing between each. | L | 0.3, 0.4 | `pnpm build` and `pnpm typecheck` pass across the workspace |
| **0.6** | **Introduce Prisma migrations.** `prisma migrate diff` against the current schema to produce a baseline, mark it applied, and **remove `db push --accept-data-loss` from every script and from `main.tf:70`.** | M | 0.5 | `prisma migrate deploy` is the only path to prod schema |
| **0.7** | **Consolidate env config.** One `.env.example` with every var documented, one `.env.local` for dev. Add a Zod schema that validates at boot and fails loudly with the missing key names. | S | 0.2 | Booting without a required var gives a clear error, not a runtime crash |
| **0.8** | **Add a Prisma singleton** in `packages/database` (globalThis-cached in dev) and replace all 6 `new PrismaClient()` sites. | S | 0.5 | One client instance per process; no pool exhaustion under hot-reload |
| **0.9** | **Green CI.** Add `typecheck` and `lint` jobs; make them required. Fix or delete the CLI's phantom `hello` tests (0.14). | S | 0.5 | CI is green on `master` |
| **0.10** | **Cleanup pass.** Remove the 76 `console.log`s (route through pino/a logger util), delete `gh-actions/`, delete `packages/ui` or commit to building it out, remove committed `.DS_Store` files, strip dead commented code. | S | — | `grep -r console.log apps packages` returns ~0 |

---

### Phase 1 — Security hardening
*Goal: safe to point at the internet. **Nothing below this line should be deployed until Phase 1 is done.** ~1 week.*

| ID | Task | Size | Depends | Done when |
|---|---|---|---|---|
| **1.1** | **Gate every server action.** A `requireSession()` helper called at the top of `getContacts`, `getChatHistory`, `searchAction`, `getTemplates`, `sendMessage`. Add `middleware.ts` to protect all routes by default. Fix `page.tsx:8` to actually redirect. | M | 0.5 | Unauthenticated POSTs to action endpoints return 401; a test proves it |
| **1.2** | **Authenticate the send path.** Either fold outbound into the Next.js app behind the session, or issue a service token the Next server presents to Express. **Never accept the agent identity from the client** — derive it from the session server-side. | M | 1.1 | `curl` against the send endpoint without credentials fails |
| **1.3** | **Authenticate and scope Socket.IO.** Verify the session in `io.use()` middleware, join sockets to `org:{id}` and `conv:{id}` rooms, replace every `io.emit` with a room-targeted emit, and derive the agent for `seen_by` from the socket session, not the payload. | M | 1.1 | An anonymous socket connection is rejected; agent A never receives agent B's org events |
| **1.4** | **Harden webhook verification.** Move to `x-hub-signature-256` / HMAC-SHA256, compare with `crypto.timingSafeEqual`, **fail closed in every environment** (return 401, not `200 'Unauthorized'`), and remove the `NODE_ENV !== 'production'` swallow at `whatsapp.ts:156`. | S | — | Tampered payloads are rejected in all envs; a unit test covers it |
| **1.5** | **Make media private.** Drop the public bucket policy, switch to presigned GET URLs with short TTLs issued only to authenticated sessions, and replace sequential-integer key paths with UUIDs. Migrate existing objects. | M | 1.1 | Direct object URLs 403; the inbox still renders media |
| **1.6** | **Lock down the network.** Move RDS into private subnets, `publicly_accessible = false`, security group scoped to the app SG only. Restrict the S3 IAM user to the exact prefix. | M | — | `psql` from outside the VPC times out |
| **1.7** | **Rate limiting and payload caps.** Per-IP and per-token limits on webhooks and the send endpoint, `bodyParser` size limits, request timeouts, and a cap on media download size. | S | — | A flood is throttled rather than exhausting the box |
| **1.8** | **Secrets management.** Move to AWS Secrets Manager / SSM (or Vercel + Doppler). Remove secrets from EC2 `user_data` and from `deploy.sh` exports. Rotate every credential that has ever been in a shell history or a Terraform state file. | M | — | No plaintext secret in any repo file, launch config, or TF state |
| **1.9** | **Move the allowed-domain list into the database** (per-organization), so onboarding isn't a deploy. | S | 1.1 | Adding a domain is a DB row |

---

### Phase 2 — The core refactor: channel abstraction
*Goal: adding a channel is one file, not a schema migration. This is the phase that unlocks your actual product. ~2 weeks.*

| ID | Task | Size | Depends | Done when |
|---|---|---|---|---|
| **2.1** | **Design the normalized schema** — `Organization`, `ChannelAccount`, `Contact`, `ContactIdentity`, `Conversation`, `Message`, `Attachment`, `InboundEvent`. Add the indexes from D6. Write the ADR explaining the model. | M | 0.6 | Schema reviewed; ADR committed |
| **2.2** | **Write the reversible migration** from `Contact`/`Chat` to the new model, with a data backfill: derive `ContactIdentity` rows from `whatsapp_id`, synthesize one `Conversation` per contact, map `Chat` → `Message`. Rehearse it against a production snapshot. | L | 2.1 | Migration runs forward and backward on a real data copy with zero loss |
| **2.3** | **Define the `ChannelAdapter` interface** in `packages/channels/core` — the contract from §5.3, including the `capabilities` descriptor so the UI can hide what a channel can't do. | M | 2.1 | Interface + registry + a fake in-memory adapter for tests |
| **2.4** | **Extract `packages/core`** — all domain logic and the *only* Prisma consumer. Move the duplicated search query out of `side-bar.tsx` into one function. Both the app and the worker import from here. | L | 2.3 | No Prisma import outside `packages/core`; the duplicate query is gone |
| **2.5** | **Port WhatsApp to the adapter.** Move `sdk/whatsapp.ts` to `packages/channels/whatsapp` behind the interface. Delete the channel-specific route. **All 77 Cypress tests must still pass** — this is the safety net that makes the refactor viable. | L | 2.3, 2.4 | E2E suite green with WhatsApp running through the generic pipeline |
| **2.6** | **Add the capabilities-driven UI layer** — the composer enables/disables templates, media types, and reactions based on `adapter.capabilities` rather than hardcoded WhatsApp assumptions. | M | 2.5 | The composer adapts to the conversation's channel |

---

### Phase 3 — Ingest reliability
*Goal: never lose or duplicate a message. ~1 week.*

| ID | Task | Size | Depends | Done when |
|---|---|---|---|---|
| **3.1** | **Split ingest from processing.** The webhook route verifies the signature, writes the raw payload to `InboundEvent` with an idempotency key (`channel + provider_message_id`, unique), and returns `200` — target p99 under 200 ms. | M | 2.5 | Webhook ACK latency no longer depends on S3/LLM/CRM |
| **3.2** | **Add the queue and worker.** **`pg-boss`** is my recommendation — it runs on the Postgres you already have, so no new infrastructure. Use BullMQ + Redis only if you later need the throughput. Worker consumes `InboundEvent`, runs the adapter pipeline, persists, publishes realtime. | L | 3.1 | Killing the worker mid-batch loses nothing; restart resumes |
| **3.3** | **Idempotent processing.** Every write path upserts on the idempotency key. Replaying the same webhook 100× produces exactly one message. | M | 3.2 | A replay test asserts a single row |
| **3.4** | **Retries, backoff and a dead-letter queue,** with an admin view of failed events and a manual replay button. Unknown message types (B4) land in the DLQ instead of killing the batch. | M | 3.2 | An unparseable message is quarantined; the rest of the batch succeeds |
| **3.5** | **Outbound queue + status reconciliation.** Sends go through a queue with retry; a periodic job reconciles messages stuck in `pending` against the provider's API. Fix the status-regression bug (B6) with a rank-ordered guard. | M | 3.2 | A provider outage delays sends instead of losing them |
| **3.6** | **Decide the realtime layer and migrate.** Either Socket.IO + `@socket.io/redis-adapter` (self-hosted, more ops) or a managed service like Ably/Pusher (less ops, fits Vercel). Either way: authenticated, room-scoped, horizontally scalable. | M | 1.3, 3.2 | Two app instances deliver events correctly to the right rooms |

---

### Phase 4 — Channels
*Goal: the actual omnichannel product. Once 4.1 lands, these are parallelizable. ~3–4 weeks.*

| ID | Task | Size | Depends | Done when |
|---|---|---|---|---|
| **4.1** | **Instagram DM** — merge the `ig` branch work onto the adapter interface. Includes story mentions, story replies, quick replies, and the comment→private-reply flow already sketched there. | L | 2.5 | Send/receive works end-to-end; the branch's 427 lines of specs pass |
| **4.2** | **Facebook Messenger** — largely shares the Meta Graph pipeline with 4.1, so this is the cheapest channel to add. | M | 4.1 | Send/receive + delivery receipts |
| **4.3** | **Twilio SMS** — different signature scheme (`X-Twilio-Signature`), different status-callback model, MMS via public media URLs rather than an upload API. | M | 2.5 | Send/receive + delivery status |
| **4.4** | **Email** — the hardest channel. Inbound via SendGrid Inbound Parse or Postmark (much easier than raw IMAP); threading on `Message-ID` / `In-Reply-To` / `References`; HTML sanitization; quoted-reply stripping; attachment extraction; outbound with correct threading headers. | XL | 2.5 | A reply from Gmail threads correctly into the existing conversation |
| **4.5** | **Contact identity resolution & merge** — match on normalized phone/email across channels, auto-link identities, and give agents a manual merge/unmerge UI with an audit trail. **This is what makes it "omnichannel" rather than "several inboxes in one app".** | L | 2.2, 4.1 | One person on WhatsApp + Instagram shows as one contact with a unified timeline |
| **4.6** | **Telegram** (optional) — cheap once the adapter exists; good proof that the abstraction actually works. | S | 2.5 | Send/receive |

---

### Phase 5 — The web chat widget
*Goal: your second client. Effectively its own mini-project. ~2–3 weeks.*

| ID | Task | Size | Depends | Done when |
|---|---|---|---|---|
| **5.1** | **Widget architecture + public API.** `packages/widget` as a standalone Preact/vanilla bundle (target < 40 KB gz). Public ingest API keyed per site, with strict origin allow-listing, hard rate limits, and abuse protection. **This is your only unauthenticated write surface — it needs the most hardening in the system.** | L | 3.6, 1.7 | A hostile page on another origin can't post messages |
| **5.2** | **Anonymous visitor identity.** Signed token in localStorage, survives reload and navigation, upgradeable to a real `Contact` when the visitor supplies an email or phone (feeding 4.5). | M | 5.1 | A returning visitor resumes the same conversation |
| **5.3** | **Widget UI.** Shadow DOM isolation, launcher bubble with unread badge, message list, composer, file upload, typing indicator, read receipts, sound, mobile viewport handling, theming. | L | 5.1 | Embeds cleanly on a third-party site without CSS bleed in either direction |
| **5.4** | **Web channel adapter** so widget conversations land in the same inbox as every other channel. | M | 5.1, 2.3 | Agents reply from the same UI |
| **5.5** | **Offline / away handling.** Capture an email when no agent is available; continue the thread over email (via 4.4) and fold replies back into the same conversation. | M | 5.4, 4.4 | An after-hours visitor gets a reply by email in-thread |
| **5.6** | **Install flow.** Snippet generator, per-site config (colors, greeting, business hours), and a preview. | M | 5.3 | A non-technical user can install it by copy-paste |

---

### Phase 6 — Inbox product depth
*Goal: usable by a real team, not one person. ~2 weeks. Can overlap Phase 4.*

| ID | Task | Size | Depends | Done when |
|---|---|---|---|---|
| **6.1** | **Assignment & conversation state** — assign to agent, open/pending/snoozed/closed, filtered views (mine / unassigned / all). The single highest-impact UX addition for multi-agent use. | L | 2.2 | Two agents don't collide on the same conversation |
| **6.2** | **WhatsApp 24-hour session window** — track `session_window_expires_at`, show a countdown, and force template-only mode when it lapses (instead of letting the send fail opaquely). | M | 2.5 | Agents can't send a free-form message into a closed window |
| **6.3** | **Template management** — sync from Meta's template API, show approval status, support creation/submission, and provide a proper parameter-filling UI. | L | 6.2 | Templates are managed in-app, not in the Meta console |
| **6.4** | **Contact CRUD + profile panel** — the create/edit UI that `createContact.cy.ts` already tests against, plus notes and tags. | M | 2.2 | `/contacts` is a real page, not a redirect |
| **6.5** | **Fix history pagination** — keyset cursor on `(chatDate, id)`, correct ordering on prepend, infinite scroll instead of a button. Fixes B1 and B2. | M | 2.2 | Scrolling back through 1,000 messages is correct and smooth |
| **6.6** | **Real search** — Postgres full-text (the `fullTextSearch` preview flag is already on) or Typesense/Meilisearch. Filter by channel, date, agent, status. Fixes D8. | M | 2.2 | Search over 100k messages returns in < 200 ms |
| **6.7** | **Fix the sidebar refetch storm** — patch the affected conversation from the realtime event instead of refetching every contact. Paginate the list. Fixes B8. | M | 3.6 | Inbound messages cause O(1) work, not a full scan |
| **6.8** | **Notifications** — browser push, sound, and configurable email digests for unanswered conversations. | M | 3.6 | An agent gets notified when assigned |
| **6.9** | **Composer polish** — fix the stuck spinner (B3), add error toasts with retry, upload progress, drag-and-drop, paste-to-upload, client-side validation, and optimistic sends. | M | — | Every failure mode is visible and recoverable |
| **6.10** | **UI/UX overhaul.** The current UI is functional-grey scaffolding (`bg-slate-*` throughout, "Hola" placeholder, "Create Turborepo" page title). Establish a design system in `packages/ui`, add dark mode, responsive/mobile layout, empty states, skeletons, error boundaries, `loading.tsx` / `error.tsx` / `not-found.tsx`. | L | — | Looks like a product |
| **6.11** | **i18n** — the codebase mixes Spanish and English UI strings today. Pick a framework, extract strings, ship es + en. | M | 6.10 | Language switch works throughout |

---

### Phase 7 — Platform & operations
*Goal: deployable and observable by someone who isn't you. ~1–2 weeks.*

| ID | Task | Size | Depends | Done when |
|---|---|---|---|---|
| **7.1** | **Pick and commit to a deployment target.** My recommendation: **Next.js on Vercel + the worker on Fly.io/Railway + Neon or RDS + a managed realtime layer.** That eliminates the EC2 box, the classic ELB, the bespoke Dockerfile, and `conditional-copy.sh` entirely. Delete the Terraform that no longer applies (I1). | L | 3.2 | One documented command deploys the whole stack |
| **7.2** | **Rebuild the Docker images properly** (if you keep containers) — multi-stage, hermetic install inside the image, non-root user, pinned base digests, `HEALTHCHECK`, correct port wiring (I2). | M | 7.1 | `docker build` works on a clean machine with no host `node_modules` |
| **7.3** | **Real CI/CD** — typecheck, lint, unit, integration, E2E on every PR; preview environments; automatic `prisma migrate deploy`; rolling deploys with zero dropped webhooks. Delete `gh-actions/`. | L | 0.9, 7.1 | Merging to `master` ships safely without manual steps |
| **7.4** | **Observability** — structured logging with correlation IDs across ingest→worker→realtime, error tracking (Sentry), metrics (webhook latency, queue depth, DLQ size, send failure rate), and alerts on the ones that matter. | L | 3.2 | You find out about an outage from an alert, not a customer |
| **7.5** | **Build the test pyramid.** Unit tests for the pure functions that currently have none — `parseMessage`, `normalizePhoneNumber`, `getTypeFromMime`, `validateMetaSignature`, every adapter's parser. Integration tests for the ingest pipeline against a test container. Keep Cypress for critical paths only. | L | 2.5 | Feedback loop drops from minutes to seconds; coverage gate in CI |
| **7.6** | **Multi-tenancy** — organizations, per-org channel accounts (fold in the `multinumber` design), row-level scoping on every query, and an org-switcher. Removes the hardcoded Monday board IDs and domain list. | XL | 2.1 | Two businesses can use one deployment without seeing each other's data |
| **7.7** | **Backups & DR** — automated backups, a *tested* restore procedure, `skip_final_snapshot = false`, and a documented runbook. | M | 7.1 | You have actually restored from a backup once |
| **7.8** | **GDPR / data-retention** — export, delete, retention policies, PII handling documentation. You're storing IDs, birthdates and nationalities extracted by an LLM; this isn't optional if you have EU users. | M | 7.6 | A deletion request can be fulfilled |

---

### Phase 8 — Intelligence (optional, but it's your differentiator)

| ID | Task | Size | Depends | Done when |
|---|---|---|---|---|
| **8.1** | **Modernize the LLM layer.** Replace the legacy `/v1/completions` + `gpt-3.5-turbo-instruct` calls with a current messages API and **structured output / tool-calling** so responses can't fail `JSON.parse` (B7, B12). Harvest the function-calling work from `monday_integration`. Move enrichment onto its own queue so a model outage never touches message delivery. | M | 3.2 | Enrichment failures are isolated, observable and retryable |
| **8.2** | **Reply suggestions** — draft a response from conversation context, agent-editable, never auto-sent. | M | 8.1 | Agents accept suggestions more often than they discard them |
| **8.3** | **Auto-summarization & routing** — conversation summaries on handoff, intent classification for auto-assignment. | M | 8.1, 6.1 | Assignment accuracy is measurable |
| **8.4** | **Audio transcription** — merge the `audio_text` branch (Whisper) onto the queue. | S | 8.1 | Voice notes are searchable as text |
| **8.5** | **Rework the CRM sync.** Today Monday.com is called inline per message with hardcoded board IDs (`5244743938`, `5244733915`). Make it a queued, configurable, per-org integration — and generalize to HubSpot/Salesforce/Pipedrive. | L | 3.2, 7.6 | CRM outages don't affect messaging; boards are configured, not compiled |
| **8.6** | **Analytics** — first-response time, resolution time, volume by channel, agent leaderboards. The schema already captures `respondedAt` and `response_time`; nothing surfaces them. | M | 6.1 | A dashboard exists |

---

## 9. Where I'd start

If you only have three days, do these — they're the highest ratio of risk removed to effort spent, and none of them depend on the big refactor:

1. **0.3** — replace every `"latest"` specifier. Until this is done you cannot distinguish your bugs from silent upgrades. *(½ day)*
2. **1.1 + 1.2 + 1.3** — auth on server actions, on the send endpoint, and on Socket.IO. These three are the difference between "a demo" and "safe to show someone". *(1½ days)*
3. **0.6** — Prisma migrations baseline. Every day you stay on `db push --accept-data-loss` is a day closer to losing data. *(½ day)*
4. **1.4** — fail closed on webhook signature verification. *(½ day)*

Then commit to Phase 0 → 1 → 2 in order. **Do not start Phase 4 (channels) before Phase 2 (the adapter) is done** — the `ig` branch is the proof of what happens otherwise: 2,000 lines of work that couldn't merge because the abstraction wasn't there.

---

## 10. Decisions — answered

These were answered on 2026-08-19. **The architecture design and the revised roadmap now live in [`ARCHITECTURE.md`](./ARCHITECTURE.md)**; the sequencing in §8 above is superseded by §8 of that document.

| # | Question | Answer | Effect |
|---|---|---|---|
| 1 | Product or internal tool? | **Both.** Orgs with a short-name slug, each with one number / email / user to start | Multi-tenancy moves from Phase 7 → **Phase 2**. It's foundational, not a retrofit |
| 2 | Preserve production data? | **No** — all test data | Data-migration task 2.2 dropped; the Prisma baseline in 0.6 dropped. Also makes the auth-provider switch nearly free |
| 3 | Ops appetite? | **Supabase + Vercel**, with a self-hosting preference longer term | New **Phase 1: Supabase migration**. Absorbs S2, S5, S6, S11, I1, I2, I3 and old 7.1. Tension between "self-hosted" and "Vercel" resolved in `ARCHITECTURE.md` §1 |
| 4 | Channel priority? | **WhatsApp → Instagram → SMS.** Email later | Phase 4 reordered; email deferred to Phase 6 |
| 5 | Still Monday? | **No.** Standalone first, then Odoo → HubSpot → Monday | Monday removal → **Phase 0 deletion**. New Phase 7 (standalone CRM core) + Phase 8 (`CrmAdapter` integrations) |
| 6 | Keep the CLI? | **No** | `packages/cli` deleted in Phase 0 |

### Additional requirements captured

- **Cross-channel identity** — one person writing on WhatsApp *and* Instagram must resolve to one contact. Design in `ARCHITECTURE.md` §4 (linking confidence tiers, and why the *contact* unifies while the *threads* stay separate).
- **Quotations over chat** — send a quotation to one or more of a contact's connected channels. Design in `ARCHITECTURE.md` §6.5.
- **Inbound → CRM leads** — an incoming message can create a lead. Requires `Lead` as its own entity rather than a status on `Contact`.

### Still open

See `ARCHITECTURE.md` §9 — Odoo hosting and version, quotation source of truth, whether the Twilio and WhatsApp numbers are literally the same E.164, self-hosting timeline, expected volume, and web-widget priority.
