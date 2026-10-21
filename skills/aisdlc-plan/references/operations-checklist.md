# Operations checklist

The delivery half of `system-design-checklist.md`. Read it when the feature changes how something is
built, shipped, scaled or run: CI, infra, deployment, containers, probes, alerts or on-call. Answer each
number in one clause, in the plan section named by its cluster. `n/a: <reason>` is legal for a surface this
feature does not touch; silence is not, and review files an unanswered item as a blocking finding.

## 11. Delivery -> Rollout

65. **CI/CD**: steps; cache; secrets; rollback trigger. Velocity is measured against change-failure
     rate, not deploy count.
66. **Build caching**: what is cached; the key; the stale-cache bug it hides.
67. **Infrastructure as Code**: plan before apply; the diff is the review. Indentation is the boss
     fight, so validate it in CI.
68. **Terraform**: state backend; locking; the module that can destroy production.
69. **Feature flags**: default off; owner; expiry date.
70. **Blue-green**: cut-over; the shared-datastore trap; the window.
71. **Canary releases**: metric; percentage; abort threshold. Test on 1%.
72. **Rolling deployments**: min healthy; surge; the version that never converges.
73. **Rollbacks**: the command; the time; whether the migration is reversible.

## 12. Platform -> Decisions

61. **Docker**: pinned base; layer order; non-root; image size.
62. **Kubernetes**: requests and limits; pod disruption budget; autoscaler input.
63. **Helm charts**: pinned values; reviewed template diff; upgrade path.
64. **Service discovery**: how a new pod becomes reachable and a dead one stops being.
76. **Dependency hell**: lockfile; transitive pins; upgrade policy.
77. **API versioning**: header, path or none; the deprecation notice.
78. **Semantic versioning**: what counts as breaking here; who decides.
87. **Cold starts**: worst observed; the user-facing cost.
88. **Serverless limits**: memory; duration; payload; concurrency.

## 13. Operations -> Verification strategy, Smoke path

74. **Health checks**: what "healthy" means; the dependency it must exclude.
75. **Liveness and readiness**: restart vs drain; the slow-start failure.
100. **Logging**: structured; one request id per line; no secrets; sampled volume.
101. **Monitoring**: which dashboard shows the failure mode you are shipping.
102. **Distributed tracing**: propagate the request id across hops. Follow the request ID before
     guessing the layer.
103. **Metrics**: counters; gauges; histograms for the paths that matter.
104. **Alerts**: every page must be actionable; an alert that pages at 3:14 AM with no remedy is a
     design review, not a badge.
105. **Observability**: can you answer "what is slow, for whom" from new evidence alone.
106. **SLIs**: the measured proxy for real user pain, not server health.
107. **SLOs**: the target and the window, in numbers.
108. **Error budgets**: what happens when it is spent; who enforces that.
109. **Production incidents**: severity; roles; the communication path.
110. **On-call**: who; rotation; the escalation actually reachable.
111. **Postmortems**: blameless; timely; action items with an owner and a date.
