# Timegrid

Priority-and-time planner. Calendar, dashboard (time vs priority), random reminders,
installable on Windows and Android, synced through Supabase.

## Files
| File | What it does |
|---|---|
| `index.html`, `styles.css`, `app.js` | The app itself |
| `config.js` | Your Supabase URL and key (the only file you must edit) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Make it installable and usable offline |
| `vendor/supabase.js` | Sync library, bundled so the app works offline |
| `supabase/schema.sql` | Database table and security rules, run once |

## Setup

### 1. GitHub
1. github.com -> New repository -> name `timegrid`, set it to **Public**, no README.
2. "uploading an existing file" -> drag in everything from this folder (keep the folders) -> Commit.

### 2. Hosting (GitHub Pages)
Repository -> Settings -> Pages -> Source: "Deploy from a branch" -> Branch `main`, folder `/ (root)` -> Save.
After a minute your app is live at `https://YOUR-USERNAME.github.io/timegrid/`.

### 3. Supabase
1. supabase.com -> New project (any name, pick a region close to you, save the database password).
2. SQL Editor -> New query -> paste `supabase/schema.sql` -> Run.
3. Project Settings -> API -> copy the **Project URL** and the **anon public** key.
4. Authentication -> URL Configuration -> set **Site URL** to your GitHub Pages address.
5. Optional, for a personal app: Authentication -> Providers -> Email -> turn off "Confirm email"
   so you can sign in right after creating the account.

### 4. Connect the app to Supabase
Edit `config.js` on GitHub (pencil icon), paste the URL and key, Commit. Pages redeploys in about a minute.

### 5. Install
- **Windows:** open the address in Chrome or Edge -> install icon in the address bar -> Install.
- **Android:** open it in Chrome -> menu -> Install app.
Sign in with the same email on both. Done.

## Updating later
Change any file, commit it. If you changed app files, also bump `VERSION` in `sw.js`
(for example `timegrid-v2`) so installed copies pick up the update.

## Known limits (phase 1)
- Reminders fire while the app is open or running in the background. Fully closed-app push
  notifications need a server job and are planned as phase 2.
- Sync is last-edit-wins per task.
