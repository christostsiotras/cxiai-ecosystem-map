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

- **LLMHub ownership gap** — the model access layer for everything AI-driven in the estate. No owning team established. A repo name (`terraform-electron-llmhub-infra`) hints at the platform side but is not an owner and shouldn't be treated as one. Flagged as the most consequential gap on the map — a single point of dependency nobody has named as accountable.
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

## For v2 in Cursor — suggested first moves

1. Pull `ecosystem-infrastructure-map.html` out of the source chat and into the new project folder as-is, unmodified, as your baseline.
2. Split the embedded `C` and `E` arrays out into `data/register.json` — that's the actual asset here, not the HTML shell.
3. Keep a build step that can still emit a single self-contained HTML file, since that's the format Luca and any non-technical reviewer expect. Don't let v2 tooling make the shareable output harder to open.
4. If Kozhin, Filippos, or Reid start editing the register directly, that's the point where git history and a schema (even a lightweight JSON schema) start paying for themselves.
