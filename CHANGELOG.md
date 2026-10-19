# Samvaad (संवाद) - Changelog

All notable changes to the Samvaad platform will be documented in this file.

---

## [1.0.1] - 2026-10-19

### 🚀 Critical Bug Fixes & Stability Improvements
- **Fixed HTTP 405 on Authentication / API endpoints:**
  - Resolved dynamic port binding in production Docker container on Render (`-Dserver.port=${PORT:-8080}`).
  - Added robust fallback to production backend (`https://samvaad-l9lg.onrender.com/api/v1` and `wss://...`) in `frontend/src/services/api.ts` and `stomp.ts` when running on `samvaad-wheat.vercel.app`.
  - Conditioned Kafka listener components to start only when Kafka is enabled (`@ConditionalOnProperty(name="spring.kafka.enabled")`), preventing infinite broker retry crash loops on single-node deployments.
  - Enhanced CORS preflight and allowed header exposure (`Content-Disposition`) across Spring Security filters.

- **Fixed Attachment Downloads & Media Sharing:**
  - Standardized attachment URL resolution to use absolute backend `API_BASE`, preventing 404 errors when downloading images, voice notes, and documents in production.
  - Hardened file streaming endpoints to safely serve binary payloads with signed tokens.

- **Fixed Screen Sharing in Video Calls:**
  - Replaced the outgoing video sender track on `RTCPeerConnection` (`sender.replaceTrack(screenTrack)`), ensuring remote participants actually receive the live display stream.
  - Handled automated reversion to camera video track when screen sharing is ended by the user or browser controls.

- **Optimized WebRTC Calling & ICE Negotiation:**
  - Upgraded STUN/TURN server configuration using multiple Google STUN endpoints.
  - Implemented candidate queuing and instant SDP answer flushing to prevent ICE race conditions and long connection delays.

---

### ✨ New Privacy & Messaging Features

- **Instagram-Style Message Requests:**
  - First-time direct messages now start with `status = 'PENDING'` and target the recipient.
  - Dedicated "Requests (अनुरोध)" filter tab in the sidebar with live badge count.
  - In-chat Accept/Decline action banner: recipient can accept or reject requests before active inbox integration.

- **User Blocking & Moderation:**
  - Database-backed `user_blocks` table with composite uniqueness and indexing.
  - REST endpoints (`POST /api/v1/users/{userId}/block`, `DELETE /api/v1/users/{userId}/block`, `GET /api/v1/users/blocked`).
  - Strict enforcement: blocked users cannot send messages or initiate voice/video calls.
  - Quick toggle button in chat header menu with visual banner indication.

- **Per-User Chat Deletion / Privacy Hiding:**
  - Database-backed `user_deleted_conversations` table.
  - A user can delete/clear a chat from their inbox without affecting the partner's conversation history.
  - Conversations dynamically reappear if new messages are exchanged.

- **Message Unsend / Revoke:**
  - Senders can unsend their own messages for everyone via `DELETE /api/v1/messages/{id}`.
  - Broadcasts real-time `MESSAGE_DELETED` WebSocket event to all conversation members, updating content to "This message was deleted".

- **One-Time Location Sharing:**
  - Native Geolocation API integration via `MessageType.LOCATION`.
  - Interactive map card in chat bubble with coordinates and a 1-tap "Open in Google Maps" link.

- **Strict Private User Search & Friend Discovery:**
  - Database-backed exact-match username lookup (`WHERE LOWER(username) = LOWER(:username)`) supported by a functional index (`CREATE INDEX idx_users_lower_username ON users(LOWER(username))` in `V5__exact_username_index.sql`).
  - Leading `@` stripping and whitespace trimming. Zero partial matches, zero display name matches, and zero random/suggested user directories.
  - Dedicated rate limiter (`SearchRateLimiter`) enforcing a 30 searches/minute per-user sliding window to protect against automated username enumeration.
  - Dedicated **Friends & Contacts** panel (`FriendsView`) displaying only users with established, accepted conversations (`status = 'ACCEPTED'`), complete with voice/video calling and clean empty states.
  - `NewChatModal` upgraded with explicit submission, exact match lookup, and clear relationship badges ("Request Sent", "Pending Acceptance", "Accepted Connection").

---

### 🎨 UI/UX & Responsive Enhancements

- **Draggable Floating Call Window (Picture-in-Picture):**
  - Smooth dragging on desktop (mouse pointer) and mobile (touch pointer) with viewport boundary clamping (`pointerdown`, `pointermove`, `pointerup`).
  - Distinguishes quick clicks (toggles maximize) from dragging gestures.
  - Works seamlessly for both Video and Voice calls.

- **Desktop Resizable Conversation Sidebar:**
  - Smooth interactive draggable divider between sidebar and chat area.
  - Width constraints (260px - 550px) with automatic persistence to `localStorage`.

- **WhatsApp-Style Mobile UI/UX & Responsive Architecture:**
  - **Three Distinct Breakpoint Layouts:** Dedicated mobile (< 768px), tablet (768px - 1023px), and desktop (>= 1024px) experiences.
  - **WhatsApp Mobile Home Screen:** Clean top header with sovereign branding, search trigger, status stories indicator, and 3-dots overflow menu (New Chat, Call History, Avatar Studio, Language switcher, Settings, Sign Out).
  - **WhatsApp Mobile Bottom Navigation Bar:** Fixed bottom navigation bar with active indicators and badges for Chats, Status, Calls, Contacts, and Settings.
  - **Floating Action Button (FAB):** High-visibility round FAB for initiating new chats directly on mobile without hunting through desktop menus.
  - **Full-Screen Mobile Chat View:** Tapping any conversation hides the home top bar and bottom nav, presenting a full-height chat experience with a dedicated back button.
  - **Compact Chat Header & Overflow Menu:** Chat header collapses non-essential triggers (AI summaries, wallpaper, dossier) into a 3-dots action menu on mobile while keeping voice call, video call, and avatar front and center.
  - **Slide-Over Contact Dossier Drawer:** Transformed Contact Dossier from an in-line panel that squeezed the chat into a slide-over overlay drawer with a backdrop on mobile/tablet viewports.
  - **WhatsApp-Style Composer & Attachment Bottom Sheet:** Replaced bloated horizontal action button row with a clean input capsule (Emoji picker, expanding text input, paperclip attachment trigger, send / voice note record toggle). Tapping the paperclip opens a slide-up attachment sheet with clean cards for Gallery, Document, Location, UPI Payment, View Once, and Indic Script.
  - **Zero Horizontal Overflow & Safe Area Insets:** Added `viewport-fit=cover`, safe-area padding helpers (`safe-pb`, `safe-pt`), and word-break wrapping on message bubbles and URLs. Minimum 44px touch targets across all mobile interactive controls.

