# VIORA - Architecture Specification & System Design

Viora is a high-performance, real-time messaging and communication platform built with Java 25, Spring Boot, PostgreSQL, Redis, Apache Kafka, React, TypeScript, STOMP WebSockets, and WebRTC.

---

## 1. System Overview & Monolith Design

Viora follows a **Modular Monolith** pattern. All components reside within a unified deployment artifact while maintaining strict module boundaries. This guarantees high developer velocity, ACID transaction capabilities across persistent boundaries, and zero network latency overhead between core services, while maintaining a clear upgrade path to distributed microservices if required in the future.

```mermaid
graph TD
    Client[React + TS Frontend Web Client] -->|HTTPS REST| Gateway[Spring Web MVC API Gateway / Security Filter]
    Client -->|WSS STOMP| WebSocketBroker[Spring WebSocket Broker]
    
    subgraph Modular Monolith Backend
        Gateway --> Security[Spring Security & JWT Filter]
        Security --> AuthMod[auth module]
        Security --> UserMod[user module]
        Security --> ConvMod[conversation module]
        Security --> MsgMod[messaging module]
        Security --> GroupMod[group module]
        Security --> SignalMod[signaling module]
        Security --> AttachMod[attachment module]
        
        WebSocketBroker --> Interceptor[STOMP Channel Interceptor]
        Interceptor --> MsgMod
        Interceptor --> PresenceMod[presence module]
        Interceptor --> SignalMod
        
        MsgMod --> Outbox[Transactional Outbox Service]
    end
    
    Outbox -->|Transactional Commit| Postgres[(PostgreSQL Persistent DB)]
    PresenceMod -->|Ephemeral State| Redis[(Redis Presence & Caching)]
    Outbox -->|Outbox Poller / CDC| Kafka[Apache Kafka Event Bus]
    Kafka --> NotificationConsumer[Async Notification & Analytics Consumers]
    
    SignalMod <-->|WebRTC SDP & ICE Candidates| Client
```

---

## 2. Backend Module Hierarchy

The backend application (`com.viora`) is structured into clean domain modules:

```
com.viora/
├── VioraApplication.java
├── common/             # Shared DTOs, Exception Handlers, Security Context, Outbox Entity
├── auth/               # User Registration, Login, Logout, JWT Token Providers, Auth Filters
├── user/               # User Profiles, Contact Directory, Search, User Settings
├── conversation/       # Direct & Group Conversation Management, Membership Validation
├── messaging/          # Message Creation, History Pagination, Editing/Deletion, Receipts, Reactions
├── group/              # Group Creation, Admin Roles, Member Operations, Permission Guards
├── presence/           # Redis-backed User Online/Offline Tracker, Heartbeat Monitor, Session Tracking
├── signaling/          # WebRTC SDP Offer/Answer Routing, ICE Candidates, Call State Machine
├── attachment/         # Storage Abstraction (Local/S3), MIME Validation, Signed Download Links
└── notification/       # Notification Preferences, Async Kafka Notification Listeners
```

### Module Boundary Rules
1. Modules **must never** directly access entities of another module across domain contexts.
2. Cross-module queries are executed via dedicated module **Service Interfaces** or shared DTOs.
3. Database transactions modifying core entity states must commit local data and emit an **Outbox Event** within the same database transaction.

---

## 3. Database Schema & Data Modeling

PostgreSQL serves as the primary relational database. Flyway manages versioned database migrations (`backend/src/main/resources/db/migration/`).

```mermaid
erDiagram
    users ||--o{ conversation_members : "belongs to"
    conversations ||--o{ conversation_members : "has members"
    conversations ||--o{ messages : "contains"
    users ||--o{ messages : "sends"
    messages ||--o{ message_status : "tracks delivery"
    messages ||--o{ message_reactions : "receives"
    messages ||--o{ attachments : "includes"
    users ||--o{ refresh_tokens : "owns"
    users ||--o{ calls : "initiates / receives"
    
    users {
        uuid id PK
        string username UK
        string email UK
        string password_hash
        string display_name
        string bio
        string avatar_url
        string status_message
        boolean is_online
        timestamp last_seen_at
        timestamp created_at
        timestamp updated_at
    }
    
    conversations {
        uuid id PK
        string type "DIRECT | GROUP"
        string title
        string avatar_url
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    conversation_members {
        uuid id PK
        uuid conversation_id FK
        uuid user_id FK
        string role "ADMIN | MEMBER"
        timestamp joined_at
        timestamp left_at
    }
    
    messages {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        uuid reply_to_message_id FK
        text content
        string type "TEXT | IMAGE | DOCUMENT | SYSTEM | CALL_LOG"
        boolean is_edited
        boolean is_deleted
        timestamp created_at
        timestamp updated_at
    }
    
    message_status {
        uuid id PK
        uuid message_id FK
        uuid user_id FK
        string status "SENT | DELIVERED | READ"
        timestamp updated_at
    }
    
    message_reactions {
        uuid id PK
        uuid message_id FK
        uuid user_id FK
        string emoji
        timestamp created_at
    }
    
    attachments {
        uuid id PK
        uuid message_id FK
        string file_name
        string file_type
        long file_size
        string storage_key
        string content_type
        timestamp created_at
    }
    
    refresh_tokens {
        uuid id PK
        uuid user_id FK
        string token_hash UK
        timestamp expires_at
        boolean is_revoked
        timestamp created_at
    }
    
    calls {
        uuid id PK
        uuid caller_id FK
        uuid receiver_id FK
        uuid conversation_id FK
        string type "AUDIO | VIDEO"
        string status "INITIATING | RINGING | CONNECTED | ENDED | REJECTED | MISSED | FAILED"
        timestamp started_at
        timestamp ended_at
        integer duration_seconds
    }
    
    outbox_events {
        uuid id PK
        string aggregate_type
        string aggregate_id
        string event_type
        jsonb payload
        boolean processed
        timestamp created_at
    }
```

---

## 4. Real-Time STOMP Protocol & Channel Authorization

Real-time events utilize **STOMP over WebSocket** endpoints configured at `/ws`.

### Channel Destination Taxonomy
* `/user/queue/messages` - User-private real-time incoming messages, status receipts, and notifications.
* `/user/queue/signaling` - WebRTC offer/answer/ICE candidate messages.
* `/user/queue/presence` - Direct presence state changes of contacts.
* `/topic/conversations.{conversationId}` - Broadcast events for active conversation members (e.g., typing indicators).

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Alice (Client A)
    participant WS as Spring WebSocket Interceptor
    participant Engine as Messaging Service
    participant DB as PostgreSQL
    actor Bob as Bob (Client B)
    
    Alice->>WS: STOMP CONNECT (Header: Authorization Bearer JWT)
    WS->>WS: Validate JWT & Bind Principal to StompHeaderAccessor
    Alice->>WS: SEND /app/chat.sendMessage {conversationId, content, tempId}
    WS->>Engine: Route to @MessageMapping controller
    Engine->>Engine: Authorize: Validate Alice belongs to conversationId
    Engine->>DB: Persist Message (Status: SENT)
    DB-->>Engine: Saved Message Entity (UUID)
    Engine->>Alice: Push ACK /user/queue/messages {tempId, messageId, status: "SENT"}
    Engine->>Bob: Push Event /user/queue/messages {messageId, content, sender: Alice}
    Bob-->>WS: SEND /app/chat.acknowledgeDelivery {messageId}
    WS->>Engine: Update Status (DELIVERED)
    Engine->>DB: Update message_status (DELIVERED)
    Engine->>Alice: Push Receipt /user/queue/messages {messageId, status: "DELIVERED"}
```

---

## 5. WebRTC Voice & Video Call State Machine

Calls are managed via a dedicated WebRTC signaling state machine backed by STOMP signaling frames.

```mermaid
stateDiagram-v2
    [*] --> IDLE
    IDLE --> INITIATING: User clicks Call
    INITIATING --> RINGING: Server notifies Receiver
    RINGING --> CONNECTING: Receiver Accepts Call (SDP Offer/Answer Exchanged)
    RINGING --> REJECTED: Receiver Rejects Call
    RINGING --> MISSED: Timeout / Caller Cancels
    CONNECTING --> CONNECTED: ICE Candidates Connected
    CONNECTING --> FAILED: WebRTC Connection Failure
    CONNECTED --> ENDED: Participant Hangs Up
    REJECTED --> [*]
    MISSED --> [*]
    FAILED --> [*]
    ENDED --> [*]
```

### Signaling Frame Structure
```json
{
  "type": "OFFER | ANSWER | ICE_CANDIDATE | REJECT | CANCEL | END",
  "callId": "uuid-v4-call-id",
  "senderId": "uuid-v4-user-id",
  "receiverId": "uuid-v4-target-id",
  "mediaType": "AUDIO | VIDEO",
  "sdp": "v=0\r\no=- ...",
  "candidate": { "candidate": "...", "sdpMid": "0", "sdpMLineIndex": 0 }
}
```

---

## 6. Online Presence & Session Engine (Redis)

Multi-device and multi-tab online presence tracking is executed in Redis to avoid persistent database thrashing:

* Key Schema: `presence:user:{userId}:sessions` (Redis Set containing active `sessionId` values)
* User Last Seen Key: `presence:user:{userId}:last_seen` (String epoch timestamp)
* Heartbeat TTL: 30 seconds.
* **Online Logic:** User is considered `ONLINE` if `SCARD presence:user:{userId}:sessions > 0`.
* **Disconnect Logic:** When a session disconnects, `SREM presence:user:{userId}:sessions {sessionId}` is run. If `SCARD` drops to 0, `is_online` is set to `false`, `last_seen` is updated, and a presence update event is dispatched.

---

## 7. Transactional Outbox Pattern for Kafka Async Events

To prevent state inconsistencies between PostgreSQL transactions and Kafka message dispatching (e.g. sending notification emails or analytics events), Viora uses the **Transactional Outbox Pattern**:

1. Business operations perform database changes and insert an `OutboxEvent` entity into `outbox_events` table inside the **same ACID transaction**.
2. A lightweight background Scheduled Service (`OutboxPublisher`) queries unprocessed outbox events, publishes them to Kafka topics (`viora.messages`, `viora.notifications`, `viora.analytics`), and marks events as `processed = true`.
3. Kafka consumers are strictly **idempotent**, checking deduplication caches prior to handling.

---

## 8. Frontend Design System & UI Palette

Viora features a refined **Whitish-Purple visual identity**:

* **Main Background (`bg-primary`):** `#F8F7FC`
* **Surface Panel (`bg-surface`):** `#FFFFFF`
* **Secondary Surface (`bg-secondary`):** `#F3F0FA`
* **Primary Accent Lavender (`accent-purple`):** `#8B5CF6`
* **Deep Purple (`accent-deep`):** `#6D42D8`
* **Light Lavender (`light-purple`):** `#EDE7FF`
* **Primary Text (`text-primary`):** `#252238`
* **Secondary Text (`text-secondary`):** `#77738B`
* **Borders (`border-subtle`):** `#ECE9F3`
