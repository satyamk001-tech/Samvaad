# Samvaad — Chaos Engineering & Real-Time Reliability

This document outlines the failure recovery, state reconciliation, and architectural resilience mechanisms of the **Samvaad** communication platform.

---

## 1. Reliability & Fault Scenarios

| Scenario | Detection | System Behavior & Mitigation |
|---|---|---|
| **Abrupt Client Disconnect** | TCP FIN / WebSocket heartbeat timeout (10s) | `PresenceEventListener` captures disconnect event; updates Redis presence bitmap and broadcasts offline status to user's contacts. |
| **Client Reconnection** | STOMP reconnect handshake with fresh token | Authenticates user; catches up on unread messages using monotonic sequence / timestamp cursors. |
| **Kafka Broker Outage** | Spring Kafka producer exception / circuit breaker | **Transactional Outbox Pattern**: Messages are atomically saved to PostgreSQL `outbox_events` table within the same ACID transaction as the message entity. `OutboxPublisher` polls and retries publication with exponential backoff once Kafka recovers. |
| **Redis Cache / Pub/Sub Outage** | RedisConnectionFailureException | Graceful degradation to local in-memory event bus and database queries for presence; logs alert to Prometheus. |
| **Duplicate Message Dispatch** | Client retry / network replay | Client provides client-generated UUID `messageId`. Message entity enforces unique constraint, discarding duplicates idempotently. |
| **Expired JWT Token** | `ExpiredJwtException` in interceptor | Interceptor immediately returns HTTP 401 / STOMP error frame with code `TOKEN_EXPIRED`, preventing unauthorized message relay. |
| **MIME Spoofing / Malicious Upload** | `AttachmentValidationService` binary header inspection | Validates real magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`, PDF `%PDF`). Rejects disguised executables with `SecurityException`. |
| **Brute-Force Credential Stuffing** | `LoginAttemptService` memory sliding window | Exceeding 5 failed attempts locks identifier for 15 minutes. |
| **User Discovery Enumeration** | `SearchRateLimiter` per-user atomic counter | Limits user searches to 30 requests / minute. |

---

## 2. Transactional Outbox Pattern Guarantee

```
Client -> HTTP / STOMP -> MessageService
                             |
         +-------------------+-------------------+
         | (ACID Database Transaction)           |
         | 1. INSERT INTO messages (...)         |
         | 2. INSERT INTO outbox_events (...)    |
         +-------------------+-------------------+
                             |
                     Commit Success
                             |
                             v
                OutboxPublisher Scheduler
                             |
                             v
             Publish to Apache Kafka Broker
                             |
             +---------------+---------------+
             | Success                       | Failure
             v                               v
    DELETE FROM outbox_events         Keep in outbox
                                      Retry with backoff
```
This guarantees **at-least-once message delivery** without distributed 2PC two-phase commit overhead.
