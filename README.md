# provider-ui

Management UI for the self-hosted provider gateway. It talks to `provider-core`
through the same-origin management API and, in production, serves the
Codex/Claude-compatible surface as an nginx reverse proxy.

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

The `Dockerfile` still builds the standalone UI/nginx image. It expects a core
container reachable as `provider-core:8317` on the same Docker network and
reverse-proxies `/api/*` and `/v1/*` to it.

For the recommended single image containing both the UI and `provider-core`,
see the repository-root `README.md`.
