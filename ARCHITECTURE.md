# Architecture v2 — Supabase, Multi-Org, Cross-Channel Identity

> Companion to [`ANALYSIS.md`](./ANALYSIS.md). That document covers the current state and its problems; this one answers the design questions and revises the plan based on your decisions.
> **Written:** 2026-08-19

---

## 0. Your decisions, recorded

| # | Decision | Impact on the plan |
|---|---|---|
| 1 | **Internal tool *and* product.** Orgs have a short name (slug). Phase 1 = **Mansa Panama** (WhatsApp, +507) + **Mansa Miami** (Twilio SMS, +1) — different numbers, different countries | **Multi-org moves from Phase 7 to Phase 2.** Foundational from day one: you have two tenants before you have two channels |
| 2 | **No production data to preserve** — all test data | Migration task 2.2 drops from L to S. Drop and recreate. Also makes switching auth providers nearly free |
| 3 | **Supabase over RDS**, self-hosted leaning, but considering Vercel + Supabase | Resolved in §1 — the two goals conflict, and there's a way to have both |
| 4 | **WhatsApp, Instagram, SMS** are the priority channels | Email drops to Phase 6. Web widget stays. Messenger becomes nearly free after IG |
| 5 | **Monday is out. Standalone first**, then Odoo → HubSpot → Monday | Monday removal becomes a Phase 0 deletion; a standalone CRM core becomes a real phase |
| 6 | **Delete the CLI** | Phase 0 deletion |

Two things in there deserve calling out before anything else:

**The real Phase 1 shape (confirmed 2026-08-19).** Two orgs, and between them they cover both identity-resolution cases:

| Org | slug | Channels | Identity path |
|---|---|---|---|
| **Mansa Panama** | `mansa-pa` | WhatsApp (+507), **Instagram, Messenger**, + more | ❌ no shared identifier → **the hard case** |
| **Mansa Miami** | `mansa-mia` | Twilio SMS + WhatsApp, **same +1 number** | ✅ same E.164 → **auto-links** |

**Panama is multi-channel from day one in the hardest configuration**, so cross-channel identity and the merge UI are no longer deferrable — they ship with Panama's second channel. Full treatment in §4.1 and §5.1; roadmap impact in §8.

**"Each org has one number/email/user" — I'd model one-to-many anyway.** It costs nothing now (a foreign key either way) and retrofitting cardinality later means touching every query. You'll want a second number within a year.

---

## 1. Supabase vs RDS — my honest take

**Verdict: yes, do it. But not for the reason you gave.**

### Where I'd push back

> *"its cheaper and performs better"*

Cheaper — **yes, substantially.** Not just the database line item: Supabase absorbs four things you're currently paying for and operating separately.

Performs better — **not inherently, and I don't want you to plan around that.** It's the same PostgreSQL. A Supabase instance and an RDS instance with equivalent CPU and memory will perform equivalently on the same query. Where you *will* see a real speedup is from things unrelated to the vendor: your current schema has **no indexes declared at all** (finding D6), search is an unindexed `ILIKE '%…%'` scan (D8), and the sidebar refetches every contact on every inbound message (B8). Fix those and you'd get a large speedup on RDS too.

What Supabase does give you at the low end is **better compute per dollar** — the `db.t3.micro` in your Terraform is a burstable instance that throttles under sustained load, and Supabase's paid tiers are more generous at comparable price. So the practical outcome is "faster," just not for architectural reasons.

I'm being pedantic here on purpose: if you migrate expecting the vendor to fix performance and skip the indexing work, you'll be disappointed.

### What you're actually buying

This is the real argument, and it's a strong one. Supabase doesn't replace RDS — it replaces **four separate pieces of your current architecture**, three of which are actively causing the findings in `ANALYSIS.md`:

| Today | Supabase | Findings it resolves |
|---|---|---|
| RDS Postgres | Supabase Postgres | D1 (migrations get a sane home) |
| S3 + minio, **public bucket, sequential-integer keys** | Supabase Storage — private buckets, signed URLs, RLS, built-in image transforms | **S6** (world-readable customer media), and replaces most of the `sharp` usage |
| **Socket.IO on an EC2 box** — in-memory adapter, no auth, broadcasts every message to every client | Supabase Realtime — authorized, topic-scoped, horizontally scaled, *not your problem* | **S2** (unauthenticated broadcast), the scaling ceiling, **and the entire reason the two-service split exists** |
| NextAuth v4 + Prisma adapter | Supabase Auth (optional — see §3.6) | Integrates with Realtime + Storage authorization |

That third row is the one that matters most. **Socket.IO not running on Vercel is *why* you have an Express service on EC2 at all.** Remove that constraint and the two-service split loses its main justification — which is the single biggest simplification available to you.

The knock-on effects: the EC2 instance, the classic ELB, the ACM cert wiring, the broken health checks (finding I2), the non-hermetic Dockerfile with the hardcoded pnpm store path (I3), and `conditional-copy.sh` all **stop existing.** That's most of §6.4 deleted rather than fixed.

### The gotchas — read these before you commit

These are real and they will bite you if you don't plan for them.

**1. Connection pooling is not optional.** Supabase fronts Postgres with Supavisor. You need two URLs:

```bash
# Pooled, transaction mode — what the app uses at runtime
DATABASE_URL="postgresql://…@…pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# Direct — migrations only (DDL needs a session)
DIRECT_URL="postgresql://…@…pooler.supabase.com:5432/postgres"
```

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")   // prisma migrate uses this
}
```

**2. Transaction-mode pooling disables prepared statements**, which is why `pgbouncer=true` is required — it tells Prisma to stop using them. Miss this and you get intermittent `prepared statement "s0" already exists` errors that are miserable to debug.

**3. Your interactive transactions need review.** `utils/prisma.ts:36` and `:70` use `prisma.$transaction(async (tx) => {…})`. Interactive transactions hold a connection for their whole duration, which is exactly what transaction-mode pooling is bad at. Both of yours are short (a create plus an update), so they should be fine — but **verify this early**, and consider rewriting them as a single `INSERT … ON CONFLICT` upsert, which you want anyway for webhook idempotency (finding B5). Two problems, one fix.

**4. Pick the right Realtime mode.** Supabase Realtime has three, and the obvious one is the wrong one:

- **Postgres Changes** — subscribes to the WAL, streams row changes. Easiest to reach for. But every change is evaluated against RLS *per subscriber*, and it funnels through a single replication stream. It does not scale well with many concurrent agents on a busy table.
- **Broadcast** — plain pub/sub on a topic. Scales far better. Can be fired from Postgres itself via `realtime.send()` in a trigger ("Broadcast from Database"), so you keep the "DB is the source of truth" property without the WAL bottleneck. **Use this.**
- **Presence** — ephemeral online-state. Perfect for typing indicators and "agent X is viewing this conversation," both of which you already have in cruder form.

**5. Vendor concentration.** You'd be putting database, storage, realtime, and possibly auth with one provider. Mitigated by two things: Postgres is Postgres (your data is portable by definition), and Supabase is open-source and self-hostable — which is also the answer to your next point.

### "I want everything self-hosted" vs "I was thinking Vercel and Supabase"

These are opposite ends of a spectrum, so let me lay out the actual options.

**The key insight: Supabase is open source. The application code is identical whether you run against Supabase Cloud or a self-hosted Supabase.** Same client libraries, same Postgres, same Storage API, same Realtime protocol. So this is **not a decision you have to make now** — it's a deployment target you can change later without rewriting anything.

| | **A. Managed** (recommended) | **B. Self-hosted** | **C. Hybrid** |
|---|---|---|---|
| App | Vercel | Container on your VPS | Vercel |
| Data/RT/Storage | Supabase Cloud | Self-hosted Supabase | Supabase Cloud |
| Job handlers | Vercel routes (§7.4) — no container | Same container as the app | Vercel routes |
| Ops burden | Near zero | **Substantial** | Low |
| Cost at your scale | ~$45–70/mo | ~$20–40/mo + your time | ~$35–55/mo |
| Control / no lock-in | Lower | Highest | Medium |

**My recommendation: start with A, keep B open.** Self-hosting Supabase means operating roughly ten containers — Postgres, GoTrue, PostgREST, Realtime, Storage, Kong, imgproxy, meta, Studio, analytics — plus their upgrades, backups, and TLS. That's a meaningful part-time job. Given this project sat dormant for two and a half years, **the infrastructure being hard to pick back up is a large part of why.** Adding a Supabase cluster to maintain works against the thing you're trying to fix.

If self-hosting is a hard requirement (data residency, cost at scale, or principle), use **Coolify** or **Dokploy** on a single reasonably-sized VPS — they give you a Heroku-ish deploy experience over Docker Compose and make Supabase self-hosting genuinely manageable. Just do it as a deliberate later phase, not while you're also rewriting the data model.

**⚠️ Corrected 2026-08-19 — you asked for "Vercel + Supabase and nothing else," and that is achievable.** An earlier draft said Vercel "cannot host your queue worker" and that you'd need a container on Fly.io or Railway. That was too blunt. The accurate statement is narrower:

> Vercel cannot host a **long-running polling worker** — a process that sits in a loop calling `queue.receive()` forever. It hosts **event-driven job handlers** perfectly well.

And an event-driven handler is what you actually need. The design is in **§7.4** — Postgres dispatches jobs over HTTP to Vercel route handlers, with `pgmq` + `pg_cron` behind it for durability. **No container, no third provider, one deploy target.** Same `packages/core` code, same runtime, same types.

---

## 2. The stack

```
   WhatsApp      Instagram      Twilio SMS      Web widget      (Email, later)
   Cloud API     Graph API      webhooks        visitors
       │             │              │               │                │
       └─────────────┴──────────────┴───────────────┴────────────────┘
                                  │  POST /api/webhooks/[channel]
                                  ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │  NEXT.JS APP  (Vercel)  ── the only thing users and providers hit  │
   │                                                                    │
   │   Agent inbox            React Server Components  ─┐               │
   │   Server Actions         (all reads + writes)      │               │
   │   /api/webhooks/[channel]  verify sig → enqueue    ├─► packages/core
   │   /api/public/widget/*     rate-limited, org-keyed │   (the ONLY   │
   │                                                    │    Prisma     │
   └────────────────────────────────────────────────────┼────consumer)──┘
                                  │                     │
                                  ▼                     ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  SUPABASE                                                         │
   │                                                                   │
   │   Postgres ──── your schema + pgmq queue (same DB, no Redis)      │
   │      │                                                            │
   │      ├── Realtime  Broadcast: conv:{id}, org:{slug}:inbox         │
   │      │             Presence:  typing, viewing                     │
   │      │             (fired from DB triggers via realtime.send)     │
   │      │                                                            │
   │      ├── Storage   PRIVATE buckets, signed URLs, image transforms │
   │      │                                                            │
   │      └── Auth      magic link, JWT carries org_id + role          │
   └──────────────────────────────────────────────────────────────────┘
                                  │
                                  │  pg_net fires an HTTP POST the moment
                                  │  a job row commits  (§7.4)
                                  ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  JOB HANDLERS — Vercel route handlers, NOT a container            │
   │  /api/jobs/*  (shared-secret auth, never public)                  │
   │                                                                    │
   │   inbound  → adapter.parseInbound → normalize → persist → broadcast│
   │   outbound → adapter.sendOutbound → status reconciliation          │
   │   side-effects → enrichment, CRM sync   (separate queues,          │
   │                                          failures isolated)        │
   │                                                                    │
   │   imports packages/core and packages/channels — the SAME code      │
   │   the UI uses. one runtime, one deploy, one type system.           │
   └────────────────────────────────────────────────────────────────────┘
        ▲
        └── pg_cron sweep (~30s): re-dispatch anything still pending.
            This, not pg_net, is the actual delivery guarantee.

   packages/
     core/       domain logic. The only place Prisma is imported.
     channels/   core (interface) · whatsapp · instagram · twilio · web · email
     crm/        core (interface) · odoo · hubspot · monday      ← Phase 7
     widget/     embeddable bundle
     ui/         design system  (currently a placeholder — build or delete)
```

**Two deployed processes. Not four services.** The app and the worker share all their business logic through workspace packages; the only difference is the entry point.

**Why the queue lives in Postgres.** `pgmq` is a Postgres extension Supabase ships. Using it means no Redis, no separate managed queue, no extra credentials, and — importantly — **you can enqueue a job in the same transaction that writes the message**, so a job can't reference a row that was rolled back. If you outgrow it, swapping to BullMQ later is a contained change behind one interface.

---

## 3. Where the ORM lives, and where you query

> *"where is the ORM? if i want to query, filter etc in the app where do i do this? are you recommending that the backend should expose endpoints for this?"*

Short answer: **Prisma stays, it lives in `packages/core`, you query from Server Components and Server Actions, and no — the backend does not expose endpoints for your own UI.**

That last part is the bit that's probably unclear, so let me build it up properly.

### 3.1 Two philosophies, and why I'm picking one

Supabase pushes you toward a pattern that conflicts with what you have. Worth naming both:

**Philosophy A — Supabase-native.** The browser talks to Postgres directly through PostgREST:
```ts
// in the browser
const { data } = await supabase.from('messages').select('*').eq('conversation_id', id)
```
Row-Level Security is your authorization layer. There is no backend.

- ✅ Very little code for simple CRUD
- ❌ Business logic ends up in the client, or nowhere
- ❌ **RLS becomes your entire authorization model.** With multi-org, per-conversation assignment, agent roles, and channel capabilities, those policies get genuinely hard to reason about — and a mistake in one is a cross-tenant data leak
- ❌ **Doesn't work for your core action anyway.** "Send a message" means calling the WhatsApp Graph API with a secret. That can never happen in a browser. So you need a server regardless

**Philosophy B — server-owned data access.** Prisma stays. Every query goes through `packages/core`, on the server. The browser never touches the database.

- ✅ One place for all logic, shared by the app and the worker
- ✅ Type-safe end to end, unit-testable without a browser
- ✅ Portable — if you ever leave Supabase, this layer doesn't change
- ❌ More code than A for trivial reads

**I recommend B, with exactly one exception: Realtime.**

The browser uses `supabase-js` for *one* thing — subscribing to Realtime channels. It never calls `.from().select()`. And you still turn RLS on with restrictive policies as a **backstop**, not as your primary authorization: if a key ever leaks or a query escapes the server layer, RLS is the seatbelt. Defense in depth. Just don't make it the seatbelt *and* the steering wheel.

### 3.2 So where do you actually query and filter?

Three places, and none of them is a REST endpoint.

**(a) Reading a list — a React Server Component.** No API, no client JS, no loading state:

```tsx
// app/(inbox)/[org]/page.tsx
import { requireSession } from '@/lib/auth'
import { conversations } from '@acme/core'

export default async function Inbox({
  params, searchParams,
}: { params: { org: string }, searchParams: { channel?: string, state?: string, q?: string } }) {
  const { user, orgId } = await requireSession(params.org)   // authz first, always

  const list = await conversations.list({
    orgId,                                  // ← scoping is never optional
    channel:  searchParams.channel,
    state:    searchParams.state ?? 'open',
    assignee: searchParams.assignee,
    query:    searchParams.q,
    limit:    50,
  })

  return <ConversationList initial={list} orgSlug={params.org} />
}
```

**(b) Interactive filtering and mutations — a Server Action.** This is your RPC layer. It's a POST endpoint under the hood, but you never write a route, a fetch call, or a response type:

```ts
// app/(inbox)/[org]/actions.ts
'use server'
import { requireSession } from '@/lib/auth'
import { conversations, messages } from '@acme/core'
import { enqueue } from '@acme/core/queue'

export async function searchConversations(orgSlug: string, input: SearchInput) {
  const { orgId } = await requireSession(orgSlug)          // ← every action. no exceptions.
  return conversations.search({ orgId, ...input })
}

export async function sendMessage(orgSlug: string, input: SendInput) {
  const { user, orgId } = await requireSession(orgSlug)

  // The agent identity comes from the SESSION, never from the client.
  // This is finding S7 in ANALYSIS.md — today it arrives as a form field.
  const msg = await messages.createOutbound({
    orgId,
    conversationId: input.conversationId,
    body: input.body,
    attachments: input.attachments,
    sentByUserId: user.id,
  })

  await enqueue('outbound.send', { messageId: msg.id })     // worker does the provider call
  return msg
}
```

Called from the client like a plain function — fully typed, no `fetch`, no endpoint:

```tsx
'use client'
import { sendMessage } from './actions'

const [pending, start] = useTransition()
start(async () => { await sendMessage(orgSlug, { conversationId, body }) })
```

**(c) The worker — imports the exact same functions:**

```ts
// apps/worker/handlers/inbound.ts
import { contacts, conversations, messages } from '@acme/core'
import { getAdapter } from '@acme/channels'

export async function handleInbound(job: { eventId: string }) {
  const event   = await inboundEvents.claim(job.eventId)     // idempotent: no-op if done
  const adapter = getAdapter(event.channel)

  for (const parsed of adapter.parseInbound(event.payload)) {
    const contact      = await contacts.resolveOrCreate(event.orgId, parsed.identity)
    const conversation = await conversations.getOrOpen(event.channelAccountId, contact.id)
    await messages.createInbound({ conversationId: conversation.id, ...parsed })
    // no explicit broadcast — a DB trigger fires realtime.send() (§7.1)
  }
}
```

Same `packages/core` functions, same types, same tests. **That's the payoff of putting the ORM in a package instead of in an app.**

### 3.3 When you *do* need real HTTP endpoints

Only three cases — all of them for callers that aren't your own UI:

| Endpoint | Who calls it | Why it can't be a Server Action |
|---|---|---|
| `POST /api/webhooks/[channel]` | Meta, Twilio | External systems; they need a stable URL and their own signature scheme |
| `POST /api/public/widget/*` | Anonymous website visitors | No session. **Your only unauthenticated write surface** — org-scoped public key, strict origin allow-list, hard rate limits |
| `/api/v1/*` (later) | Third parties, a future mobile app | Versioned public contract |

Everything else — every list, filter, search, send, assign, close, merge — is a Server Component or a Server Action.

### 3.4 The rule that keeps this honest

> **Prisma may only be imported inside `packages/core`.**

Enforce it with an ESLint `no-restricted-imports` rule so it's mechanical, not a matter of discipline. This one constraint is what prevents you from ending up back where you are today — where the same 40-line contact-search query is duplicated verbatim in `side-bar.tsx:14-70` and `_actions.ts:6-59` because two different layers both had direct database access.

Corollary: **`orgId` is a required parameter on every function in `core`.** Not optional, not defaulted, not read from ambient context. If it's required by the type system, you cannot forget it, and cross-tenant leakage becomes a compile error instead of an incident.

### 3.5 Prisma, or something else?

Since you're rewriting the schema anyway, it's fair to ask. My answer: **stay on Prisma.**

- **Prisma** — you already use it, the team knows it, migrations are solid, the client is excellent. Downsides: heavier runtime, and the pooler caveats in §1. Its weak spot is complex analytical SQL, which you can drop to raw SQL for.
- **Drizzle** — lighter, closer to SQL, better in edge runtimes. Genuinely nice. But it's a second rewrite stacked on top of the schema redesign, for a benefit you won't feel at your scale.
- **Kysely** — best-in-class typed query builder, no migration story of its own.

Doing the schema redesign *and* an ORM swap simultaneously means when something breaks you won't know which change caused it. Do one thing at a time. Revisit if the pooler causes real pain.

### 3.6 Auth: switch to Supabase Auth

You're on NextAuth v4 with email magic links (`chat-client/app/utils.ts`). Since Realtime and Storage both need authorization, the two options are:

- **Keep Auth.js v5** — you'd mint a Supabase-compatible JWT signed with the Supabase JWT secret so Realtime and Storage policies can read it. Documented, but it's glue you own forever.
- **Switch to Supabase Auth** — magic links work the same way, and `auth.uid()` is available in every RLS and Realtime policy with no glue at all.

**Recommendation: switch.** You have no production users to migrate (decision #2), so it costs almost nothing today and gets more expensive every month you wait. Put `org_id` and `role` into the JWT with a custom access token hook so Realtime topic authorization and the RLS backstop can both read them.

The one thing you lose is the hardcoded email-domain allow-list in `utils.ts:56-60` — which is finding S12 and something you wanted gone anyway. Replace it with a per-org `allowed_domains` column plus an invitation flow.

---

## 4. Cross-channel identity

> *"how would it be possible to identify the same person is writing through ig and whatsapp? would i see messages that person sent through whatsapp and instagram in the same chat?"*

These are two different problems and it's worth keeping them apart, because the answers point in opposite directions:

1. **Linking** — deciding that an Instagram user and a WhatsApp user are the same human.
2. **Display** — what the agent sees once you've decided that.

The short version: **linking is sometimes automatic and sometimes needs a human. Display should unify the *contact* but keep the *threads* separate — and there's a hard technical reason for that, not just a design preference.**

### 4.1 Linking: the confidence ladder

Every channel hands you a different identifier. What you can do depends entirely on whether two channels share a *strong* one:

| Channel | Identifier you get | Strong ID? |
|---|---|---|
| WhatsApp | `wa_id` — a phone number | ✅ **Phone** |
| Twilio SMS | `From` — a phone number | ✅ **Phone** |
| Email | RFC-5322 address | ✅ **Email** |
| Web widget | anonymous token, until they tell you who they are | ⚠️ Only after self-identification |
| Instagram | IGSID — a page-scoped opaque ID, plus username and display name | ❌ **Neither** |
| Messenger | PSID — same situation | ❌ **Neither** |

So the ladder, highest confidence first:

**Tier 1 — Deterministic, auto-link. Phone or email match.**
Normalize to E.164 (you already have `normalizePhoneNumber` handling 187 country codes) or lowercase the email, look up `ContactIdentity`, and attach. No human involved.

**This tier fully solves Mansa Miami and does nothing for Mansa Panama.** Miami runs SMS and WhatsApp on the *same* +1 number, so both channels observe the same E.164 and a customer who texts and then WhatsApps resolves to one `Contact` automatically — zero UI, zero heuristics. Panama runs WhatsApp alongside Instagram and Messenger, which share no strong identifier with it at all, so Tier 1 never fires there.

**Because Panama is your bigger, more multi-channel org, assisted linking is the primary path — not the fallback.** How the tiers actually rank for you:

| | Where it applies | Priority |
|---|---|---|
| **Tier 1** auto-link | **Miami** (SMS ↔ WhatsApp, same number) | build it — ~20 lines, and it fully covers one org |
| **Meta ID matching** | **Panama** (IG ↔ Messenger, same Business Manager) | **check this early** (§5.1) — could turn a whole class of manual merges into automatic ones |
| **Tier 2** self-identification | **Panama** (IG/FB → phone or email in message text) | **primary.** You already extract these (`sdk/openai.ts:63`) — wire it into linking |
| **Tier 3** deliberate linking | **Panama** (IG/FB → WhatsApp) | **worth building.** The `wa.me/…?text=Code:A7F3K` handoff is the only route to certainty between the Meta channels and WhatsApp |
| **Tier 4** fuzzy suggestion | Panama | needed, but never auto-merge |
| **Merge/unmerge UI** | Panama | **essential — ships with Panama's second channel** |

**Tier 2 — Self-identification.** ▼ *demoted 2026-08-19*
The person types an email or phone into the conversation, and your existing LLM extraction (`sdk/openai.ts:63`) picks it up. Since duplicates are now an accepted default (§4.2), **don't auto-link on this** — an LLM misreading a phone number in a sentence must never silently merge two strangers. Let it *populate* `primaryPhone`/`primaryEmail` with `source: 'extracted'`, which makes the manual merge search work well. Nothing more.

**Tier 3 — Deliberate linking via a handoff token.** ▲▲ *promoted to primary — this is now the mechanism*
The person crosses channels carrying a token you issued. Full design in **§4.5** — it covers your Instagram case and, more importantly, the webchat→WhatsApp continuation.

**Tier 4 — Fuzzy matching.** ✖ **Cut 2026-08-19.**
Name similarity, profile-photo matching, activity-window overlap. **Dropped at your direction, and I think that's the right call** — it was the most complex mechanism, the most likely to produce a wrong merge, and it only ever produced *suggestions* a human still had to confirm. Manual merge (§4.6) does the same job with a better interface and no false positives. This removes real scope from Phase 4.

### 4.2 The merge rule

**Revised 2026-08-19 to what you chose — and it's a better default than what I had:**

> **Duplicates are the default and that's fine.** Contacts link only two ways: **automatically**, on a token you issued (§4.5) or a shared verified phone/email within one org (Tier 1); or **manually**, when a human clicks merge (§4.6). Nothing is ever merged on a guess. Every merge is reversible and audited.

The asymmetry is what makes this right. A **missed** merge is a mild annoyance — two rows in a contact list. A **wrong** merge shows Person A's private conversation history to Person B: a data breach you created yourself, in a system whose entire purpose is handling customer conversations. Accepting duplicates as the resting state means you never trade that risk for tidiness, and it removes fuzzy matching from the roadmap entirely.

The one thing to watch is that duplicates aren't free — Panama will accumulate them across WhatsApp, Instagram and Messenger. That's an argument for making merge *easy and obvious* in the UI (§4.6), not for merging automatically.

### 4.3 Display: one chat or two?

Here's the honest answer, and the reason is technical rather than aesthetic.

**You cannot reply into a merged stream, because a reply has to go somewhere.** There's no "message the human" primitive — the outbound call is either the WhatsApp Graph API or the Instagram Send API. Whatever the UI looks like, the agent must choose a channel. Any design pretending otherwise just hides that choice until it fails.

There's a second reason: **WhatsApp's 24-hour session window is per-conversation, not per-person.** If you fused the threads, you'd hide the fact that WhatsApp has closed (templates only) while Instagram is still open. The agent would type a normal reply and get an opaque API error — which is finding 6.2 in the roadmap and exactly the confusion you want to design out.

So: **unify the contact, keep the conversations, and give a unified timeline as a view.**

```
┌────────────────┬────────────────────────────────────┬──────────────────┐
│  INBOX         │  María González                    │  CONTACT         │
│                │  ╭──────────╮╭──────────╮╭───────╮ │                  │
│ ● María G.  WA │  │ All (2)  ││ WhatsApp ││  IG   │ │  📞 +507 6677…   │
│   Carlos R. IG │  ╰──────────╯╰──────────╯╰───────╯ │  ✉️  maria@…     │
│   Ana P.   SMS │                                    │                  │
│                │  ┌── ↓ unified timeline ──────────┐│  CHANNELS        │
│                │  │ [IG]  Hi, is this available?   ││   WhatsApp ✓     │
│                │  │                        14:02   ││   Instagram ✓    │
│                │  │ [IG]           Yes! →   14:04  ││    └ linked by   │
│                │  │ [WA]  Sending my address 14:31 ││      you, Mar 3  │
│                │  │ [WA]        Perfect →   14:33  ││                  │
│                │  └────────────────────────────────┘│  ⚠ WA window     │
│                │                                    │    closes in 4h  │
│                │  ┌────────────────────────────────┐│                  │
│                │  │ Reply on: [WhatsApp ▾]         ││  Odoo: Lead #412 │
│                │  │ Type a message…          [→]   ││                  │
│                │  └────────────────────────────────┘│                  │
└────────────────┴────────────────────────────────────┴──────────────────┘
```

The pieces that make this work:

- **Tabs**: `All` (interleaved, channel-badged) plus one per channel. Default to `All`.
- **An explicit channel selector on the composer.** Defaults to the most recently active *open* channel. Always visible, so the agent is never guessing where a reply goes.
- **Per-channel state shown honestly** — the WhatsApp window countdown, template-only mode, "Instagram: replies allowed for 7 days."
- **Provenance on the link** — who linked these identities and when, with one click to undo.

This is where Front and Intercom both landed, for the same reason: the reply needs a destination.

### 4.4 The schema that makes it work

```prisma
model Contact {                          // the HUMAN. zero channel fields.
  id           String   @id @default(cuid())
  orgId        String
  org          Organization @relation(fields: [orgId], references: [id])
  displayName  String?
  primaryPhone String?                   // normalized E.164, for matching
  primaryEmail String?                   // lowercased, for matching
  identities   ContactIdentity[]
  conversations Conversation[]
  @@index([orgId, primaryPhone])
  @@index([orgId, primaryEmail])
}

model ContactIdentity {                  // ← the table that makes it omnichannel
  id         String   @id @default(cuid())
  contactId  String
  contact    Contact  @relation(fields: [contactId], references: [id])
  channel    Channel                     // whatsapp | instagram | sms | email | web
  externalId String                      // wa_id | IGSID | E.164 | address | token
  handle     String?                     // @username, display name
  verified   Boolean  @default(false)    // Tier 1/2 vs Tier 3/4
  linkedBy   String?                     // null = automatic, else userId
  linkedAt   DateTime @default(now())

  @@unique([channel, externalId])        // one identity, one owner. the whole trick.
  @@index([contactId])
}

model Conversation {                     // one per (channel account × contact)
  id                String   @id @default(cuid())
  orgId             String
  channelAccountId  String
  contactId         String
  state             ConversationState @default(open)   // open|pending|snoozed|closed
  assigneeId        String?
  lastMessageAt     DateTime?
  windowExpiresAt   DateTime?            // WhatsApp 24h. null where N/A.
  messages          Message[]

  @@unique([channelAccountId, contactId])
  @@index([orgId, state, lastMessageAt])
  @@index([orgId, assigneeId, state])
}
```

`@@unique([channel, externalId])` is doing the heavy lifting: an Instagram IGSID can belong to exactly one contact, so resolution is a single indexed lookup and merges can't create ambiguity.

**Resolution, in full:**

```ts
async function resolveOrCreate(orgId: string, identity: ExternalIdentity) {
  // 1. Seen this exact identity before?
  const known = await prisma.contactIdentity.findUnique({
    where: { channel_externalId: { channel: identity.channel, externalId: identity.externalId } },
    include: { contact: true },
  })
  if (known) return known.contact

  // 2. New identity — can we attach it to an existing person? (Tier 1)
  const strong =
    identity.phone ? { orgId, primaryPhone: normalizeE164(identity.phone) } :
    identity.email ? { orgId, primaryEmail: identity.email.toLowerCase() } : null

  const existing = strong ? await prisma.contact.findFirst({ where: strong }) : null

  // 3. Attach, or create a new person.
  return prisma.contact.upsert({
    where:  { id: existing?.id ?? '' },
    update: { identities: { create: { ...identity, verified: true } } },   // auto-linked
    create: {
      orgId,
      displayName:  identity.handle,
      primaryPhone: identity.phone && normalizeE164(identity.phone),
      primaryEmail: identity.email?.toLowerCase(),
      identities:   { create: { ...identity, verified: !!strong } },
    },
  })
}
```

**The unified timeline** is then just:

```ts
messages.findMany({
  where:   { conversation: { contactId } },      // every channel
  orderBy: { createdAt: 'asc' },
  include: { conversation: { select: { channelAccount: { select: { channel: true } } } } },
})
```

...and a single-channel tab adds `conversation: { channelAccountId }`. Same query, one more filter. **That's the entire payoff of the schema redesign** — the feature you asked about is a `where` clause instead of a project.

**Merging two contacts** = repoint the loser's `ContactIdentity` and `Conversation` rows at the survivor, copy any profile fields the survivor is missing, and write a `ContactMergeLog` recording exactly what moved. Because you logged it, unmerge is mechanical.

### 4.5 The handoff token — one mechanism, several products

Your two examples — *"send a WhatsApp link through IG"* and *"continue chatting on WhatsApp"* from the web widget — are the same mechanism. **Build it once, generic over source channel, target channel, and purpose.** It covers:

| From | To | Trigger | Value |
|---|---|---|---|
| Web widget | WhatsApp | "Continue on WhatsApp" button | **Highest — carries ecommerce context** |
| Instagram / Messenger | WhatsApp | Agent sends the link in-thread | Solves Panama's hard case |
| Web widget | SMS | Same button, Miami | Same |
| Email | WhatsApp | Link in signature | Later |

#### The naive version is forgeable — don't ship it

Your sketch was `"Hey im @user.from.ig"`. That reads naturally, and it's exactly the thing an attacker would send. **A username is a public, guessable claim.** Anyone who knows a customer's Instagram handle could message your WhatsApp saying "Hey im @maria.lopez", get linked to her contact, and see her entire conversation history. That's a self-inflicted account takeover.

The fix is small: **the signal must be an opaque token you issued, not an identity the sender asserts.**

```
❌  Hey im @maria.lopez                    ← guessable, forgeable
✅  Hi! I'd like to continue our chat. Ref: 7K4M9X
```

Keep the human-readable sentence for UX — just make the *load-bearing* part unguessable.

#### The token

```prisma
model LinkToken {
  token          String    @id                // 8 chars, Crockford base32
  orgId          String
  contactId      String                       // the contact to link INTO
  conversationId String?                      // origin thread, for context
  purpose        LinkPurpose                  // web_to_whatsapp | ig_to_whatsapp | …
  expiresAt      DateTime                     // 30–60 min
  consumedAt     DateTime?
  consumedByMessageId String?
  createdByUserId String?                     // null = self-serve widget button
  @@index([orgId, expiresAt])
}
```

Five rules, all cheap:

1. **Unguessable** — ≥40 bits of entropy from a CSPRNG. Use **Crockford base32** (no `I`, `L`, `O`, `U`) so a customer who retypes it by hand can't produce an ambiguous character.
2. **Single use** — consume atomically on first match. A forwarded screenshot must not link a second person.
3. **Short TTL** — 30–60 minutes. The intent is "I am crossing channels right now."
4. **Org-scoped** — a Panama token can never link a Miami contact. Enforce in `core`, not just in the query.
5. **Fail soft** — invalid, expired, already-consumed, or edited-away all degrade to "a normal new WhatsApp conversation." Duplicates are an accepted outcome (§4.2), so there is no error state to design.

#### Detection

WhatsApp prefills the text but **the user can edit or delete it before sending**, so treat arrival as best-effort. On inbound WhatsApp messages, regex for the `Ref: XXXXXXXX` pattern; if it resolves to a live token in the same org, link and consume. Otherwise ignore it completely and let the normal contact-creation path run.

Scan only the **first inbound message of a new conversation**. Scanning every message forever is a needless merge surface for no benefit.

#### The webchat → WhatsApp flow

This is the one you said will be widely used, and it's worth more than identity plumbing — **it's the reason to build the widget at all.**

```
1.  Visitor chats on your store.  Contact + ContactIdentity(web, visitorId)
                                  + Conversation, all anonymous.
2.  Clicks "Continue on WhatsApp".
3.  App mints LinkToken → contactId, purpose=web_to_whatsapp, ttl 45m.
4.  Opens  wa.me/<org number>?text=Hi!%20I'd%20like%20to%20continue…%20Ref%3A%207K4M9X
5.  They send it.  Webhook arrives with a brand-new wa_id.
6.  Handler resolves the token →  ContactIdentity(whatsapp, wa_id)
                                   attached to the SAME contact.
7.  Agent opens WhatsApp thread and sees the ENTIRE website conversation
    in the unified timeline — plus cart, pages viewed, order in progress.
```

Step 7 is the payoff. The agent picks up a WhatsApp conversation already knowing what the visitor was looking at and what's in their cart. **That's a materially better handoff than any of your competitors' widgets**, and it exists only because §4.4 separates `Contact` from `Conversation`.

Three details worth getting right:

- **Carry ecommerce context deliberately.** Cart contents, viewed products, order in progress, and UTM/referrer belong on the widget `Conversation` as structured metadata — not buried in message text. Then the handoff moves real data, not a transcript.
- **Close the web thread as `continued_on_whatsapp`**, don't leave it open. Otherwise an agent replies into a widget the visitor has already closed.
- **The visitor is anonymous until this moment.** The handoff is often the first time you learn a phone number — which makes it your main lead-capture event, and a natural place to create the CRM lead (§6.5).

### 4.6 Manual merge — the admin flow you described

Select two contacts, click merge. Design notes so it stays safe:

- **Preview before committing.** Show exactly what moves: which identities, how many conversations and messages, which profile fields conflict. Never merge blind.
- **Explicit survivor.** The agent picks which contact survives; per-field conflicts resolve to the survivor, with the loser's values retained in the merge log rather than discarded.
- **Same-org only.** Enforced in `core` — cross-org merge must be structurally impossible, not merely absent from the UI (§5).
- **Reversible.** `ContactMergeLog` stores every moved row ID, so unmerge is mechanical rather than archaeological.
- **Audited.** Who, when, which direction.
- **Guard the obvious** — self-merge, double-merge of an already-merged loser, and concurrent merges of the same pair.
- **Find the duplicate easily.** Panama will accumulate these, so the merge picker needs decent search across name, phone, email and handle. This is where demoted Tier-2 extraction earns its keep: an email the LLM pulled out of an Instagram DM is what makes that contact findable when the agent goes looking.

**Open question:** can any agent merge, or admins only? I'd let agents merge (they're the ones who notice) but restrict **unmerge** to admins — undoing is rarer and riskier.

---

## 5. Organizations and channel accounts

> *"i should be able to add organizations (each with one number / email / user) and give each org a short name"*

```prisma
model Organization {
  id             String   @id @default(cuid())
  slug           String   @unique          // ← your short name. URLs: /acme/inbox
  name           String
  allowedDomains String[] @default([])     // replaces the hardcoded list (S12)
  channelAccounts ChannelAccount[]
  members        Membership[]
  contacts       Contact[]
  conversations  Conversation[]
}

model ChannelAccount {
  id            String   @id @default(cuid())
  orgId         String
  channel       Channel                    // whatsapp | instagram | sms | email | web
  displayName   String                     // "Panama Sales", "@acme_store"
  externalId    String                     // phone_number_id | IG page id | Twilio SID
  phoneE164     String?                    // set for whatsapp + sms
  credentials   Json                       // ENCRYPTED AT REST — see below
  active        Boolean  @default(true)
  conversations Conversation[]

  @@unique([channel, externalId])
  @@index([orgId, channel])
}

model Membership {
  userId String
  orgId  String
  role   Role     @default(agent)          // owner | admin | agent
  @@id([userId, orgId])
}
```

### 5.1 Your actual Phase 1: two orgs, and each one exercises a different identity path

Updated 2026-08-19. This is the third revision of this section — and the shape that finally emerged is genuinely useful, because **your two orgs happen to be the two canonical cases.**

```
Organization  slug: "mansa-pa"   name: "Mansa Panama"      defaultCountry: PA
 ├── ChannelAccount  channel: whatsapp   phoneE164: +507…
 ├── ChannelAccount  channel: instagram  externalId: <IG page id>
 ├── ChannelAccount  channel: messenger  externalId: <FB page id>
 └── …more                                          ← §9: which ones?

Organization  slug: "mansa-mia"  name: "Mansa Miami"       defaultCountry: US
 ├── ChannelAccount  channel: sms        phoneE164: +1…    (Twilio)
 └── ChannelAccount  channel: whatsapp   phoneE164: +1…    ← SAME number
```

| | **Mansa Panama** | **Mansa Miami** |
|---|---|---|
| Channels | WhatsApp + Instagram + Messenger (+ more) | SMS + WhatsApp, **one number** |
| Shared strong identifier? | ❌ WhatsApp has a phone; IG/FB have neither | ✅ same E.164 on both |
| Identity path | **Tier 2/3/4 + merge UI** — the hard case | **Tier 1 auto-link** — solved, zero UI |
| Needs the merge UI? | **Yes, from the second channel onward** | No |

**This materially re-prioritises the roadmap.** In the previous draft each org had one channel, so cross-channel identity could wait. It can't now — **Mansa Panama is multi-channel from day one, in the hardest configuration there is.** Identity resolution and the merge UI move from "somewhere in Phase 4" to "ships with the second Panama channel." That's reflected in §8.

**One Meta-specific lead worth chasing early.** Instagram and Messenger are both Meta assets. If the Panama IG account and FB Page sit in the **same Meta Business Manager**, Meta offers ID-matching endpoints (`/{user-id}/ids_for_pages`, `ids_for_apps`) that can tell you a PSID and an IGSID belong to the same person — which would turn IG↔FB from a Tier-4 guess into a Tier-1 certainty. It won't help you link either of them to WhatsApp (different API family), but it removes a big chunk of the manual merging. **Verify the current permission requirements and that both assets are under one Business Manager** before you plan around it — but check early, because it changes how much merge UI you need.

**Across orgs there is still nothing to link, by design.** `Contact` is scoped to `orgId`, so someone who contacts both businesses becomes two contacts. These are separate tenants; silently merging them would leak Panama's conversation history into Miami. See (b) below for the hedge.

**Four consequences worth acting on now:**

**(a) Add `defaultCountry` to `ChannelAccount`.** Your `normalizePhoneNumber` currently hardcodes a global fallback — 8 digits → Panama, 10 digits → US (`sdk/utils.ts:35-48`). That happens to fit these two orgs today, which is exactly why it's dangerous: a Miami customer who types 8 digits gets silently parsed as Panamanian, and the bug looks like a mystery duplicate contact. Make the fallback a per-`ChannelAccount` property and pass it in.

**(b) Add a nullable `Organization.groupId` now, and don't build anything on it.** "Mansa Panama" and "Mansa Miami" read like one brand with two locations, so there's a fair chance you'll eventually want *"this customer also buys from our other store."* That needs an account/group layer above `Organization`. Building it speculatively is waste — but adding one nullable column costs nothing today and turns a painful future migration into a feature. **Cross-org contact visibility must stay an explicit, opt-in feature; never make it the default.**

**(c) US SMS has a registration gate with real lead time.** Sending application-to-person SMS to US numbers through Twilio requires A2P 10DLC brand and campaign registration (or a verified toll-free number). Unregistered traffic gets filtered by carriers. This takes days to weeks and is entirely outside your control — **start it now**, well before Phase 4, or Mansa Miami will be blocked on paperwork rather than code.

**(d) Mansa Miami needs one guard the design doesn't give you for free.** With SMS and WhatsApp on the *same* number, a customer can reasonably send on either, and WhatsApp will happily deliver to a handset that also receives SMS. Two things follow:

- **Reply on the channel they last used**, not a fixed default. The composer's channel selector (§4.3) should default to the most recent inbound channel for that contact, or you'll answer a WhatsApp message by SMS and charge yourself for the privilege.
- **Watch for echo.** If Twilio and WhatsApp both surface the same underlying message, you'd create two `Message` rows on two conversations. Provider message IDs differ, so idempotency won't catch it. Test this explicitly during Phase 4 — it's the kind of thing that only shows up with a real number.

### 5.2 Three rules that keep multi-org safe

1. **`orgId` is a required argument on every `core` function.** Not optional, not from ambient context. Cross-tenant leakage becomes a type error rather than an incident.
2. **RLS policies on every table**, scoped to the `org_id` claim in the JWT — the backstop from §3.1.
3. **`credentials` must be encrypted at rest.** Per-org WhatsApp tokens and Twilio secrets in a plaintext `Json` column is how one compromised database row becomes every tenant's messaging compromised. Use `pgsodium`/Supabase Vault, or envelope-encrypt in `core` — but decide before the first real token goes in.

**On "one user per org":** model `Membership` as many-to-many from day one. It's the same amount of code today and it's the difference between "add a teammate" being a UI change versus a migration. Your `ANALYSIS.md` §6.2 conversation-assignment work assumes multiple agents anyway.

---

## 6. Standalone first, CRM integrations second

> *"before this app integrated with monday.com, now we use odoo… i want to make the app completely standalone, then introduce integrations for major CRMs"*

Right call, and the sequencing matters. If you integrate before you have your own model, the external CRM's schema becomes your schema — which is exactly how Monday board IDs ended up hardcoded in `whatsapp.ts:113` and `contact-info.tsx:23`.

### 6.1 Killing Monday (Phase 0 — it's pure deletion)

| What | Where |
|---|---|
| `packages/sdk/monday.ts` | 264 lines — delete |
| `packages/cli` | entire package (your decision #6) — delete |
| Inline CRM calls | `routes/whatsapp.ts:112-126`, `:246-256` |
| Hardcoded board IDs | `whatsapp.ts:113`, `:248` (`5244743938`), `contact-info.tsx:23` (`5244733915`) |
| Schema fields | `Contact.monday_id`, `Chat.monday_id`, `Template.monday_id` |
| Monday deep-links | `contact-info.tsx`, `message-box.tsx`, `user-menu.tsx` |
| `mondayAuth` stub + `getCurrentUser(mondayToken)` | `chat-client/app/utils.ts` |
| `NEXT_PUBLIC_MONDAY_URL`, `MONDAY_API_KEY` | env files, `client.tf` |

Nothing depends on it, so this is a clean afternoon's work. Do it in Phase 0 — every day it stays, the schema redesign has to account for it.

### 6.2 What "standalone" actually requires

You have `Contact` and a `ContactStatus` funnel enum. A standalone CRM core needs:

| Entity | Status | Notes |
|---|---|---|
| Contact | ✅ have it | Redesigned in §4.4 |
| Company / Account | ❌ | `Contact.company_name` is a free-text string today |
| **Lead / Opportunity** | ⚠️ partial | `ContactStatus` is a funnel glued onto the contact. Needs to be its own entity — one person can have several deals |
| Pipeline / Stage | ❌ | Configurable per org, not a hardcoded enum |
| **Quotation** | ❌ | See §6.4 |
| Note / Activity log | ❌ | |
| Tag, custom field | ❌ | |
| Task / reminder | ❌ | |

The important structural change: **a Lead is not a status on a Contact.** Model it separately, linked to both the contact and the conversation that produced it — which is what makes "inbound message creates a lead" traceable back to the message that caused it.

### 6.3 The integration port

Mirror the `ChannelAdapter` pattern exactly — one interface, one package per provider, nothing outside `packages/crm/*` knows which CRM exists:

```ts
interface CrmAdapter {
  readonly crm: 'odoo' | 'hubspot' | 'monday'

  // outbound: local → CRM
  upsertContact(c: Contact):       Promise<{ externalId: string }>
  createLead(l: Lead):             Promise<{ externalId: string }>
  logActivity(a: Activity):        Promise<void>
  createQuotation(q: Quotation):   Promise<{ externalId: string; pdfUrl: string }>

  // inbound: CRM → local
  pullContact(externalId: string): Promise<Partial<Contact>>
  handleWebhook?(raw: unknown):    Promise<CrmEvent[]>
}
```

Plus a generic `ExternalRef { entityType, localId, crm, externalId, syncedAt }` table, so you never add another `monday_id`-style column to a core model again.

**Sync runs on its own queue.** Your current code calls Monday *inline inside the webhook handler* (finding #2 in `ANALYSIS.md` §5.2), so a CRM outage delays or fails message delivery. On a separate queue, a CRM being down means stale CRM data — nothing more.

### 6.4 Odoo

Odoo exposes XML-RPC at `/xmlrpc/2/common` (authenticate) and `/xmlrpc/2/object` (`execute_kw` for everything else). It's verbose but it's been stable for many years, which is what you want in an integration. The mapping:

| Yours | Odoo model | Notes |
|---|---|---|
| Contact | `res.partner` | Match on `phone`/`mobile`/`email`. Normalize to E.164 first — Odoo won't |
| Company | `res.partner` with `is_company = true` | Same model, parent/child via `parent_id` |
| Lead | `crm.lead` | `type='lead'` vs `'opportunity'`; stages are `crm.stage` |
| **Quotation** | `sale.order` | A quotation *is* a `sale.order` in `draft`/`sent` state |
| Line item | `sale.order.line` | |
| Activity / note | `mail.message` on the record's chatter | Where you'd mirror conversation history |

#### Your instance: Odoo.sh, 18 → 19

**Odoo.sh is the best of the three hosting options for this integration**, and it changes a couple of my recommendations:

- **You can deploy custom modules.** Odoo Online (SaaS) can't — it's the main reason integrations there are painful. This opens a cleaner option, below.
- **You get staging branches.** Build and test the integration against a staging branch with production-like data, without any risk to live CRM records. Use this; don't develop against production.
- **You get SSH and direct DB access**, which makes introspecting the actual field names on your instance trivial rather than guesswork.
- **Git-based deploys** means the integration module versions alongside the rest of your Odoo customisation.

**On the 18 → 19 upgrade — the sequencing works in your favour, so don't rush it.** CRM integration is Phase 8 in §8, roughly four months out. You'll be settled on 19 long before then. Two things I'd hold to:

1. **Finish the upgrade before you start integration work.** Building against 18 and then upgrading means retesting the whole surface. There is no upside to overlapping them.
2. **Don't take my field names on faith — verify against your v19 instance.** The *model* names (`res.partner`, `crm.lead`, `sale.order`, `sale.order.line`, `mail.message`) have been stable across many major versions and I'd bet on them. Individual *field* names and some behaviours do shift between majors, and I'm not going to assert specifics for 19 that you can check in a minute: query `ir.model.fields` on your own instance, or read the model in Odoo Studio. Do this once, early, and write it down.

#### XML-RPC vs a custom module

Because you're on Odoo.sh, you have a choice I'd otherwise not offer:

| | **XML-RPC from your app** | **Custom Odoo module** |
|---|---|---|
| Effort | lower to start | higher upfront |
| Round trips | many, chatty | one call per operation |
| Business logic | lives in your app | lives in Odoo, near the data |
| Version coupling | loose — XML-RPC is very stable | tighter — module needs porting each major |
| Inbound (Odoo → app) | needs automation rules | trivial, you own the code |

**Start with XML-RPC.** It's stable, it works identically on every hosting type, and it keeps the CRM swappable behind the `CrmAdapter` port — which matters because HubSpot and Monday are on the roadmap behind Odoo. Reach for a custom module only if you hit a specific wall: chatty multi-step operations that need to be atomic, or Odoo-side business logic you can't replicate.

**For the Odoo → app direction** (quotation accepted, lead stage changed, invoice paid), Odoo's automation rules can fire an outbound webhook at your `/api/webhooks/odoo` endpoint. Confirm what your v19 automation rules support during the upgrade — if it's limited, a small custom module makes this trivial and is a good first use for the Odoo.sh custom-code capability.

### 6.5 Sending quotations through chat

> *"the capability of sending quotations and etc through this chat app to one or more channels connected to a given user"*

This is a genuinely strong feature and the architecture already supports it — it's a **document attachment plus an outbound send**, both of which exist.

```
Agent in conversation → "Create quotation"
   → panel: pick products, quantities, discount  (from the local catalog,
                                                  or pulled live from Odoo)
   → core.quotations.create()                    ← YOUR record, always
   → render PDF                                  ← your template, or Odoo's report
   → upload to Supabase Storage (private bucket)
   → adapter.sendOutbound({ type: 'document', ... })
   → [if Odoo connected] queue: create sale.order, attach the PDF, link ExternalRef
```

Three design points worth fixing now:

1. **The quotation is yours, not Odoo's.** Create it locally, sync outward. Otherwise the feature breaks for standalone users and for orgs on a different CRM.
2. **Respect channel capabilities.** WhatsApp takes a PDF document natively. SMS cannot — it needs a *signed, expiring* link instead. Instagram has its own constraints. This is exactly what the `capabilities` descriptor on `ChannelAdapter` is for; the composer reads it and adapts rather than failing at send time.
3. **"To one or more channels"** — send the same quotation to WhatsApp *and* email. Because §4 gives you one `Contact` with many `ContactIdentity` rows, "send to this person on channels X and Y" is a loop over identities. It'd be near-impossible in your current schema.

Inbound is the mirror image: a message arrives → optionally an LLM classifies intent → if it looks like a purchase intent, create a local `Lead` linked to that conversation → queue a sync that creates the `crm.lead` in Odoo. Your existing extraction code (`sdk/openai.ts:63`) already pulls name, email, company and interests — that's most of a lead record, and it just needs somewhere structured to land.

---

## 7. The three things that used to need EC2

### 7.1 Realtime

Use **Broadcast**, fired from the database so Postgres stays the source of truth:

```sql
create or replace function notify_new_message() returns trigger as $$
begin
  perform realtime.send(
    jsonb_build_object('id', new.id, 'conversation_id', new.conversation_id,
                       'direction', new.direction, 'body', new.body),
    'message.created',
    'conv:' || new.conversation_id,
    false
  );
  return new;
end; $$ language plpgsql;

create trigger on_message_created after insert on messages
  for each row execute function notify_new_message();
```

Client subscribes to only what it's authorized for:

```ts
supabase.channel(`conv:${conversationId}`)
  .on('broadcast', { event: 'message.created' }, ({ payload }) => append(payload))
  .subscribe()
```

Topic authorization is an RLS policy on `realtime.messages` checking the JWT's `org_id` against the conversation's org. **That single policy is the fix for finding S2** — today `io.emit()` at `whatsapp.ts:96` sends every message to every connected socket with no authentication whatsoever.

Typing indicators and "agent viewing this conversation" move to **Presence**, which is ephemeral and doesn't touch the database — better than today's `socket.broadcast.emit('typing')`, and it removes the `seen_by` JSON blob problem (finding D9).

### 7.2 Storage

Private buckets, UUID keys, signed URLs with short TTLs. That's findings **S6** (world-readable customer media) and **D7** (one attachment per message) resolved together, since `Attachment` becomes its own table.

Supabase Storage is S3-compatible, so `sdk/s3.ts` mostly survives — swap the endpoint and credentials. Built-in image transformation replaces the `sharp` resize at `s3.ts:121`, which also drops a heavy native dependency from your Docker build.

### 7.3 Queue

`pgmq` in the same Postgres. The property that matters:

```ts
await prisma.$transaction(async (tx) => {
  const event = await tx.inboundEvent.create({ data: { ...raw, idempotencyKey } })
  await tx.$executeRaw`select pgmq.send('inbound', ${JSON.stringify({ eventId: event.id })}::jsonb)`
})
```

The job and the row commit together. A job can never reference something that rolled back, and a committed row can never be missing its job.

Use `pg_cron` for periodic work — reconciling stuck `pending` messages, expiring WhatsApp windows, retrying failed CRM syncs.

> ✅ **Settled 2026-08-19 — pgmq on Supabase.** `pgmq` is available as a Supabase Postgres extension (it's what Supabase Queues is built on): enable it from **Database → Extensions**, or `create extension pgmq;`. Confirm it's enabled on your project during Phase 1.1 before building on it — extension availability is the one thing worth checking at provisioning rather than assuming.
>
> The SQS analysis below is kept for the record. It's no longer the recommendation: SQS would pull an AWS account back into a stack you've deliberately reduced to Vercel + Supabase, and §7.4 removes the one advantage that made it tempting.

#### Considered and rejected: Amazon SQS

**Yes — it's a legitimate choice, and it comes with one real advantage I under-weighted in the original design.** Here's the honest comparison.

**What you give up: transactional enqueue.** The snippet above commits the row and the job atomically. SQS can't participate in a Postgres transaction, so you get the classic dual-write problem — write the row then send (send fails → orphaned row, no job), or send then write (job processed before the row exists).

**But you already have the fix.** Your `InboundEvent` table *is* a transactional outbox. The webhook writes the event and ACKs; something then relays it. So with SQS the flow becomes:

```
webhook → INSERT InboundEvent (status='pending') → 200      ← still atomic, still fast
        → relay reads pending rows → SQS.send → status='queued'
        → worker consumes SQS → processes → status='done'
```

The relay is the extra moving part. You can skip a dedicated relay and enqueue inline right after commit, as long as you add a **`pg_cron` sweep** that re-enqueues anything stuck in `pending` past ~60s. That sweep is worth having regardless — it's your safety net for any lost job — so the real cost is modest.

**What you gain: strict per-conversation ordering.** SQS **FIFO** with `MessageGroupId = conversationId` guarantees in-order processing within a conversation while still parallelising across conversations. `pgmq` has no equivalent. Content-based deduplication (5-minute window) also helps with provider webhook retries.

**How much does that ordering actually buy you?** Less than it first appears, which is why I'd still lean pgmq:

- **Display order** is unaffected — messages carry provider timestamps and the UI sorts by them.
- **Contact/conversation creation races** are already handled by `@@unique([channel, externalId])` and `@@unique([channelAccountId, contactId])`; the loser retries.
- **Status regression** (`read` overwritten by a late `delivered`) is fixed by the rank-based guard in finding B6, which is order-independent by construction.

So FIFO is a nice belt-and-braces, not a load-bearing requirement.

**The genuinely strong argument for SQS: it can remove the worker container entirely.** I flagged in §1 that Vercel can't host a long-running worker, so you'd need a small container on Fly.io or Railway. **SQS → Lambda is a native integration** — automatic scaling, batching, built-in DLQ, no polling loop to write, no container to operate. If avoiding a third deploy target matters more to you than provider count, that's a real win.

| | **pgmq** (recommended) | **SQS + worker container** | **SQS + Lambda** |
|---|---|---|---|
| Providers | 2 (Supabase, Vercel) | **3** (+ AWS) | **3** (+ AWS) |
| Worker to operate | small container | small container | **none** |
| Transactional enqueue | ✅ native | ⚠️ outbox + sweep | ⚠️ outbox + sweep |
| Per-conversation ordering | ✋ manual | ✅ FIFO | ✅ FIFO |
| DLQ / retries | roll your own | ✅ built in | ✅ built in |
| Local dev | just Postgres | LocalStack / ElasticMQ | LocalStack / SAM |
| Added latency | ~0 (`LISTEN/NOTIFY`) | ~100–500 ms long-poll | ~100–500 ms |
| Cost at your volume | included | ≈ free (1M req/mo tier) | ≈ free + Lambda |
| Ops surface | smallest | medium | medium |

**Decision: pgmq.** The SQS-plus-Lambda option was attractive only because it removed a worker container — and §7.4 removes that container without leaving Supabase. With that gone, SQS costs an AWS account, IAM, and a fourth credential set to buy FIFO ordering that the unique constraints and the rank-based status guard already make non-essential.

**Still build it behind an interface** — `enqueue(topic, payload)` / `dispatch(topic, handler)` in `packages/core/queue`. Under 100 lines, the rest of the codebase never learns which implementation is running, and if volume ever justifies SQS or BullMQ it's an afternoon rather than a refactor.

### 7.4 Running jobs with no worker container

This is how "Vercel + Supabase and nothing else" actually works. The trick is to **invert the queue**: instead of a worker polling for jobs, Postgres pushes each job out over HTTP the instant it commits.

```
  provider webhook
        │
        ▼
  Vercel  /api/webhooks/[channel]
        verify signature
        ┌─ INSERT InboundEvent  ─┐
        │                        ├─ ONE transaction
        └─ pgmq.send('inbound') ─┘
        return 200                          ← p99 well under 200 ms
                  │
                  ▼  Postgres trigger → pg_net (async HTTP, fire-and-forget)
        POST /api/jobs/inbound   { eventId }   + shared secret header
                  │
                  ▼  Vercel route handler — the "worker"
        claim (idempotent) → adapter.parseInbound → persist
                           → realtime.send() → archive the pgmq message
                  │
                  ▼
        pg_cron every ~30s: any job still un-archived past its visibility
        timeout gets re-dispatched. After N attempts → DLQ table.
```

**Two mechanisms, two jobs.** `pg_net` gives you *latency* — dispatch happens on commit, so an agent sees an inbound message in roughly the time it takes to run the handler. `pgmq` + `pg_cron` give you *durability* — they are the actual delivery guarantee. Never treat the `pg_net` call as reliable; treat it as a fast path over a queue that would have gotten there anyway.

**Why Vercel route handlers rather than Supabase Edge Functions.** Edge Functions sit closer to the database and are a reasonable choice, but they run Deno, and Prisma-on-Deno is off the happy path. Using Vercel routes keeps **one runtime and one copy of `packages/core`** — the UI, the webhooks, and the job handlers all import the same functions with the same types. Splitting business logic across two runtimes to save a network hop is a bad trade.

**Caveats to design around — these are real:**

1. **Function duration limits.** Downloading a large video from Meta and pushing it to Storage is the one job that might not fit. **Split media handling into its own job** so each invocation stays small: persist the message first (the agent sees it immediately), then fetch media in a follow-up job and patch the attachment in. Better UX *and* it sidesteps the limit.
2. **Protect `/api/jobs/*` with a shared secret.** These routes are publicly reachable. Verify a header on every request and never expose them to the browser.
3. **Connections.** Every concurrent job is a serverless invocation. Use the Supavisor pooler with `connection_limit=1` (§1) — this is exactly the scenario that exhausts a pool otherwise.
4. **Cap the retries.** Bound redelivery attempts and move exhausted jobs to a DLQ table with an admin view. A job that fails deterministically must stop, not loop.
5. **Idempotency is mandatory, not optional.** At-least-once delivery is guaranteed here — a job *will* occasionally run twice. Every handler claims its work atomically and no-ops if already done. You need this for provider webhook retries regardless (finding B5), so it's the same work.

**What this costs you versus a real worker:** long single jobs are awkward (mitigated by #1), and you pay per invocation instead of for idle container time — which at your volume is cheaper, not more expensive. **What it buys:** one deploy target, one runtime, two providers, zero servers.

---

## 8. Revised roadmap

Your decisions re-sequence `ANALYSIS.md` §8 meaningfully. Deltas are marked **▲ moved earlier**, **▼ moved later**, **✚ new**, **✖ deleted**.

### Phase 0 — Revival & deletion · ~1 week
Everything from `ANALYSIS.md` Phase 0 (toolchain pin, kill `"latest"` specifiers, Turbo v2, framework majors, env consolidation, Prisma singleton, green CI), plus:

- **✚ 0.11 Delete Monday entirely** — the checklist in §6.1. Pure deletion, one afternoon.
- **✚ 0.12 Delete `packages/cli`** — your decision #6.
- **✖ 0.6 Prisma migration baseline** — *dropped*. With no data to preserve (decision #2), you go straight to a fresh schema in Phase 2. Saves ~2 days.

### Phase 1 — Supabase migration ✚ *new phase* · ~1 week
Replaces most of the old Phase 1 security work and all of old 7.1, because the platform hands you the fixes.

| ID | Task | Size | Resolves |
|---|---|---|---|
| 1.1 | Provision Supabase; wire `DATABASE_URL` (pooled, `pgbouncer=true`) + `DIRECT_URL`; verify the interactive transactions at `utils/prisma.ts:36,70` behave under transaction-mode pooling | M | §1 gotchas 1–3 |
| 1.2 | Migrate S3/minio → Supabase Storage. **Private buckets, UUID keys, signed URLs** | M | **S6**, D7 |
| 1.3 | Replace Socket.IO with Supabase Realtime **Broadcast + Presence**, topic-authorized | L | **S2**, scaling ceiling |
| 1.4 | NextAuth v4 → **Supabase Auth**; `org_id` + `role` as JWT claims via a custom access token hook | M | §3.6, S12 |
| 1.5 | RLS on every table as a **backstop** (deny-by-default), not the primary authz | M | defense in depth |
| 1.6 | **Retire the EC2 box, the ELB, the Dockerfile and `conditional-copy.sh`.** Delete the Terraform that no longer applies | M | **I1, I2, I3, S5, S11** |
| 1.7 | Remaining app-layer auth: gate every Server Action, derive agent identity from the session, harden webhook signatures (SHA-256 + `timingSafeEqual` + fail closed), rate limits | L | **S1, S3, S4, S7, S8, S9, S10** |

> ⚠️ Everything from `ANALYSIS.md` §6.1 still applies until 1.7 lands. **Do not expose this to the internet before Phase 1 is complete.**

### Phase 2 — Schema, multi-org, channel adapters ▲ · ~2 weeks
**Multi-org moves here from old Phase 7.6** (decision #1 — it's a product, so tenancy is foundational).

- 2.1 Normalized schema: `Organization`, `Membership`, `ChannelAccount`, `Contact`, `ContactIdentity`, `Conversation`, `Message`, `Attachment`, `InboundEvent` — **with the indexes from finding D6**
- 2.2 **✚ Org + membership model, `slug` routing (`/[org]/inbox`), encrypted per-org credentials**
- 2.3 `ChannelAdapter` interface + registry + capabilities descriptor
- 2.4 **Extract `packages/core`** — the only Prisma consumer; ESLint-enforced (§3.4)
- 2.5 Port WhatsApp onto the adapter. **All 77 Cypress tests must still pass** — that suite is what makes this refactor safe
- 2.6 Capability-driven composer UI
- ~~2.2 data migration~~ **✖ dropped** — no data to preserve. Drop and recreate.

### Phase 3 — Ingest reliability · ~1 week
Unchanged, but simpler: `pgmq` in the Supabase Postgres rather than a separate queue. Fast webhook ACK → `InboundEvent` → worker; idempotency keys; retries + DLQ; outbound queue + status reconciliation. Resolves **B4, B5, B6** and structural problem #2.

### Phase 4 — Priority channels ▲ · ~2.5 weeks *(was ~3 — fuzzy matching and the Meta spike cut)*

Re-scoped 2026-08-19. Panama needs three channels and Miami needs two, so this phase grew — and identity work moved **into** it rather than after it.

| ID | Task | Org | Notes |
|---|---|---|---|
| 4.1 | **Instagram** | Panama | Merge the `ig` branch — 1,992 lines already written — onto the adapter |
| 4.2 | **Facebook Messenger** | Panama | Cheap right after 4.1: IG and Messenger share the Messenger Platform API. Do it immediately, not later |
| 4.3 | ~~Meta ID matching spike~~ | Panama | ✖ **Cut 2026-08-19.** It existed to reduce manual merging; with duplicates accepted by default and merge being a deliberate action, it's no longer worth the day. Revisit only if Panama's duplicate volume becomes an actual complaint |
| 4.4 | **Twilio SMS** | Miami | `X-Twilio-Signature`, status callbacks, MMS via public URLs. **Verify A2P 10DLC is registered first** — it gates the channel and isn't a code problem |
| 4.5a | **`LinkToken` handoff mechanism** ✚ | both | §4.5. Generic over source/target channel — build once, reused by 4.5b, Phase 5, and Miami's SMS. Opaque single-use token, **never a username** |
| 4.5b | **Manual merge UI** ▲▲ | Panama | §4.6. Preview → pick survivor → merge, reversible and audited. Ships with 4.2, when duplicates start accumulating |
| ~~4.5c~~ | ~~Fuzzy match suggestions~~ | — | ✖ **Cut.** Replaced by 4.5b at your direction — same job, better interface, no false positives |
| 4.6 | **Miami same-number guards** ✚ | Miami | Channel selector defaults to last-inbound channel; test for SMS/WhatsApp echo on one number (§5.1d) |
| 4.7 | Whatever "and more" turns out to be | Panama | §9 — unscoped until you tell me |

▼ *Email stays in Phase 6.*

### Phase 5 — Web chat widget · ~2–3 weeks
`ANALYSIS.md` §8 Phase 5, plus one addition that raises the whole phase's value:

- **✚ 5.7 "Continue on WhatsApp" handoff** — reuses the `LinkToken` from 4.5a, so the mechanism is already built and tested by the time you get here. Includes carrying **ecommerce context** (cart, viewed products, order in progress, referrer) as structured metadata on the widget conversation, and closing the web thread as `continued_on_whatsapp`.

You called this out as the high-volume path, and I agree — it's the strongest single argument for building the widget. An agent picking up a WhatsApp thread that already shows what the visitor had in their cart is a materially better handoff than a generic chat widget provides. It's also your main **lead-capture** event, since the handoff is usually the first time an anonymous visitor becomes a phone number (§6.5).

Still your only unauthenticated write surface — it needs the most hardening in the system.

### Phase 6 — Inbox depth + email · ~2–3 weeks
`ANALYSIS.md` Phase 6 (assignment & conversation state, WhatsApp 24h window, template management, contact CRUD, **pagination fixes B1/B2**, real search, **sidebar refetch fix B8**, notifications, **composer error handling B3**, UI overhaul, i18n) **plus ▼ Email as a channel**.

### Phase 7 — Standalone CRM core ✚ *new* · ~2 weeks
§6.2: Company, **Lead as its own entity** (not a status on Contact), Pipeline/Stage, Quotation + line items, Notes, Tags, Activity log, Tasks. Quotation → PDF → send over any channel (§6.5). Inbound message → Lead.

### Phase 8 — CRM integrations ✚ *new* · ~2 weeks
`CrmAdapter` port + generic `ExternalRef` table. **Odoo first** (§6.4), then HubSpot, then Monday if a customer ever asks. All sync on its own queue so a CRM outage never touches messaging.

### Phase 9 — Intelligence · optional
`ANALYSIS.md` Phase 8, unchanged: modernize the LLM layer off the legacy `/v1/completions` endpoint onto structured output/tool-calling (**B7, B12**), reply suggestions, summarization/routing, Whisper transcription from the `audio_text` branch, analytics.

### Revised estimate

| | Old | New | Why |
|---|---|---|---|
| To "safe + modern + multi-org WhatsApp" | ~5 wks | **~5 wks** | Supabase absorbs work, multi-org adds it back |
| To "WhatsApp + IG + SMS, unified identity" | ~9 wks | **~8 wks** | Email deferred; Supabase removes infra work |
| To "+ web widget" | ~12 wks | **~11 wks** | |
| To "+ standalone CRM + Odoo" | n/a | **~16 wks** | New scope |

Phases 0–2 (~4 weeks) remain the gate on everything else.

---

## 9. Open questions

### Answered 2026-08-19

| Q | Answer | Where it landed |
|---|---|---|
| Odoo hosting & version | **Odoo.sh**, upgrading 18 → 19 | §6.4 — staging branches and custom modules are both available; finish the upgrade before integration work starts |
| Twilio and WhatsApp on the same number? | **No.** Two orgs, two countries, two numbers — Mansa Panama (WhatsApp, +507) and Mansa Miami (Twilio SMS, +1) | §4.1 and §5.1 — reverses the identity plan; assisted linking becomes primary |
| Queue: can it be SQS? | **Settled: pgmq on Supabase.** SQS considered and rejected | §7.3 |
| Hosting | **Vercel + Supabase, nothing else** | §7.4 — job handlers run as Vercel routes dispatched by `pg_net`; no container, no third provider |
| Panama channels | WhatsApp + **Instagram + Messenger** + more | §5.1 — multi-channel from day one; identity work moves into Phase 4 |
| Miami channels | Twilio SMS + WhatsApp **on the same number** | §5.1 — the Tier-1 auto-link case after all |
| Cross-channel identity | **Duplicates are fine by default.** Link only on an issued token or a manual merge. No fuzzy matching | §4.2, §4.5, §4.6 — cuts Tier 4 and the Meta spike from Phase 4 |
| Webchat → WhatsApp continuation | **Yes, high volume** — merges the ecommerce `visitorId` into the WhatsApp contact | §4.5 — same `LinkToken` as the IG case; becomes Phase 5's headline feature |

### Still open

1. **Cross-org contact visibility.** Mansa Panama and Mansa Miami look like one brand in two locations. Do you eventually want *"this customer also buys from the other store"*? I've defaulted to **strict isolation** and suggested a free hedge (a nullable `Organization.groupId`, §5.1(b)). Confirm that's the right default — reversing it later is a migration.
2. **Quotation source of truth.** I've assumed local-first with outbound sync (§6.5), which keeps the feature working standalone and CRM-agnostic. If Odoo must own pricing and the product catalog, the flow inverts and the standalone build has to degrade gracefully. **This is the biggest open design question for Phase 7.**
3. **A2P 10DLC status for the Miami number** (§5.1(c)). Has registration started? It has real lead time and it's the most likely thing to block Phase 4 for reasons unrelated to code.
4. **What is "and more" for Mansa Panama?** You listed WhatsApp, Instagram, Facebook "and more." Task 4.7 is a placeholder until I know. If it's the web widget, Phase 5 may want to move ahead of some of Phase 4; if it's email, that's a much bigger lift than the others and should be scheduled deliberately.
5. **Who can merge, and who can unmerge?** (§4.6) My default: any agent can merge, only admins can unmerge. Say if you'd rather restrict both.
6. **What ecommerce context should cross the WhatsApp handoff?** (§4.5) Cart and viewed products are obvious. Order in progress, customer tier, abandoned-cart value, UTM source? This decides the widget's metadata contract, and it's easier to define now than to retrofit. Also — which platform is the store on? That determines how the widget reads cart state.
7. **Expected volume** — messages/day and concurrent agents. Under a few thousand a day everything in §7.4 is comfortable. At 10× I'd revisit the dispatch design and the Realtime plan.
8. **Web widget priority.** Now that the WhatsApp handoff is its headline feature and `LinkToken` gets built in Phase 4 anyway, there's a decent case for moving Phase 5 **ahead of** the remaining Phase 4 channels — the widget plus WhatsApp may deliver more value than Messenger does.

*Resolved: self-hosting (Vercel + Supabase only, §1/§7.4) · Meta ID matching (cut, §8 task 4.3) · fuzzy matching (cut, §4.1).*
