# System design checklist

Read before `## Architecture` when the feature touches a network boundary, a datastore, concurrency,
background work or an external API. Answer each number in one clause, in the plan section named by its
cluster. `n/a: <reason>` is legal for a surface this feature does not touch; silence is not, and review
files an unanswered item on a touched surface as a blocking finding. Delivery, platform and operations
items are in `operations-checklist.md`.

## 1. Entry -> Interface contracts

1. **Idempotency keys**: what makes a retried write land once; where the key comes from.
2. **Rate limiting**: per whom; the limit; the response when hit.
3. **Reverse proxies**: which `X-Forwarded-*` are trusted; what breaks if not.
4. **Connection pooling**: pool size x instance count vs the database max.
9. **API gateway**: which concerns live there, never in handlers.
17. **Webhooks**: signature check; retries; ordering; delivery idempotency key.
18. **CORS**: exact allowed origins; `*` with credentials is not a policy.
54. **WebSockets**: auth on upgrade; reconnect; heartbeat; fan-out owner.
55. **Server-sent events**: backoff; proxy buffering; auth expiry.
56. **Long polling**: timeout budget; threads held per client.
57. **gRPC**: deadlines; streaming limits; codegen owner; status mapping.
58. **HTTP/2 and HTTP/3**: multiplexing assumptions; proxy support.
59. **TCP vs UDP**: what retransmits; what may be lost; the tail cost.
60. **DNS**: TTL; name changes; split horizon. It is always DNS until proven otherwise.

## 2. Data access -> Data model

5. **N+1 queries**: the loop-per-row call site; the batch or join replacing it.
6. **Caching strategies**: what; where; eviction policy.
7. **Cache invalidation**: the event that makes an entry stale; worst-case staleness.
20. **Database indexing**: the query; the columns; whether it scans or seeks.
21. **Query optimization**: expected rows; the `EXPLAIN` you ran; the sort that could spill.

## 3. Concurrency and consistency -> Decisions

14. **Race conditions**: the two operations that interleave; what the loser sees.
15. **Deadlocks**: lock ordering; timeout; retry.
25. **Optimistic locking**: the version column; the conflict response.
26. **Pessimistic locking**: what is held; how long; the crash path.
27. **Distributed locks**: the lease; expiry; two holders when the clock lies.
32. **CAP theorem**: pick two out loud; name which one degrades in a partition.
33. **Eventual consistency**: what a user may briefly see wrong; what never may be.
34. **Distributed transactions**: whether one exists; if not, what replaces atomicity.
35. **Saga pattern**: each step's compensation; the step that has none.

## 4. Scaling and distribution -> Architecture

8. **Load balancing**: algorithm; health signals; sticky-session needs.
28. **Sharding**: the shard key; the query that hits every shard.
29. **Partitioning**: partition key; hot partition; rebalance path.
30. **Replication**: lag budget; replica staleness; failover eligibility.
31. **Leader election**: quorum; fencing token; split brain.
81. **Autoscaling**: signal; target; scale-down floor.
82. **Horizontal scaling**: is state in the process? If yes, this item is a finding.
83. **Vertical scaling**: the ceiling and its cost.
93. **Network partitions**: what happens when a zone is unreachable.
94. **Clock skew**: which decisions use wall time; what replaces them.
95. **Multi-region**: data residency; latency budget; who owns writes.

## 5. Resilience -> Risks, Rollback thinking

10. **Timeouts**: every hop has one, including the ones you forgot.
11. **Retries**: count; budget; whether the call is safe to repeat.
12. **Exponential backoff**: base; cap; jitter; the herd it prevents.
13. **Circuit breakers**: trip threshold; half-open probes; the degraded answer while open.
39. **Dead letter queues**: what lands there; who is paged; the replay path. A poison message
    redelivered forever is a self-inflicted outage.
40. **Backpressure**: what the producer does when the consumer is full.
96. **Failover**: detection time; promotion time; data lost between them.
97. **Backups**: frequency; retention; the last restore actually tested.
98. **Disaster recovery**: RPO and RTO as numbers, with the rehearsal date.
99. **Chaos engineering**: which failure you have proven you survive, and when.

## 6. Async and scheduling -> Architecture

36. **Message queues**: ordering; at-least-once delivery; duplicates; depth alarms.
37. **Pub/Sub**: consumer lag; guarantees; what a missed event costs.
38. **Event-driven architecture**: schema owner; versioning; the consumer that cannot cope.
41. **Cron jobs**: timezone; missed-run behavior; double-run guard.

## 7. Security -> Threat model

19. **Secrets management**: where they live; who reads them; rotation.
42. **SQL injection**: parameterized everywhere. Bobby Tables is the whole test.
43. **XSS**: output escaping; CSP; every place you set `innerHTML`.
44. **CSRF**: same-site cookies or a synchronizer token; state-changing GETs are the bug.
45. **SSRF**: the URL you fetch is user input; deny link-local and metadata ranges.
46. **OAuth**: the flow; minimum scopes; token storage; redirect allowlist.
47. **JWT rotation**: expiry; revocation; `kid` rollover. A stolen token is only stolen if
    it stays valid.
48. **IAM**: least privilege per principal; who can widen it.
49. **TLS**: minimum version; cert owner; whether internal hops are encrypted.
50. **Encryption at rest**: the key; the KMS; who can read a backup.
51. **Encryption in transit**: every hop, including inside the VPC.
52. **WAF**: what it blocks; how a false positive gets noticed.
53. **DDoS protection**: who absorbs it; what the origin does when they do not.

## 8. Schema change -> Data model

22. **Read replicas**: which reads tolerate lag; which must hit the primary.
23. **Database migrations**: expand then contract, never in one deploy; the lock it takes.
24. **Schema versioning**: how a new column behaves for old code still running.

## 9. Runtime resources -> Risks

16. **Memory leaks**: the measurement, not the feeling; the retention path.
79. **Garbage collection**: allocation rate; pause budget; the size that reaches the heap.
80. **Thread safety**: shared mutable state; the guard; the test that proves it.

## 10. Performance and cost -> Constraints

84. **CDN**: what is cacheable; the TTL; the purge path.
85. **Edge caching**: cache key; personalization; stale-content blast radius.
86. **Cost optimization**: cost per 1k requests; the biggest line item; the bill-shock guardrail
    with an alert on it.
89. **Latency**: the budget per hop and the user-perceived total.
90. **Throughput**: peak requests per second, measured not assumed.
91. **P99 latency**: the tail target and the sample that proves it.
92. **Tail latency**: the fan-out where the slowest dependent sets your p99.
