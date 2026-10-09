# Timegrid — project guide for Claude Code

Owner: Manmohan (non-programmer; explain in plain language, step by step, screenshots welcome).
Phone: Samsung Galaxy F15 5G (One UI). PC: Windows. Phone is the main device.

## What this is
Personal time manager. Vanilla HTML/CSS/JS PWA (no build step) on GitHub Pages
(repo `pR-aN-AV09/timegrid`), synced through Supabase (`tasks` table, last-edit-wins, soft delete).
Files: index.html, styles.css, app.js, native.js, sw.js, config.js (public keys only), vendor/supabase.js.
Never use or commit a Supabase secret/service_role key.

## Status (2026-10-09): Android alarm app DONE and tested on the owner's phone
Design: `docs/ANDROID_ALARM_DESIGN.md`. Native code is Java (not Kotlin) in
android/app/src/main/java/app/timegrid/personal/: TimegridAlarmPlugin (schedule, cancelAll, getStatus,
openSettings, pickSound, testAlarm [dev only, no UI button]), AlarmScheduler (setAlarmClock), AlarmStore
(SharedPreferences list + chosen sound), AlarmReceiver -> AlarmService (systemExempted foreground service,
looping USAGE_ALARM sound + vibration, full-screen notification), AlarmActivity + SlideToStopView,
BootReceiver, MainActivity (registers plugin; Back calls window.tgBack()).
- native.js must use `Capacitor.Plugins.TimegridAlarm` (no build step, so `registerPlugin` doesn't exist).
- "Appear on top" (SYSTEM_ALERT_WINDOW) lets the alarm screen take over while the phone is in use.
- In the app, catch-up reminder pop-ups are skipped while phone alarms are on (`nativeAlarmsOn()`).
- Task field `remBefore` (0/5/10/15/30/60 min): one alarm before the deadline; on the deadline day it is the
  last of the daily reminders. Tasks without it keep identical reminder times (keep it that way).
- Known gap the owner accepted: after a phone restart, alarms are reliably back once the app has been opened.
- Build/install from the shell: see the memory notes (JDK 21 via D:\gradle\gradle.properties, adb install -r).

## Tester release 1.0-beta (2026-10-10): built, installed and tested on the owner's phone
- Signed with D:\timegrid-keys (timegrid-release.jks + keystore.properties; outside git, owner backs it up).
  app/build.gradle reads it; `gradlew assembleRelease` -> copy to D:\timegrid-release\Timegrid-<version>.apk.
  For each tester update bump versionCode (+1) and versionName; same key, testers install over the old app.
  Debug and release builds have different signatures: switching needs an uninstall.
- Owner kept the default Capacitor icon (white launch screen); a redesigned icon comes with the UI redesign.
- Added: first-run setup guide (native only; Settings > Phone alarms > Setup guide; test-alarm button stays
  hidden by owner's choice), notification permission pop-up, number wheels (frequency 0-20, days 0-30),
  forgot-password (email link opens the web app, which shows a "new password" box), dashboard date picker,
  reminders card follows the dashboard's selected day, sync pill opens Account and sync.
- Supabase: "Confirm email" off; Site URL / redirect = https://pr-an-av09.github.io/timegrid/.
- Tester texts: D:\timegrid-release\Tester-instructions.txt and Feedback-form-questions.txt.

## Next
1. Share with 2-3 testers + Google Form; collect feedback.
2. UI/UX redesign (owner will share references/Figma; offer mockups before changing code).

## Rules
- Do not change the web UI/behaviour in a normal browser; native code paths must be no-ops there.
- Bump `VERSION` in sw.js whenever any web file changes. Add new web files to SHELL and to scripts/sync-web.mjs.
- Web app must keep working offline; localStorage keys: tg_tasks, tg_dirty, tg_fired, tg_prefs.
- Build loop: `npm run sync`, then build + install (Android Studio Run, or gradlew assembleDebug + adb install -r).
- Test each step on the phone and wait for the owner's result before the next step; commit after it passes.
- Verify Android API details against current developer.android.com before relying on them
  (exact-alarm permissions, full-screen intents, foreground-service types, background-start exemptions).
- Commit small, with clear messages. Do not push until the owner says so.
- Wait for the owner to say "build" before big new features.

## Deferred (keep in mind, don't build unprompted)
Export/import backup, Windows auto-save file, auto-delete old tombstones (60 days),
beautification (owner will share drawings/Figma), repeating tasks, overdue list, labels.
