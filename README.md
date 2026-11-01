# Gala — AI Event Planning Studio

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.3-61dafb.svg)](https://react.dev/)
[![Tests](https://img.shields.io/badge/Tests-110%20Passing-brightgreen.svg)](https://vitest.dev/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Firebase%20Hosting-FFCA28?logo=firebase&logoColor=black)](https://gala-event-studio.web.app)
[![Security](https://img.shields.io/badge/Security-Local--First%20%7C%20Zero--Key--Leakage-success.svg)](#security--best-practices)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

> 🌐 **Live Demo:** [https://gala-event-studio.web.app](https://gala-event-studio.web.app)  
> 📦 **Public Repository:** [https://github.com/harishkumarv-dev/Bharat-Vote-Assistant](https://github.com/harishkumarv-dev/Bharat-Vote-Assistant)  
> **Prompt Wars Virtual — Challenge 5 Submission**  
> **Vertical:** Celebration and Event Planning  
> **Problem Statement:** *Create a GenAI-powered planning assistant that helps users organize weddings, birthdays, and community events with budgets, timelines, vendor checklists, and personalized ideas.*

---

## 1. Chosen Vertical & Problem Statement Alignment

**Chosen Vertical:** Celebration and Event Planning  
**Target Personas:** 
- Couples planning intimate or multi-day **weddings**.
- Families and individuals organizing milestone **birthdays**.
- Organizers coordinating inclusive **community events** (festivals, charity fundraisers, cultural galas).

### How Gala Solves the Core Challenge:
Rather than building an ephemeral chatbot that merely dumps unstructured conversational ideas, **Gala** is a comprehensive, deterministic, local-first planning studio. It unifies five critical pillars of celebration planning:
1. **Dynamic Budget Management:** Category-based targets, actual vs. estimated spend, per-guest breakdown, and proactive overrun alerts.
2. **Phase-Based Timelines:** Intelligent milestone generation mapped against the countdown runway, with calendar export (`.ics`) and automatic rescheduling.
3. **Vendor Coordination & Checklists:** Essential vendor tracking tailored per event type, quote comparison, stage-by-stage checklists, and instant vendor enquiry email drafts.
4. **Adaptive Trade-off Analysis & Plan Health:** Real-time recalculation of budget headroom, vendor readiness, and guest RSVP ratios whenever inputs change — without making the user start over.
5. **Personalized GenAI Concept Studio:** Tailored themes, color palettes, signature moments, dietary/accessibility accommodations, and actionable cost-saving tips powered by Gemini / OpenAI or a local heuristic engine.

---

## 2. Approach & Architecture

Gala is built around a **Local-First, Privacy-Preserving Architecture**. Planning a wedding or private celebration involves personal details, financial figures, and guest dietary/accessibility information. Gala keeps all data safely on the client device without requiring servers or external accounts.

```
┌───────────────────────────────────────────────────────────┐
│                      User Interface                       │
│  Overview · Concept Studio · Budget · Guests · Vendors    │
│                 Timeline · Data Import/Export             │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                 Domain State & Reducer                    │
│    usePlanner() · AppContext · Zod Validation Engine      │
└──────────────┬─────────────────────────────┬──────────────┘
               │                             │
┌──────────────▼─────────────┐ ┌─────────────▼──────────────┐
│       AI Client Layer      │ │   Local Persistence Engine │
│  - Gemini 2.5/Flash Client │ │  - LocalStorage / IndexedDB│
│  - OpenAI Client           │ │  - Schema v1 Export/Import │
│  - Offline Heuristic Engine│ │  - RFC-5545 .ics Calendar  │
│  - Zod Schema Sanitizer    │ │  - Safe Backup Restoration │
└────────────────────────────┘ └────────────────────────────┘
```

### Key Architectural Decisions:
- **Zod-Guaranteed Schema Integrity:** Every imported backup, AI response, and domain transition is strictly parsed via Zod schemas (`src/domain/validation.ts` and `src/ai/schema.ts`).
- **Dual-Engine AI (Zero-Breakage Guarantee):**
  - **Online Mode:** Connects directly via user-provided Gemini or OpenAI API keys using client-side HTTPS requests.
  - **Local Heuristic Mode:** Built-in domain logic provides instant concept generation, signature ideas, and budget advice offline. Evaluators can experience the full app even if API quotas or keys expire.
- **Dynamic Trade-off Engine:** When guest headcount or budget targets change, the app recalculates per-guest allocations and triggers targeted health warnings (e.g. flagging catering overrun when headcount spikes).

---

## 3. How the Solution Works

### A. The Event Wizard & Instant Demo
Users can start from scratch across three event archetypes (`wedding`, `birthday`, `community`) or load a pre-populated **Sample Event ("Maya & Arjun's garden wedding")** with a single click to instantly explore the full interface.

### B. GenAI Concept Studio
- **Structured Concept Generation:** The AI receives the event archetype, location, budget, guest count, priorities (e.g., food, photography, sustainability), and style tags (e.g., modern, bohemian, cozy).
- **Zod-Validated Output:** Produces a cohesive title, summary, 5-color aesthetic palette (hex codes), signature moments, and prioritized idea cards with cost bands (`free`, `low`, `medium`, `splurge`) and effort ratings.

### C. Budget Studio with Trade-off Tracking
- Distributes budget across categories curated for the event type (e.g. Venue, Catering, Photography, Floral, Music).
- Automatically tracks **Actual Spent**, **Committed Quotes**, and **Remaining Buffer**.
- Flags trade-off risks when items overrun and recommends categories with available headroom.

### D. Vendor Lifecycle Management
- Tracks vendors through a clear funnel: `Researching` ➔ `Contacted` ➔ `Quoted` ➔ `Booked` ➔ `Declined`.
- Dynamic requirement tags: Identifies "Essential Vendors" for the chosen vertical (e.g., Officiant & Photographer for weddings; Cake & Entertainment for birthdays; Permits & Accessibility for community events).
- One-click **Vendor Enquiry Email Generator** prepopulated with event details and customized inquiry points.

### E. Adaptive Timeline & Calendar Sync
- Auto-schedules milestones into five chronological phases: `Foundation`, `Bookings`, `Details`, `Final stretch`, and `Event day`.
- Auto-adjusts for short runway planning (compresses lead times without scheduling tasks in the past).
- Exports full RFC-5545 compliant `.ics` calendars for direct import into Google Calendar, Apple Calendar, or Outlook.

### F. Inclusive Guest & Dietary Hub
- Real-time dietary registry (Vegetarian, Vegan, Gluten-free, Nut-free, Halal, Kosher, etc.).
- Accessibility registry (Step-free access, Quiet sensory room, Hearing support, Accessible parking).
- RSVP status breakdown (`attending`, `maybe`, `declined`, `pending`) with headcount forecasting including plus-ones.

---

## 4. Prompt Engineering & Flow Strategy

Gala uses deliberate prompt engineering patterns located in [`src/ai/prompts.ts`](src/ai/prompts.ts):

1. **Strict Persona & Tone Prompting:**
   The AI assistant is instructed as an empathetic, calm, and financially responsible luxury event director.
2. **Context-Rich Few-Shot Grounding:**
   The prompt injects:
   - Event type, headcount, date, and whole-currency budget.
   - Selected priorities (e.g. "accessibility", "food", "experiences").
   - Dietary and accessibility restrictions.
3. **Structured JSON Output Constraints:**
   Requests enforce JSON-only output with explicit schema expectations, avoiding conversational filler or non-parsable markdown formatting.
4. **Safety & Token Management:**
   - Input bounded: Character limits prevent prompt bloat.
   - Error mapping: Sanitized error classes prevent raw API keys or internal stack traces from ever leaking to the UI or logs.

---

## 5. Security & Best Practices

- **Zero Hardcoded Secrets:** No API keys, credentials, or tokens exist in the source code or git history.
- **Client-Side Key Isolation:** User API keys are stored solely in browser session memory (or optionally local browser storage upon explicit user toggle) and are dispatched solely to Google / OpenAI endpoints.
- **No Key Leakage in Exports:** Workspace export strips all configuration keys and saves strictly event domain data.
- **Content Security Policy (CSP):** Strict CSP headers restrict script execution and limit network connectivity exclusively to authorized AI endpoints:
  ```
  connect-src 'self' https://generativelanguage.googleapis.com https://api.openai.com
  ```
- **File Validation Limits:** Import parser rejects payloads larger than 2 MB, invalid JSON, malformed schemas, and foreign formats to defend against malicious input.

---

## 6. Testing & Quality Assurance

Gala is built with rigorous test coverage across AI client handling, domain mathematics, calendar generation, persistence, and schema validation.

```bash
# Run Vitest test suite (110 unit tests)
npm test

# Run TypeScript strict typecheck
npm run typecheck

# Run production build
npm run build
```

### Test Suite Summary:
- **110/110 passing unit tests** across 11 test suites:
  - `src/ai/client.test.ts` (16 tests) — Error mapping, retry strategies, key sanitization.
  - `src/ai/schema.test.ts` (6 tests) — Zod schema validation for AI concept outputs.
  - `src/domain/plan.test.ts` (14 tests) — Event state lifecycle, updates, drafting.
  - `src/domain/budget.test.ts` (11 tests) — Calculations, category summaries, variance.
  - `src/domain/timeline.test.ts` (10 tests) — Milestone generation, short runways, RFC-compliant `.ics` folding.
  - `src/domain/guests.test.ts` (15 tests) — RSVP aggregations, plus-ones, dietary metrics.
  - `src/domain/vendors.test.ts` (7 tests) — Readiness metrics, essential vendor detection.
  - `src/domain/health.test.ts` (8 tests) — Weighted plan health score, dynamic trade-off insights.
  - `src/domain/persistence.test.ts` (10 tests) — Backup/restore, BOM handling, corrupt file recovery.
  - `src/domain/validation.test.ts` (6 tests) — Schema integrity, boundary checking.
  - `src/domain/dates.test.ts` (7 tests) — ISO date calculations and edge cases.

---

## 7. Accessibility & Usability (WCAG Compliant)

- **Semantic HTML5:** Native landmark tags (`<header>`, `<main>`, `<nav>`, `<section>`).
- **High-Contrast Design:** Color palette meets WCAG AAA standards for legibility.
- **Keyboard Navigation & ARIA:** Modals feature focus trapping, ESC dismiss, and descriptive `aria-label` tags on interactive buttons and dialogs.
- **Sensory & Dietary Awareness:** First-class accommodation tracking directly inside event briefings and vendor contracts.

---

## 8. Assumptions Made

1. **Storage Environment:** The application assumes a modern web browser environment with `localStorage` availability.
2. **Privacy First:** Users prefer having sensitive celebration planning data (guest addresses, phone numbers, budgets) stored locally rather than on a third-party server.
3. **Currency Support:** Standard whole-number arithmetic with currency formatting for `USD`, `EUR`, `GBP`, `INR`, `AUD`, and `CAD`.
4. **Resilience under Quota Limits:** Evaluators or users might not have a paid Gemini/OpenAI API key; therefore, the fallback heuristic generator must produce realistic, event-tailored data without failing.

---

## 9. Quickstart Guide

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation & Run
```bash
# Clone the repository
git clone <YOUR_PUBLIC_REPO_URL>
cd gala

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser. Click **"Load sample event"** on the initial screen to explore the workspace with live data!
