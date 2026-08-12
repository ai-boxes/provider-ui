# provider-ui

Management UI for the self-hosted provider gateway. It talks to `provider-core`
through the same-origin management API. The production image only serves the
compiled static frontend; API routing belongs to the external gateway.

Stack: React 19 + TypeScript + Vite 8 + Tailwind CSS 4, with feature modules
under `src/features/`.

## Development

```bash
npm install
npm run dev
```

The dev server proxies `/api/*` to the target from `API_PROXY_TARGET`
(set in `.env.local` or inline):

```bash
API_PROXY_TARGET=http://127.0.0.1:8317 npm run dev
```

`/v1/*` (the Codex / Claude-compatible surface) is not proxied in dev; point
clients directly at core, e.g. `http://127.0.0.1:8317/v1`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) and production build |
| `npm run lint` | Oxlint |
| `npm test` | Unit tests in `tests/*.test.ts` |
| `npm run preview` | Preview the production build |

## Layout

- `src/app/` — router, auth boundaries, app providers
- `src/features/` — per-domain UI: auth, providers, api-keys, usage, users
- `src/routes/` — page-level route components
- `src/lib/` — shared API client, decoders, formatting
- `src/components/ui/` — shadcn-style UI primitives

## Production

`npm run build` generates the production frontend in `dist/`. Deploy that
directory with a static file server that supports SPA fallback.

API routing belongs to the external gateway or ingress. The frontend expects
the same public origin to route `/api/*` to `provider-core`; `/v1/*` can be
routed there separately for the compatible API surface.
