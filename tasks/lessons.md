# Lessons

## 2026-05-12

- When Orca documentation work mentions the website, use the live website positioning and `christopherkarani/Orca` framework repo as source of truth. Do not infer product direction from the stale local x402 checkout.
- Upstream Orca still uses `.aegis/` policy and session paths during the rename. Do not publish `.orca/` paths until the framework repo actually supports them.

## 2026-05-18

- When the user rejects custom email auth for the Orca website, use Clerk/social login for human accounts and keep Orca-owned API keys limited to backend automation scopes.
