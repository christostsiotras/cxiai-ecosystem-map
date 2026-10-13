# CXI+AI / OSS Ecosystem Infrastructure Map — Project Context

Handoff document for continuing this project in Cursor. Read this before touching the code.

## What this is

An interactive infrastructure map of the CXI+AI / OSS ecosystem at Pfizer, assigned by Luca Macis. It needs to:

- Show all infrastructure components across the estate
- Distinguish what CXI+AI owns and operates from what it consumes
- Flag genuinely contested ownership cases
- Support semantic zoom (Google Earth metaphor: layers/continents, then components/cities, then integrations/roads)
- Surface gaps: overlapping tools, missing owned capabilities, unrepresented dependencies

## Current state (v0.1)

Built as a single self-contained HTML file, `ecosystem-infrastructure-map.html`, with a component register embedded as two JS arrays in a `<script>` block: `C` (components) and `E` (edges/integrations). No build step, no framework, no repo. Three views on the same register:

1. **Lifecycle map** — the primary view. Lifecycle spine (Author & Manage → Build & Assemble → Host & Deploy → Deliver & Engage → Measure) plus cross-cutting bands (Identity & Access, Provisioning & Governance, Design Systems, Infrastructure, Agentic/MCP surface). Ownership shown as a colour overlay, with semantic zoom into components and integrations.
2. **Ownership board** — a toggled view of the same data, organised for a straight own-vs-consume read.
3. **Atlas / Google Earth graph** — continents as layer groups, cities as components, roads as integrations, true zoom levels. Best for spotting orphaned dependencies; worse for reading ownership at a glance.

Register snapshot as of the last working session: 52 components, 49 confirmed, 41 integrations (12 still inferred).

### Data model (per component)

`id, name, aliases, layer, model applicability (coupled / headless / both), ownership state, operating org, internal vs vendor, one-line description, integrations as typed edges, lifecycle status, source link, confidence (confirmed / inferred / unknown)`

The **source and confidence fields are not optional**. Given how contested and thinly-documented parts of this estate are, every node needs to show where its data came from. That's what makes it survive scrutiny when it's opened by people outside this immediate conversation.

## Why v1 skipped a repo

Deliberate, not an oversight: v1 needed to match Luca's own artifact format (a single self-contained HTML file, shared through Teams/SharePoint) so it opens the same way his does, with no infrastructure to stand up. A repo and build pipeline were explicitly deferred to v2 — which is what you're doing now. The trigger for v2 was named in advance: live data pulls (Confluence, Jira, DMP), auth, or multiple people editing against version control.

## Ownership model: five states, not binary

`own/operate`, `consume — Pfizer/other org`, `consume — vendor`, `contested`, `absent`. Binary own-vs-consume was rejected early because it collapses "Pfizer builds and runs this, just not our team" into the same bucket as "third-party vendor," which loses information Luca and Christos both cared about.

## Scope rule

A component belongs on the map only if it's shared across multiple products or owned/operated across the estate. A single product's architecture (e.g. a Savings Hub dependency) is not estate-wide infrastructure just because it showed up in a document. This rule exists because early drafts over-indexed on one product's dependency list.

## Open issues / known gaps — carry these forward

- **LLMHub operator follow-up** — the model access layer for AI components in the estate. The operating team is not yet recorded in this register; this is incomplete research, not evidence of missing ownership. A repo name (`terraform-electron-llmhub-infra`) hints at the platform side but does not identify the operator.
- **Franklin / Web Builder contested ownership** — can't be resolved independently of the coupled-vs-headless platform model question. Don't force a resolution without that being settled first.
- **Review & approval layer gap** — Veeva PromoMats and GCMA are absent from Luca's email grouping but present in his own architecture document. They belong on the map.
- **Layer vocabulary mismatch** — Luca's email and his architecture document use different layer names for the same things. The map should reconcile this explicitly rather than silently pick one.
- **Source verification caution** — Luca's email attributes an OSS&AI ownership position to his "Web Publishing Options notes" (the `cms-architecture-infographic` files). Those documents do not actually discuss organisational ownership at all. This has not yet been raised with Luca as of the last session — worth confirming whether that conversation happened before this map goes further.

## Recent ownership calls (confirmed by Christos, 25 Sep)

- OSS Hub rebranded to **Beacon**, owned/operated by CXI+AI/OSS&AI
- **Kirby** — built and managed in-house (was previously marked shared/inferred)
- GRV and GPA sit with Alejandro Otero's team
- Infrastructure band (incl. Edison, Bench Stack) managed by Mike Lamb's team in Digital
- VaxAssist is "Own the Experience"
- AMP → LLMHub edge confirmed (not inferred): LLMHub is the model access layer for every AI component that needs an LLM

## Discussion clarifications applied to the register

- **GCMA, AEM Assets (Adobe DAM), Brightcove** — Dilawar confirmed that none currently integrates with Franklin or Web Builder. Removed the inferred GCMA-to-Franklin, GCMA-to-Web-Builder and Adobe-DAM-to-Franklin edges. All six absent pairings are documented in the affected component details; do not infer live integrations from the architecture's conceptual lifecycle flow. Other recorded relationships remain unchanged.
- **Pfizer Web / PfizerWeb** — an assembler and authoring layer, deliberately not a content store. Kept in **Author & Assemble** and made this boundary explicit in its description and notes. The specific design-export target remains inferred.
- **Gap interpretation** — removed Evidence gap cards. An operator not yet recorded is a research follow-up, not an ownerless service. Components without recorded integrations reflect the current mapping snapshot; conversations with relevant people are still needed to fill it in.
- **Hosting transition** — many sites and applications are switching to Spark Pro; migration is work in progress. Hosting multiplicity and Edison Lite's recorded connection count are not, by themselves, evidence of unmanaged duplication or critical concentration.
- **Authentication audiences** — GRV is for HCPs; GPA is for patients. Removed the blanket authentication-overlap finding. GCP's specific scope remains to be captured, without assuming it duplicates either service.

## For v2 in Cursor — suggested first moves

1. ~~Pull `ecosystem-infrastructure-map.html` out of the source chat and into the new project folder as-is, unmodified, as your baseline.~~ Done — was the v0.1 baseline commit.
2. ~~Split the embedded `C` and `E` arrays out into `data/register.json`~~ Done — `data/register.json` (`{components, edges}`) is the register now.
3. If Kozhin, Filippos, or Reid start editing the register directly, that's the point where git history and a schema (even a lightweight JSON schema) start paying for themselves.

## v2 architecture (superseded the single-file plan above)

The single-file HTML output was retired once the map moved onto **Spark Pro** (Pfizer's internal app platform — templated stacks, git-push builds, per-branch previews, SSO, deploy to Cloudflare Workers) instead of being shared as a file over Teams/SharePoint. This was one of the triggers named back in "Why v1 skipped a repo": auth was the one that fired.

- **Next.js (App Router)** + **`@opennextjs/cloudflare`** — Spark Pro's own Cloudflare Workers stacks deploy via OpenNext (see the `sparkpro` component's edges in the register), so the app targets what the platform already runs rather than a generic static export.
- `app/EcosystemMap.jsx` is a "lift and shift" of the original vanilla-JS render engine (SVG map, Atlas, Estate board) into a single client component — ported close to verbatim, not rewritten against React state, since the pan/zoom/level-of-detail logic has no React-shaped equivalent worth the rewrite risk.
- `data/register.json` is imported directly at build time (no more string-injection build step).
- SSO is assumed to be handled at the Spark Pro platform/edge layer, not in application code — unconfirmed against Spark Pro's actual onboarding docs (see below).

**Not yet confirmed against Spark Pro itself**: the app was built against `https://app.pro.spark.pfizer/#/`'s onboarding conventions as inferred from this project's own register notes (SSO-gated, so it couldn't be inspected directly during this work). Before this ships, someone with Spark Pro access needs to confirm the worker name convention, whether the self-reference service binding / R2 incremental cache in the standard OpenNext scaffold are expected even for a fully static app, and whether SSO really is edge-level with no app-side code required.
