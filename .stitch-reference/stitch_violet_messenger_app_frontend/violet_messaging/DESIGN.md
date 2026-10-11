---
name: Violet Messaging
colors:
  surface: '#fdf8ff'
  surface-dim: '#dcd6f4'
  surface-bright: '#fdf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f1ff'
  surface-container: '#f1ebff'
  surface-container-high: '#ebe5ff'
  surface-container-highest: '#e5dffd'
  on-surface: '#1c192e'
  on-surface-variant: '#494454'
  inverse-surface: '#312e44'
  inverse-on-surface: '#f4eeff'
  outline: '#7b7486'
  outline-variant: '#cbc3d7'
  surface-tint: '#6d3bd7'
  primary: '#6b38d4'
  on-primary: '#ffffff'
  primary-container: '#8455ef'
  on-primary-container: '#fffbff'
  inverse-primary: '#d0bcff'
  secondary: '#673bd2'
  on-secondary: '#ffffff'
  secondary-container: '#8057ec'
  on-secondary-container: '#fffbff'
  tertiary: '#5d5a6d'
  on-tertiary: '#ffffff'
  tertiary-container: '#767287'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#e8ddff'
  secondary-fixed-dim: '#cebdff'
  on-secondary-fixed: '#21005d'
  on-secondary-fixed-variant: '#511cbc'
  tertiary-fixed: '#e5dff7'
  tertiary-fixed-dim: '#c9c3da'
  on-tertiary-fixed: '#1c192a'
  on-tertiary-fixed-variant: '#474457'
  background: '#fdf8ff'
  on-background: '#1c192e'
  surface-variant: '#e5dffd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.005em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system establishes an ultra-refined, serene, and modern communication workspace tailored for high-velocity teams and professional networks. Drawing from contemporary SaaS aesthetics with cues of tactile software luxury, the interface prioritizes conversational clarity, zero cognitive friction, and airy spaciousness over dense utility.

The brand persona is poised, intelligent, and composed. It rejects the hyper-saturated, gamified nature of consumer chat in favor of purposeful focus. By marrying clean minimalism with delicate lavender undertones and feather-light border treatments, the UI delivers an atmospheric sense of calm, ensuring extended all-day messaging without visual fatigue.

## Colors

The palette leverages high-key luminescence with precise violet accents to guide user attention naturally toward active conversational threads and critical actions:

- **Canvas & Surfaces:**
  - Base Application Canvas: `#F8F7FC` (atmospheric soft lavender tint)
  - Primary Surface (Cards, Chat Viewport, Active Threads): `#FFFFFF`
  - Secondary Surface (Sidebar, Utility Panels, Inactive Zones): `#F3F0FA`
  - Hover States & Tonal Highlights: `#F0EBFF`
- **Brand & Accent Roles:**
  - Primary Action / Interactive Accent: `#8B5CF6` (vibrant modern lavender)
  - Deep Purple (Pressed states, emphasized icons, active badges): `#6D42D8`
  - Subtle Lavender Fill (Incoming bubble highlights, chip backgrounds): `#EDE7FF`
- **Typography & Content Hierarchy:**
  - Primary Text: `#252238` (deep blackened violet ensuring WCAG AAA legibility)
  - Secondary Text: `#77738B` (balanced medium-contrast body and metadata)
  - Muted Text: `#A19CB2` (timestamps, subtle placeholders, inactive indicators)
- **Dividers & System States:**
  - Crisp Borders: `#ECE9F3`
  - Success Indicator: `#22A06B` (online presence, message delivered/read receipts)
  - Danger / Alert: `#E5484D` (destructive triggers, mute/block actions, disconnected states)

## Typography

The type system runs entirely on **Inter** with calibrated letter-spacing and optical tracking for screen readability. 

- **Display & Headlines:** Emphasize conversations, channel headers, and workspace settings with confident negative tracking to deliver an engineered, contemporary posture.
- **Message Content:** Standardized on `body-md` (14px) with a relaxed `22px` line height to maximize scan speed in high-volume chat streams.
- **Microcopy & Metadata:** Timestamps, read receipts, and system tags use `label-sm` and `caption`, maintaining strict contrast ratios without pulling visual weight away from unread correspondence.

## Layout & Spacing

The layout is built around a flexible multi-pane structural framework tailored for messaging platforms:

- **Navigation & Channels Pane:** Width locked between `280px` and `340px`.
- **Primary Message Stream:** Expands fluidly, maintaining an optimal readable line width capped at `840px` for conversational content within the canvas.
- **Inspector / Thread Details Rail:** Collapsible right panel fixed at `320px`.

### Responsive Mechanics
- **Mobile (< 768px):** Strict single-column stack. Channels, active chat, and profile information operate via slide transitions. Edge margin scales down to `margin` (1rem / 16px).
- **Tablet (768px - 1024px):** Dual-pane layout (Channel sidebar + Active chat). Detailed participant info collapses into an overlay drawer.
- **Desktop (> 1024px):** Full three-pane workspace with seamless edge gutters. 

Vertical spacing in chat threads follows an asymmetrical rhythm: grouped messages from the same sender cluster with `space-xs` (4px), while transitions between speakers mandate `space-md` (12px).

## Elevation & Depth

Visual hierarchy relies on crisp borders and soft, diffused ambient drop shadows tinted with faint violet to preserve an airy, pristine aesthetic:

- **Border Strategy:** Crisp `1px` borders using `#ECE9F3` establish element boundaries across sidebars, message bubble boundaries, and list entries without heavy drop shadows.
- **Level 0 (Flat):** Primary canvas `#F8F7FC` and secondary sidebar `#F3F0FA`. Zero elevation, delineated exclusively via structural `#ECE9F3` lines.
- **Level 1 (Surface Cards & Floating Bubbles):** Used for elevated panels, outgoing message bubbles, and search dropdowns:
  - `box-shadow: 0px 2px 8px -2px rgba(37, 34, 56, 0.04), 0px 1px 3px 0px rgba(37, 34, 56, 0.02);`
- **Level 2 (Popovers, Context Menus & Tooltips):** Floating interactive states:
  - `box-shadow: 0px 8px 24px -4px rgba(109, 66, 216, 0.08), 0px 3px 8px -2px rgba(37, 34, 56, 0.04);`
- **Level 3 (Modal Dialogs & User Profiles):** Centered workspace overlays:
  - `box-shadow: 0px 20px 48px -8px rgba(37, 34, 56, 0.12), 0px 8px 16px -4px rgba(139, 92, 246, 0.06);`
- **Backdrop Treatments:** Overlays apply a subtle backdrop blur (`backdrop-filter: blur(8px)`) combined with `rgba(37, 34, 56, 0.2)` fill to sustain contextual continuity.

## Shapes

The design system embraces a **Rounded (Level 2)** philosophy, conveying modern friendliness alongside SaaS precision:

- Standard controls (input fields, buttons, card enclosures) apply `0.5rem` (8px).
- Containers, popovers, and floating sheets apply `1rem` (16px / `rounded-lg`).
- Message bubbles employ asymmetric corners: incoming bubbles feature `1rem` rounding with a tucked `0.25rem` bottom-left anchor; outgoing bubbles mirror this with a `0.25rem` bottom-right anchor.
- Presence pills, filter badges, and interaction avatars leverage full pill-rounding (`9999px`).

## Components

### Buttons
- **Primary:** Solid `#8B5CF6` fill, `#FFFFFF` text, `0.5rem` radius. Hover shifts to `#6D42D8`. Focus ring: `2px` offset with `rgba(139, 92, 246, 0.4)`.
- **Secondary:** Surface `#FFFFFF` with `1px` border `#ECE9F3` and `#252238` text. Hover applies `#F0EBFF` with `#8B5CF6` border tint.
- **Ghost / Icon:** Transparent background with `#77738B` icons. Hover applies `#F0EBFF` fill and `#6D42D8` icon tint.

### Chat Message Bubbles
- **Incoming:** Surface `#FFFFFF`, border `1px solid #ECE9F3`, text `#252238`. Rounded `1rem` with bottom-left corner at `0.25rem`.
- **Outgoing:** Fill `#8B5CF6`, text `#FFFFFF`, timestamp `#EDE7FF`. Rounded `1rem` with bottom-right corner at `0.25rem`. Subtle directional shadow applied.
- **System / Date Badges:** Fill `#EDE7FF`, text `#6D42D8`, font `label-sm`, rounded `9999px`, inline padding `8px 12px`.

### Input Fields & Message Composer
- **Resting:** Background `#FFFFFF`, border `1px solid #ECE9F3`, placeholder `#A19CB2`, radius `0.75rem`.
- **Active / Focused:** Border color shifts to `#8B5CF6` accompanied by an ambient ring: `0 0 0 3px rgba(139, 92, 246, 0.15)`.
- **Attachment Bar:** Integrated cleanly inside the composer with soft-lavender icon actions (`#77738B` resting, `#8B5CF6` hover).

### Lists & Channel Directory
- **List Items:** Padding `10px 12px`, radius `0.5rem`.
- **Resting:** Transparent background, primary contact name `#252238`, preview text `#77738B`.
- **Active / Selected:** Background `#F0EBFF`, contact title `#6D42D8`, with an optional `3px` left edge vertical accent in `#8B5CF6`.
- **Unread Badge:** Pill shape, background `#8B5CF6`, text `#FFFFFF`, bold `11px` typography.

### Checkboxes & Radio Controls
- **Unchecked:** `18px` container, `1px solid #ECE9F3`, background `#FFFFFF`.
- **Checked:** Background `#8B5CF6`, border `#8B5CF6`, crisp white checkmark icon.

### Cards & Flyout Modals
- **Surface:** Solid `#FFFFFF`, bordered by `1px solid #ECE9F3`.
- **Header:** Padding `1.25rem`, separated by hairline divider `#ECE9F3`.

### Status Indicators & Read Receipts
- **Online Presence:** `8px` dot, background `#22A06B` encased by `2px` white outline.
- **Read Receipts:** Double checkmark in `#8B5CF6` for read messages; single checkmark in `#A19CB2` for sent.