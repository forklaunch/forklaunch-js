---
---

Replace Prometheus + Thanos with Grafana Mimir in the local monitoring stack, so
local monitoring runs the same engines as production.

Deliberately no release. Everything that changed is scaffolding and local
infrastructure config — the compose stack, the `monitoring/*.yaml` files and the
CLI's compose generator. The publishable packages are untouched; `monitoring`'s
TypeScript (`index.ts`, `metricsDefinitions.ts`) is pure OTLP and needed no
change, because nothing in it was ever coupled to Prometheus.
