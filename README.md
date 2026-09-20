# Nexa.

> Operations, reimagined.

Nexa is a modern operations management platform for teams that need a clear view of work, live data, automated workflows, role-based access, communication, reporting, and connected services from one command center.

## Proprietary Software Notice

**This project is proprietary and confidential. All rights reserved.**

You may not copy, clone, redistribute, sublicense, publish, sell, modify, reverse engineer, or create derivative works from this repository or any part of the software without explicit written permission from the owner.

This notice does not technically prevent access to a repository. To prevent other people from cloning the project, keep the repository **private**, remove unknown collaborators, review deploy keys and personal access tokens, and enable two-factor authentication on the hosting account. Do not commit `.env.local`, Firebase credentials, API keys, or other secrets.

## Product Surface

- Real-time operational dashboards
- Role-based authentication and permissions
- Workflow, task, approval, and notification management
- Academic and resource management modules
- Attendance, timetable, course, assignment, and examination workflows
- Placement, recruitment, profile, and resume tooling
- Finance, payment, receipt, and reporting workflows
- Hostel, library, canteen, room booking, and campus services
- Real-time chat and collaboration
- File uploads through Firebase Storage and Cloudinary
- Responsive public website with animated 3D-style visuals

## Technology

- React 18 and TypeScript
- Vite 7
- Tailwind CSS
- Framer Motion and GSAP
- Firebase Authentication, Firestore, and Storage
- React Router
- Recharts, jsPDF, XLSX, and QR tooling

## Requirements

- Node.js 18 or newer
- npm 9 or newer
- A Firebase project with Authentication, Firestore, and Storage enabled

## Local Setup

All configuration is project-local. The setup does not modify Windows user or system environment variables.

```powershell
npm install
npm run setup
```

Edit `.env.local` and add the Firebase web app configuration. The required values are:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=
```

If you use the seed scripts, set these additional values in `.env.local`. They
are intentionally blank in `.env.example` and must never be committed:

```env
SEED_ADMIN_PASSWORD=
SEED_FACULTY_PASSWORD=
SEED_STUDENT_PASSWORD=
SEED_PLACEMENT_PASSWORD=
SEED_RECRUITER_PASSWORD=
```

Validate the environment before starting the app:

```powershell
npm run check:env
```

## Run Locally

```powershell
npm run dev
```

To use a different port when another application is running:

```powershell
npm run dev -- --host 127.0.0.1 --port 5180 --strictPort
```

The public site is available at `/`. Authentication is available at `/auth`.

## Available Commands

| Command | Purpose |
| --- | --- |
| `npm run setup` | Create `.env.local` from `.env.example` without overwriting an existing file |
| `npm run check:env` | Validate required Firebase environment variables |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run build:dev` | Create a development-mode build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `node scripts/finalSeed.js` | Idempotently seed demo Firebase profiles and application data |

## Firebase Data

The application uses Firebase for authentication and data storage. Seed scripts create demo accounts and sample data in the configured Firebase project. Run them only against a project you own or are authorized to use.

Never place Firebase service-account credentials in the frontend or commit secrets to the repository. Firebase web configuration values are client-side configuration; Firestore rules and Firebase Authentication settings must still be configured securely.

## Security Checklist

Before sharing or deploying the project:

- Keep the repository private unless you intentionally want to publish the source.
- Keep `.env.local` out of version control.
- Rotate any credential that has been exposed publicly.
- Review Firebase Authentication providers and authorized domains.
- Review `firestore.rules` before production use.
- Remove unused collaborators, deploy keys, and access tokens.
- Use separate Firebase projects for development and production.
- Do not use seed passwords in a production environment.
- Rotate any demo passwords that were previously published or shared.
- Enable two-factor authentication on the source-control account.

## Project Layout

```text
src/
  components/       Shared interface and layout components
  config/           Firebase and payment configuration
  contexts/         React context providers
  hooks/            Reusable application hooks
  lib/              Services, permissions, exports, and utilities
  pages/            Public, authenticated, and administrative pages
  types/            Shared TypeScript types
scripts/            Local setup and Firebase seed utilities
public/             Static assets, fonts, icons, and redirects
firestore.rules     Firestore security rules
.env.example        Safe environment variable template
.env.local          Private local configuration, never commit
```

## Ownership

Nexa and all source code, design, assets, documentation, workflows, and data models in this repository are private intellectual property of the owner. No open-source license is granted by this README.

For authorized access, licensing, or collaboration requests, contact the project owner directly.
