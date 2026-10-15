# SAMVAAD - Engineering Guidelines & Agent Instructions

This document outlines standard operating procedures, architectural directives, and execution rules for agents and software engineers contributing to Samvaad.

---

## 1. Core Engineering Directives

1. **Verify Before Action:** Always inspect the repository and verify system dependencies before modifying code.
2. **Modular Monolith Discipline:** Never bypass module boundaries. Domain logic must reside strictly inside its corresponding module (`auth`, `user`, `conversation`, `messaging`, `group`, `presence`, `signaling`, `attachment`, `notification`, `common`).
3. **No Superficial Mocking:** Never implement fake or empty stub endpoints that claim to fulfill production functionality without actual database persistence or WebSocket event propagation.
4. **Security First:**
   * Never store plaintext passwords. Use BCrypt / Argon2 via Spring Security.
   * Never trust client-supplied sender IDs. Always derive identity from the authenticated `SecurityContext` / `StompHeaderAccessor`.
   * Authorize every resource lookup against conversation membership before returning data or processing actions.
5. **Durable Message Persistence:** Messages must be written to PostgreSQL with `SENT` status before durable WebSocket acknowledgement is returned to the client.
6. **Zero Hardcoded Secrets:** Keep configuration strictly driven by environment variables (`.env`). Never commit production credentials, API keys, or JWT signing keys.

---

## 2. Coding & Style Conventions

### Backend (Java 25 & Spring Boot)
* Use modern Java language features (Records for DTOs, Pattern Matching, Sealed Interfaces, Text Blocks).
* Controllers must be thin and delegate business rules to `@Service` classes.
* Data layer must use Spring Data JPA interfaces and Flyway migration scripts.
* Use `@Valid` and Bean Validation annotations on all incoming request DTOs.
* Return consistent JSON error responses (`ErrorResponse` DTO with timestamps, field errors, and standard status codes).

### Frontend (React + TypeScript + Vite)
* TypeScript strict mode enabled. Avoid `any` types.
* Tailwind CSS utility classes following the Whitish-Purple design palette (`#F8F7FC` background, `#8B5CF6` primary lavender, `#6D42D8` deep purple, `#252238` text).
* Separate API/WebSocket infrastructure from UI presentation components.
* Implement clean loading, error, empty, and active states for every interactive UI view.

---

## 3. Verification & Definition of Done

A task or phase is considered complete **only when**:
1. All written Java/TypeScript code compiles without errors.
2. Database schema changes have corresponding Flyway migration scripts.
3. Automated unit and integration tests pass successfully.
4. Verification evidence (test output, API checks, UI component rendering) is provided.
5. `ARCHITECTURE.md` and `README.md` are updated if architectural decisions changed.
