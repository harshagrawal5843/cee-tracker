# CEETracker — Final README (Ready for upload)

CEETracker is an exam-prep study planner and tracker built with Next.js (App Router), React, Tailwind CSS and Firebase (optional but recommended). This README is the final, push-ready project summary for uploading to GitHub.

Quick commands

- Dev: `npm run dev`
- Build: `npm run build`
- Start (production): `npm start`

Contents

- Project overview
- Features
- Routes & important files
- Data model (Firestore-first) — schema and rules
- Environment variables required
- Installation & local development
- Screenshots & automated capture
- Troubleshooting
- Push / upload checklist

## Project overview

CEETracker helps students organize subjects and chapters, run short daily challenges, track streaks, and view per-day history. The app now treats Firestore as the source of truth for per-user progress/history/streaks; localStorage is used only for transient UI preferences (theme).

## Key features

- Dashboard with subject cards and progress summaries
- Subject pages with chapter accordion and completion checkboxes
- Today's challenge (server-generated plan) and per-user quiz results
- Study Timer with daily snapshots
- Streak tracking (increment on challenge completion)
- Dark / Light theme (default: dark)

## Routes & important files

- `/` — Dashboard: [app/page.js](app/page.js#L1)
- `/subject/[name]` — Subject page: [app/subject/[name]/page.js](app/subject/[name]/page.js#L1)
- `/study-timer` — Study timer: [app/study-timer/page.js](app/study-timer/page.js#L1)
- `/challenge-history` — History and stats: [app/challenge-history/page.js](app/challenge-history/page.js#L1)
- API: `/api/generate-daily-plan` — [app/api/generate-daily-plan/route.js](app/api/generate-daily-plan/route.js#L1)

Key components

- `components/TodaysPlan.js` — Today's plan UI and per-user progress writes
- `components/StreakTracker.js` — streak display
- `components/StudyTimer.js` — timer UI and snapshots
- `components/ThemeToggle.js` — theme toggle
- `lib/firebase.js` — Firebase client init
- `lib/storage.js` — theme helpers and light client helpers (no user data persistence)
- `lib/dailyChallenge.js` — plan/date keys and streak helpers

## Data model (Firestore-first)

All user-specific persistent data is stored under the root user document `users/{userId}`. The structure used by the app is:

- `users/{userId}` (document)
	- `completions` — object mapping subject/chapter completions (e.g. { "Math": { "ch1": true } })
	- `dailyProgress` — map keyed by `YYYY-MM-DD` with per-day task details
	- `dailyChallengeHistory` — map keyed by `YYYY-MM-DD` storing challenge results and metadata
	- `studyStreak` — object { count: number, lastCheckInDate: "YYYY-MM-DD" }

- `dailyPlans/{date}` — global cached daily plan documents written by the server API (server-only writes recommended). The API will return the cached plan if present.

Notes

- The app no longer relies on localStorage for per-user progress or streaks — Firestore is the source of truth. LocalStorage remains only for the theme preference (`cee-tracker-theme`).
- Server-side generation of daily plans uses Google Gemini (if configured) but falls back to a deterministic generator when the AI is unavailable.

Recommended Firestore security rule (allow users to read/write only their own doc)

Example (Firestore rules):

rules_version = '2';
service cloud.firestore {
	match /databases/{database}/documents {
		match /users/{userId} {
			allow read, write: if request.auth != null && request.auth.uid == userId;
		}
		match /dailyPlans/{docId} {
			allow read: if true; // public read
			allow write: if false; // only server/admin should write
		}
	}
}

Make sure you configure these rules in your Firebase console before using the app in production; missing or overly restrictive rules will cause PERMISSION_DENIED errors at runtime.

## Environment variables

Create a `.env.local` with these keys (example names used by this project):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `GEMINI_API_KEY` (optional — used by server API to call Google Gemini; if missing, deterministic plan is used)

Restart the dev server after changing `.env.local`.

## Installation & local development

Prerequisites: Node 18+ recommended.

1. Clone

git clone <repo-url>
cd CEETracker

2. Install

npm install

3. Run dev server

npm run dev

4. Open the URL printed by the server (commonly `http://localhost:3000` or `http://localhost:3001`).

Build & start (prod):

npm run build
npm start

Useful commands

- `npx prettier --write .`
- `npm run dev`
- `npm run build`

## Screenshots & automated capture

Place screenshots under `public/screenshots/`. The repository includes a Playwright helper script that can capture pages; run it if you want automated screenshots.

If you want me to capture and add screenshots before you upload, tell me which routes to capture and I will run Playwright and update the images and README.

## Troubleshooting

- Firestore PERMISSION_DENIED: check Firestore rules and that `.env.local` contains the correct `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and other keys.
- Gemini errors (429): the server API will fall back to a deterministic generator when the Gemini quota is exceeded.
- Theme not applied at boot: ensure `cee-tracker-theme` exists in `localStorage` or call the theme utility to apply it before React paints.

## Push / upload checklist (for GitHub)

1. Ensure `.env.local` is NOT committed — it contains secrets. Add it to `.gitignore`.
2. Run formatting: `npx prettier --write .`
3. Commit changes: `git add -A && git commit -m "Finalize README and Firestore migration"`
4. Push to your remote: `git push origin main` (or replace `main` with your default branch)

If `git push` fails due to remote configuration, add a remote with `git remote add origin <repo-url>` and then push. If you prefer, I can create the commit for you locally; you will need to run the `git push` step in your environment or provide remote credentials.

## Contributing

1. Fork → branch → implement
2. Run `npm run dev` and validate changes
3. Run `npx prettier --write .`
4. Open a PR with a concise description and screenshots

## License

Add a `LICENSE` file if you want to publish under a specific license.

---
