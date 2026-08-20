# DAWN service bridge

This optional integration exposes a deliberately small, read-only machine surface for a governed DAWN deployment.

It does **not** make the CRM a DAWN control plane, does not grant the CRM agent authority over DAWN, and does not expose mailbox message bodies.

## Enable

Set a unique secret of at least 32 random bytes on the CRM API process:

```sh
DAWN_SERVICE_TOKEN="$(openssl rand -base64 32)"
```

Keep the token in the deployment secret store. Never commit it, copy it into prompts, or reuse it across client CRM instances.

When `DAWN_SERVICE_TOKEN` is unset, the bridge returns `503` and is effectively disabled.

## Authentication

All bridge routes require:

```http
Authorization: Bearer <DAWN_SERVICE_TOKEN>
```

Comparison is constant-time. Failed requests do not log the supplied token.

## Read-only routes

- `GET /internal/dawn/health`
- `GET /internal/dawn/search?q=<term>`
- `GET /internal/dawn/companies/:id`
- `GET /internal/dawn/contacts/:id`
- `GET /internal/dawn/deals/:id`
- `GET /internal/dawn/pipeline`

The first integration wave intentionally has **no mutation routes**.

## Tenant model

The upstream CRM is deliberately single-tenant. DAWN should preserve that property and deploy one isolated CRM instance/database per client or internal business rather than adding an `organizationId` tenancy layer to this codebase.

Each instance must receive its own:

- database;
- `BETTER_AUTH_SECRET`;
- `DAWN_SERVICE_TOKEN`;
- mailbox/OAuth credentials where enabled;
- storage/agent secrets where enabled.

DAWN's tenant registry maps a governed tenant to the corresponding CRM base URL and secret reference. Raw secret values never enter mission prompts or evidence records.

## Authority boundary

DAWN remains the authority for missions, approvals, external actions and cross-system reasoning.

The CRM remains the operational system of record for companies, contacts, deals and activities.

The CRM's native Eve agent may continue to perform its own bounded, evidence-backed CRM enrichment when separately enabled, but it is not a DAWN orchestrator and is not called by the bridge.

## Planned write wave

A later bridge version may add reversible `crm.internal_write` operations after the read canary is proven. Writes must be individually scoped, idempotent and governed by DAWN's mission/approval envelope. External outreach remains outside the CRM bridge.
