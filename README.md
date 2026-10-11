# SAMVAAD (संवाद) — Every Connection Has a Story

> **"Har baat, ek saath."**

Samvaad is a complete, sovereign, high-concurrency real-time communication platform built with modern enterprise Java 25 backend architecture, React frontend, PostgreSQL persistence, Redis presence tracking, Apache Kafka event streaming, STOMP WebSockets, and WebRTC voice/video calling with Indic script and language architecture.

![Samvaad Chat Interface & Dossier](docs/screens/samvaad_chat_dossier.png)

---

## 📸 Sovereign Design System & Interfaces

| **1. वार्तालाप एवं संपर्क विवरण (Chat & Dossier)** | **2. भाषा एवं क्षेत्रीय प्राथमिकताएं (Indic AI Engine)** |
|:---:|:---:|
| ![Chat Interface](docs/screens/samvaad_chat_dossier.png) | ![Indic Languages](docs/screens/samvaad_indic_languages.png) |
| **3. संप्रभु संलेख प्रवेश (Sovereign Auth Protocol)** | **4. उच्च गुणवत्ता वीडियो संवाद (VoLTE HD Calls)** |
| ![Auth Protocol](docs/screens/samvaad_auth_screen.png) | ![Video Calls](docs/screens/samvaad_video_call.png) |

---

## Key Features

* 🔐 **Authentication & Security:** Sovereign citizen credentials, Mobile OTP, password hashing (BCrypt), JWT access/refresh token rotation, and Spring Security authorization.
* 💬 **One-to-One & Group Messaging:** Real-time message delivery over STOMP WebSockets, message persistence, history pagination, message editing, deletion, replies, and reactions.
* 📋 **Delivery Status Receipts:** Server acknowledgement, Sent (`✓`), Delivered (`✓✓`), and Read (`✓✓` colored) receipt state tracking.
* 🟢 **Multi-Session Presence & Typing:** Redis-backed online status tracking across multiple tabs/devices, heartbeats, last-seen timestamps, and live typing indicators.
* 📁 **Attachment & File Sharing:** Direct conversation uploads, MIME validation, size limits, local/S3 storage abstraction, and short-lived signed media links.
* 📞 **WebRTC Audio & Video Calling:** Peer-to-peer browser calling, STOMP signaling server, ICE candidate exchange, VoLTE HD network metrics, and live neural translation subtitle strip.
* ⚡ **Asynchronous Event Processing:** Transactional Outbox pattern with Apache Kafka event bus for notifications and analytics dispatch.
* 🎨 **Sovereign Indic Design Language:** Warm parchment (`#FAF7F2`), Sovereign Navy (`#191C3B`), and gold/saffron accents with support for 14 Indian languages and phonetic transliteration.

---

## Technology Stack

### Backend
* **JDK:** Java 25 LTS
* **Framework:** Spring Boot 3.4.x
* **Security:** Spring Security 6, JWT (jjwt)
* **Real-time:** Spring WebSocket + STOMP
* **Database & ORM:** PostgreSQL 16, Spring Data JPA, Hibernate, Flyway Migrations
* **Caching & Presence:** Redis 7 (Spring Data Redis, Lettuce)
* **Messaging Bus:** Apache Kafka (Spring for Apache Kafka)
* **Build System:** Apache Maven 3.9+

### Frontend
* **Core Framework:** React 18+ with TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS (Custom Whitish-Purple design system)
* **Icons:** Lucide React
* **Routing:** React Router v6
* **Real-time Clients:** `@stomp/stompjs`, WebRTC Browser APIs

### Infrastructure & Testing
* **Containers:** Docker, Docker Compose
* **STUN/TURN:** Coturn relay server
* **Backend Testing:** JUnit 5, Mockito, Spring Boot Test, Testcontainers
* **Frontend Testing:** Vitest, React Testing Library

---

## Repository Architecture

```
viora/
├── backend/                  # Java 25 Spring Boot Modular Monolith
│   ├── src/main/java/com/viora/
│   │   ├── auth/            # Registration, Login, JWT Filters
│   │   ├── user/            # Profile Management, User Search
│   │   ├── conversation/    # Direct & Group Conversation Metadata
│   │   ├── messaging/       # STOMP Handlers, Persistence, History
│   │   ├── group/           # Group Roles, Admin Controls
│   │   ├── presence/        # Redis Presence & Heartbeats
│   │   ├── signaling/       # WebRTC SDP Offer/Answer Routing
│   │   ├── attachment/      # Storage Adapter, MIME Validation
│   │   ├── notification/    # Event Consumers & Preferences
│   │   └── common/          # Outbox Entity, Exception Handlers
│   └── src/main/resources/
│       └── db/migration/    # Flyway Migration Scripts
├── frontend/                 # Vite + React + TS UI Workspace
│   ├── src/
│   │   ├── app/             # Routing, Providers, Global Layout
│   │   ├── components/      # UI Component Library (Buttons, Modals, etc.)
│   │   ├── features/        # Feature Modules (Chats, Calls, Contacts, Profile)
│   │   ├── services/        # REST API & STOMP Clients
│   │   └── styles/          # Tailwind Tokens & Theme Configuration
├── infrastructure/           # Docker Compose, Coturn & Nginx configs
├── docs/                     # Architecture, API & Design Specs
├── .env.example              # Safe environment variable configuration
├── ARCHITECTURE.md           # System design & ER diagrams
└── AGENTS.md                 # Engineering guidelines & guidelines
```

---

## Quick Start (Local Development)

### Prerequisites
* Java JDK 25 installed (`java -version`)
* Node.js v20+ and npm (`node -v`)
* Apache Maven 3.9+ (`mvn -v`)
* Docker Desktop / Docker Engine (`docker -v`)

### 1. Clone & Environment Setup
```bash
cp .env.example .env
```

### 2. Start Infrastructure Containers
```bash
docker-compose up -d
```
Starts PostgreSQL on port `5432`, Redis on port `6379`, Kafka on port `9092`, and Coturn on port `3478`.

### 3. Run Backend Application
```bash
cd backend
mvn clean spring-boot:run
```
The API server will launch at `http://localhost:8080`.

### 4. Run Frontend Application
```bash
cd frontend
npm install
npm run dev
```
The frontend dev server will launch at `http://localhost:5173`.

---

## Implementation Roadmap

- [x] **Phase 0:** Project Repository Scaffold & Architecture Specification
- [ ] **Phase 1:** Backend & Frontend Foundations (Spring Boot 3 + Java 25 & React Vite Setup)
- [ ] **Phase 2:** Database Migrations & JWT Authentication Engine
- [ ] **Phase 3:** User Profiles, Directory Search & Conversation REST APIs
- [ ] **Phase 4:** Real-Time STOMP WebSockets & Message Persistence
- [ ] **Phase 5:** Message Delivery Receipts, Typing Indicators & Redis Presence
- [ ] **Phase 6:** Group Conversation Governance & Access Enforcement
- [ ] **Phase 7:** Storage Abstraction & File Attachments
- [ ] **Phase 8:** WebRTC Voice/Video Calling & STOMP Signaling Engine
- [ ] **Phase 9:** Transactional Outbox Pattern & Kafka Asynchronous Events
- [ ] **Phase 10:** Whitish-Purple UI Completion & Responsive Layout Integration
- [ ] **Phase 11:** Automated Integration & Unit Testing Suite
- [ ] **Phase 12:** Docker Deployment Stack & Production Readiness Guide
