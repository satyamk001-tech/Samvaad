# Samvaad (संवाद)
## High-Concurrency Distributed Real-Time Communication Platform

[![Java 21](https://img.shields.io/badge/Java-21_LTS-ED8B00?style=flat-square&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4.2-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![WebSocket](https://img.shields.io/badge/Protocol-STOMP_Over_WebSocket-009688?style=flat-square)](https://stomp.github.io/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Cache_%26_Presence-Redis_7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Apache Kafka](https://img.shields.io/badge/Event_Bus-Apache_Kafka_3.8-231F20?style=flat-square&logo=apachekafka&logoColor=white)](https://kafka.apache.org/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

Samvaad is an enterprise-grade real-time messaging and media communication backend designed for horizontal scalability, sub-50ms message propagation, and resilient fault isolation.

---

### Architectural Design

```mermaid
flowchart TD
    CLIENT["React 18 + TypeScript Client"] -->|WSS / STOMP| LB["Reverse Proxy / Nginx"]
    LB -->|WebSocket Handshake| WS_GATEWAY["Spring Boot WebSocket Gateway\n(STOMP Session Broker)"]
    
    subgraph APPLICATION_CORE["Spring Boot 3.4 Microservice"]
        WS_GATEWAY --> AUTH["JWT Security & Auth Gate"]
        AUTH --> CHAT_SVC["Messaging Service"]
        CHAT_SVC --> OUTBOX["Transactional Outbox Repository"]
        CHAT_SVC --> PRESENCE["Presence & Heartbeat Engine"]
    end
    
    subgraph DATA_TIER["Persistence & Messaging Tier"]
        PRESENCE <-->|Ephemeral TTLs / Pub-Sub| REDIS[("Redis 7\n(User Sessions & Heartbeats)")]
        OUTBOX <-->|ACID Transactions| POSTGRES[("PostgreSQL 16\n(Users, Messages, Audit Logs)")]
        OUTBOX -->|Async Polling / Dequeue| KAFKA["Apache Kafka Broker\n(samvaad.notifications.events)"]
    end
    
    subgraph MEDIA_TIER["P2P Media & Signaling"]
        CLIENT <-->|SDP Offer / Answer| WS_GATEWAY
        CLIENT <-->|P2P Audio & Video| PEER["Remote Client Peer"]
        CLIENT -.->|NAT Traversal Fallback| COTURN["Coturn STUN / TURN Relay"]
    end
```

---

### Core Engineering Capabilities

1. **Stateful WebSocket Management with Ephemeral Redis Heartbeats**:
   - Clients maintain a persistent STOMP over WebSocket connection (`/ws-samvaad`).
   - Active user presence is registered in Redis with a 60-second Time-to-Live (TTL). Heartbeat frames renew leases; disconnect handlers evict presence immediately to notify mutual contacts.
2. **Distributed Messaging via Transactional Outbox Pattern**:
   - Solves distributed dual-write inconsistency between relational state and Kafka message brokers.
   - Message payloads and outbound notification events are committed in a single atomic database transaction. A decoupled worker processes pending records with exponential backoff retries.
3. **WebRTC Signaling & NAT Traversal**:
   - Peer-to-peer audio/video streaming negotiated via WebSocket SDP offer/answer exchanges.
   - Integrated STUN/TURN fallback relays encrypted media streams across restrictive symmetric NATs and firewalls.
4. **Stateless Security Architecture**:
   - Dual-token authentication (short-lived HMAC-SHA256 JWT access token + refresh token rotation in HttpOnly cookies).
   - Strict input validation with magic-byte file inspection rejecting disguised executables.

---

### Local Installation & Quickstart

#### Prerequisites
- **Java 21 LTS** (`java -version`)
- **Maven 3.9+** (`mvn -v`)
- **Docker & Docker Compose** (`docker compose version`)
- **Node.js 20+** (`node -v`)

#### 1. Clone Repository & Start Containers
```bash
git clone https://github.com/satyamk001-tech/Samvaad.git
cd Samvaad

# Start PostgreSQL (5432), Redis (6379), and Kafka (9092)
docker compose up -d
```

#### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and supply a secure JWT_SECRET
```

#### 3. Compile & Run Backend Tests
```bash
cd backend
mvn clean test
mvn spring-boot:run
```
Backend starts on `http://localhost:8080`.  
Health endpoint: `http://localhost:8080/actuator/health`

#### 4. Run Frontend Development Server
```bash
cd ../frontend
npm install
npm run dev
```
Frontend accessible at `http://localhost:5173`.
