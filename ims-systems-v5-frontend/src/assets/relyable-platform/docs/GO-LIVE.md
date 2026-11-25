# Relyable: go-live checklist

## A. Preview now (static, no backend)
`public/standalone.html` is the whole platform compiled into one page; data stays in each visitor's browser. It can be published anywhere static (the claude.ai artifact, S3 + CloudFront like the other IMS sites, Netlify). Good for demos and insurer conversations; not for real claims.

## B. Live service (Node)
1. Pick a host: Fly.io (London region, `fly launch` with the included fly.toml), Render (render.yaml), or ECS/EC2 with the Dockerfile. Any of them: `docker build -t relyable . && docker run -p 8790:8790 -v relyable-data:/data relyable`.
2. Set secrets: `RLY_SIGNING_SECRET` (64 random bytes), `CH_API_KEY` (free, from developer.company-information.service.gov.uk), later SMTP/SMS/letter provider keys.
3. Point `relyable.co.uk` (or the domain you register) at the host; enable HTTPS (the hosts above do it); add `api.` as an alias of the same service.
4. Replace the demo keys: delete `rly_rd_demo` / `rly_ad_demo` from the store and issue real ones with `POST /v1/admin/keys`; remove the demo shortcuts in `public/index.html` (search for `ADMIN_KEY`).
5. Before real claims: the production list in SPECIFICATION.md §5 (Postgres, ES256 + JWKS, IDV/passkey/SMS/letter providers, Companies House streams, HSE/Gazette/IAF ingest, webhook deliverer, scheduler, ops UI). Order it so that identity providers come first; nothing else matters until a claim is trustworthy.
