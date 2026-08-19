# 🚀 NexLeads CRM - Lead Generation & Outreach Hub

A modern, high-performance, responsive CRM web application purpose-built in **Vue 3 (Composition API `<script setup lang="ts">`) + TypeScript + Tailwind CSS + Pinia** designed specifically for outbound cold calling, WhatsApp communication workflows, and 11-stage deal pipeline tracking.

---

## 🌟 Key Features

1. **Lead Information & Multi-Source Tracking**:
   - Contact details, Click-to-Call Phone (`tel:`), Click-to-Chat WhatsApp (`wa.me`), Email (`mailto:`), Industry, City, Address, Service Required, Date Added, Notes.
   - Lead Sources: Google Maps, Google Search / SERP, LinkedIn, Website, Google Ads, Meta Ads, Referral, Existing Database, Other.
   - Priority System: 🔥 Hot, 🟡 Warm, 🔵 Cold, ⚫ Not Qualified.

2. **5 Golden Rules Compliance Engine**:
   - Enforces: `Assigned Person` + `Lead Status` + `Last Contact` + `Next Action` + `Follow-Up Date & Time`.
   - Real-time compliance health score & 1-click filter for non-compliant leads.

3. **Cold Calling Record Center**:
   - Live call stopwatch timer & 1-click dialing.
   - Call outcome dispositions (*Answered, Busy, Switched Off, Wrong Number, Rejected, No Response, Callback Requested, Interested, Not Interested*).
   - Decision Maker availability tracking and instant next action/follow-up scheduler.

4. **WhatsApp Communication Hub**:
   - 1-Click WhatsApp template launcher (`wa.me`) with pre-filled lead tags (`{{name}}`, `{{company}}`, `{{service}}`).
   - Communication tracking: *Message Sent, Message Read, Customer Replied, WhatsApp Call Made/Attended, Documents Sent, Proposal Sent*.

5. **11-Stage Pipeline Kanban Board**:
   - `New Lead` → `Call Attempted` → `Contacted` → `WhatsApp Sent` → `Interested` → `Follow-Up Required` → `Meeting Scheduled` → `Proposal Sent` → `Negotiation` → `Won / Closed` → `Lost`.
   - Drag-and-drop cards with deal values and celebration confetti on Won deals!

6. **Chronological Activity Timeline**:
   - `Date | Time | Channel | Salesperson | Attended/Responded | Status | Notes | Next Follow-Up`.

7. **Smart Priority Queues & Analytics**:
   - Automated queue views: *Due Today, Overdue, Upcoming, Hot Leads, Proposals Pending, Not Contacted, No Response*.
   - Analytics dashboard with conversion funnel charts, source ROI breakdown, and sales rep leaderboards.
   - 1-Click CSV bulk import & export.

---

## 🛠️ Tech Stack

- **Framework**: Vue 3 (`<script setup lang="ts">`)
- **Build Tool**: Vite 6
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Pinia (with LocalStorage persistence)
- **Icons**: Lucide Vue Next
- **Effects**: Canvas Confetti

---

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Run Locally
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

---

## ☁️ Vercel Deployment

This project is pre-configured for Vercel deployment with `vercel.json`:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
