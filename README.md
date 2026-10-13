# CXI+AI Ecosystem Infrastructure Map

An interactive map of Pfizer's CXI+AI / OSS&AI ecosystem: shared infrastructure,
ownership, component roles, and recorded integrations. Built with Next.js 16
(App Router), React 19, and OpenNext for Cloudflare Workers.

## Getting started

Use Node.js 22 or later and npm. Next.js requires Node.js 20.9 or later, but the
Cloudflare preview and deployment tooling requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If that port is occupied,
use the local URL printed by the development server.

For a local production build:

```sh
npm run build
npm start
```

There are currently no dedicated test or lint scripts. Use the production build
and browser checks when validating changes.

## Exploring the map

- **Map**: lifecycle stages and cross-cutting layers, with progressively more
  detail as you zoom.
- **Atlas**: components clustered by layer, connected by integration edges.
- **Estate board**: the same register grouped by layer and ownership.

Scroll to zoom, drag to pan, and click a layer to dive in. Select a component
to see its role, operator, confidence, notes, sources, and integrations. Ownership
filters isolate one or more ownership states; **Whole estate** resets the viewport.
In Atlas, **Isolate orphans** highlights components with no recorded connections.

**Gaps identified** is derived from the current register. Missing integration or
operator information is incomplete mapping, not proof of an isolated or ownerless
service. Connection counts include incoming and outgoing links and do not measure
criticality. The hosting estate is also changing as migration to Spark Pro proceeds.

## Updating the register

[data/register.json](./data/register.json) is the source of truth for all three
views. It is imported at build time; rebuild deployed versions after changing it.
There is no in-app editor or live data feed.

The register contains two arrays:

| Array | Fields |
| --- | --- |
| `components` | `id` (stable identifier), `n` (name), `l` (layer), `o` (ownership), `op` (operator), `cf` (confidence), `d` (description), `src` (source); optional `note` and `st` (status) |
| `edges` | `a` (source component ID), `b` (target component ID), `t` (relationship label), `cf` (confidence), `why` (supporting evidence or inference) |

- Keep component IDs unique and ensure both endpoints of every edge exist.
- Use the existing layer IDs: `manage`, `assets`, `author`, `deliver`, `engage`,
  `measure`, `review`, `design`, `identity`, `provision`, `infra`, and `mcp`.
- Ownership states are `own`, `experience`, `shared`, `contested`, and `consume`.
- Component confidence is `confirmed`, `inferred`, or `unknown`. Edges use
  `confirmed` or `inferred`; inferred integrations are drawn dashed.
- Always preserve sources and distinguish confirmed facts from assumptions.
  Record an operator not yet researched as **Not yet recorded in this register**.
- Do not turn a conceptual lifecycle flow into a confirmed integration.
  Document confirmed non-integrations in component notes rather than drawing
  them as integration edges.

Current role boundaries include PfizerWeb as an assembler/authoring layer, not a
content store; GRV for healthcare professionals (HCPs); and GPA for patients.
GCMA, AEM Assets, and Brightcove do not currently integrate with Franklin or
Web Builder. See [CONTEXT.md](./CONTEXT.md) for discussion clarifications and
project history.

## Project structure

| Path | Purpose |
| --- | --- |
| [app/page.js](./app/page.js) | Main page |
| [app/EcosystemMap.jsx](./app/EcosystemMap.jsx) | Interactive SVG map, Atlas, estate board, detail panels, and derived gap cards |
| [app/globals.css](./app/globals.css) | Shared styles |
| [app/layout.js](./app/layout.js) | Application shell and metadata |
| [data/register.json](./data/register.json) | Component and integration register |
| [next.config.mjs](./next.config.mjs) | Next.js configuration |
| [open-next.config.ts](./open-next.config.ts) | OpenNext Cloudflare configuration |
| [wrangler.jsonc](./wrangler.jsonc) | Worker name, compatibility settings, and static asset binding |

## Cloudflare preview and deployment

```sh
npm run preview
```

This builds the OpenNext worker and starts a local Cloudflare preview.

```sh
npm run deploy
```

This builds and deploys the worker using Wrangler. Deployment requires appropriate
Cloudflare authentication and account permissions. Check
[wrangler.jsonc](./wrangler.jsonc) against the intended environment before deploying.
Generated output is written to `.next/` and `.open-next/` and is not committed.

The intended internal hosting platform is Spark Pro. Its onboarding conventions
and edge-level SSO assumptions still need confirmation with the platform team.
The application does **not** implement authentication itself: confirm access
controls before publishing internal ecosystem information. See
[CONTEXT.md](./CONTEXT.md) for the outstanding platform checks.
