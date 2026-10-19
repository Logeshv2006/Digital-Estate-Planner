# 📋 Master Project Prompt & Complete Architectural Blueprint

> **Use this master prompt anytime to reconstruct, deploy, or extend the Digital Estate Planner application with 100% data and behavioral fidelity.**

---

## 🎯 Master Prompt / Instruction Specification

```markdown
Create a production-ready, full-stack Digital Estate Planner web application using React 19, TypeScript, Express, Vite, and Tailwind CSS. The system allows users to securely catalog their digital assets, assign trusted beneficiaries, configure inactivity check-in schedules, and automate verified Gmail SMTP safety alerts upon prolonged absence.

### 1. Theme & Design Guidelines: Obsidian & Emerald Aurora Cyber-Luxe
- Background: Deep velvet obsidian void (#070A0F) with ambient radial gradients of emerald green (#10B981) and electric cyan (#06B6D4).
- Panels: Frosted glassmorphism panels (backdrop-blur-xl bg-slate-900/70 border border-emerald-500/15 shadow-2xl).
- Typography: Display titles in Google Fonts 'Outfit', body text in 'Plus Jakarta Sans', and technical metrics in 'JetBrains Mono'.
- Micro-Animations: Smooth tab switching transitions, subtle floating breathing effects (4s ease-in-out), glowing status badges, countdown progress bar with animated gradient, and card elevation hover effects.
- Clean Aesthetic:
  - REMOVE all 1-Click Demo Login buttons. Authentication view must strictly provide clean 'Sign In' and 'Create Account' forms.
  - REMOVE all Database connection status icons, pills, or warning badges from the web UI so the application is completely seamless and does not show database indicators.

### 2. Environment Variables & Verified Credentials
Store the following in .env:
- PORT=3000
- NODE_ENV=development
- JWT_SECRET=super_secret_college_project_jwt_key_2025
- MONGO_URI=mongodb+srv://LogeshV:12345678@cluster0.uhsdntj.mongodb.net/digital_estate_planner?retryWrites=true&w=majority
- SMTP_HOST=smtp.gmail.com
- SMTP_PORT=587
- SMTP_USER=agileshlogesh@gmail.com
- SMTP_PASS="azmv xrnv ipfk aqsd"
- MYSQL_HOST=localhost
- MYSQL_PORT=3306
- MYSQL_DATABASE=digital_estate_planner
- MYSQL_USER=estateapp
- MYSQL_PASSWORD="Estate@App#2025"

### 3. Core Architectural Modules & Features
1. Dashboard Overview:
   - User greeting with active status indicator.
   - Status Banner: Active status notice or overdue warning when inactivity exceeds threshold.
   - Estate Status Countdown Progress Bar: Visual representation of days elapsed vs. allowed inactivity period.
   - Metric Summary Cards: Total assets, total beneficiaries, last check-in timestamp, and current health status.
   - Quick check-in action ("Confirm Check-In Now").
   - Examiner Demonstration Panel: Send Live Test Email, Simulate Overdue (>30d), and Viva Guide shortcut.
   - Live Notification Dispatch Log stream with HTML preview modal.

2. Digital Assets Vault:
   - Cataloging for: Email Accounts, Financial/Crypto Wallets, Cloud Storage, Social Media, Domains & Hosting, Devices, Subscriptions, and Documents.
   - Search by asset name, user handle, or description; category filtering.
   - Safety rule: Sensitive raw passwords are never accepted. Users document safe recovery instructions (e.g., physical vault references, 2FA hardware key locations).
   - Add, edit, and delete asset modals with confirmation.

3. Designated Beneficiaries Directory:
   - Add trusted contacts with full name, relationship (Spouse, Child, Trustee, Executor, Sibling), email, and phone.
   - Full CRUD capability with verified contact badges.

4. Safety Check-In Protocol & 4-Stage Stepper:
   - Stage 1: Active Monitoring (periodic check-in cycle active).
   - Stage 2: Inactivity Threshold Met (> 30 days without confirmation).
   - Stage 3: Multi-Channel Human Verification (automated email & SMS alerts with grace period).
   - Stage 4: Regulated Beneficiary Notice & Handover (trustees notified before handover).
   - Real-time Check-In confirmation and Viva test simulation controls.

5. Review Workflow:
   - Full documentation of the ethical and security design thesis: "Never Assume Loss of Life".
   - 5-step human-in-the-loop verification pipeline explained in detail.

6. Live Gmail SMTP Notification Engine:
   - Integrated Nodemailer service authenticated with Google Account App Password.
   - Automated 60-second background scanner checking all accounts for inactivity expiration.
   - Dispatches responsive HTML alert emails to owners and emergency advisory notices to trustees.
   - Custom test email sender and real-time dispatch log audit history.

7. Viva Q&A & Academic Examination Guide:
   - Complete technical answers explaining problem statement, architecture, authentication (Bcrypt + JWT), dual-tier resilience, and zero plaintext storage policies.

8. Profile & Check-In Window Configuration:
   - Update full name.
   - Adjust inactivity check-in threshold (7, 14, 30, 60, or 90 days).

### 4. Dual-Tier Storage Resilience Guarantee
- Tier 1: Cloud MongoDB Atlas connection with fast 4s timeout.
- Tier 2: Resilient local JSON document store (data/digital_estate_db.json) auto-synced on disk, ensuring zero server crashes, zero network buffering delays, and complete data persistence across server restarts.
```
