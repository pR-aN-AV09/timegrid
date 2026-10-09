# Timegrid — project guide for Claude Code

Owner: Manmohan (non-programmer; explain in plain language, step by step, screenshots welcome).
Phone: Samsung Galaxy F15 5G (One UI). PC: Windows. Phone is the main device.

## What this is
Personal time manager. Vanilla HTML/CSS/JS PWA (no build step) on GitHub Pages
(repo `pR-aN-AV09/timegrid`), synced through Supabase (`tasks` table, last-edit-wins, soft delete).
Files: index.html, styles.css, app.js, native.js, sw.js, config.js (public keys only), vendor/supabase.js.
Never use or commit a Supabase secret/service_role key.

## Current goal: Android app with REAL alarms
Read `docs/ANDROID_ALARM_DESIGN.md` first. Summary: wrap the web app with Capacitor,
add a native plugin `TimegridAlarm` (Kotlin) that schedules AlarmManager alarms,
shows a full-screen alarm screen over the lock screen, rings loudly until the user
**slides to stop**, and survives reboot. The web side is already done (native.js + the
"Phone alarms" section in Settings + `alarmList()` in app.js). Native side is NOT written yet.

## Rules
- Do not change the web UI/behaviour in a normal browser; native code paths must be no-ops there.
- Bump `VERSION` in sw.js whenever any web file changes. Add new web files to SHELL and to scripts/sync-web.mjs.
- Web app must keep working offline; localStorage keys: tg_tasks, tg_dirty, tg_fired, tg_prefs.
- Build loop: `npm run sync` then run from Android Studio (phone connected by USB, debugging on).
- Verify Android API details against current developer.android.com before relying on them
  (exact-alarm permissions, full-screen intents, foreground-service types, background-start exemptions).
- Commit small, with clear messages. Do not push until the owner says so.
- Wait for the owner to say "build" before big new features beyond the alarm app.

## Deferred (keep in mind, don't build unprompted)
Export/import backup, Windows auto-save file, auto-delete old tombstones (60 days),
beautification (owner will share drawings/Figma), repeating tasks, overdue list, labels.
