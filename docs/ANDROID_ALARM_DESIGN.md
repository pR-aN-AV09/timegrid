# Android alarm design

## Behaviour
- Every reminder (random times per task/day, computed identically on all devices) becomes an alarm on the phone.
- At the alarm time: ring loudly (alarm volume, even in silent/DND-alarm rules as allowed), vibrate, wake the screen,
  show a full-screen screen over the lock screen with task title, body, priority and a **slide-to-stop** control.
  No plain "tap to dismiss" button. Keep ringing until slid. (Optional later: snooze.)
- Works with the app closed and after reboot.
- Setting "Ring an alarm for every reminder" (default on). Possible later: priority threshold.

## Web ↔ native contract (plugin `TimegridAlarm`, already called by native.js)
- `schedule({alarms:[{id:int,at:epochMs,title,body,priority}]})` → `{scheduled:n}`. REPLACES all alarms. Persist the list
  (SharedPreferences/JSON) so it can be rescheduled after boot. Cancel previous ones not in the new list.
- `cancelAll()`
- `getStatus()` → `{exactAlarmAllowed, fullScreenAllowed, batteryOptimizationIgnored, notificationsAllowed, scheduledCount}`
- `openSettings({page:'exactAlarm'|'fullScreen'|'battery'|'notifications'})` opens the matching system screen.
- `testAlarm({delaySeconds})` fires a sample alarm.
The web app sends a rolling ~14-day window (max 400 alarms; AlarmManager has an approx. 500 cap) on every task change,
app start and app resume. Tasks added on the PC reach phone alarms only once the phone app is opened (acceptable v1;
later option: native WorkManager sync or FCM).

## Native pieces to write (Kotlin, in android/app/src/main/java/app/timegrid/personal/)
1. `TimegridAlarmPlugin` (Capacitor plugin, register in MainActivity).
2. `AlarmScheduler` using `AlarmManager.setAlarmClock` (shows alarm icon, exempt from Doze) with a PendingIntent to `AlarmReceiver`.
3. `AlarmReceiver` → starts `AlarmService` (foreground service, plays looping `USAGE_ALARM` sound + vibration, posts a
   high-importance notification with a full-screen intent to `AlarmActivity`).
4. `AlarmActivity`: `setShowWhenLocked(true)`, `setTurnScreenOn(true)`, slide-to-stop control; stopping stops the service and cancels the notification.
5. `BootReceiver` (BOOT_COMPLETED, also MY_PACKAGE_REPLACED) reschedules from the persisted list.
Manifest permissions to evaluate: USE_EXACT_ALARM (auto-granted, fine for a sideloaded personal app) or SCHEDULE_EXACT_ALARM
fallback, USE_FULL_SCREEN_INTENT, POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, WAKE_LOCK, VIBRATE,
FOREGROUND_SERVICE + FOREGROUND_SERVICE_MEDIA_PLAYBACK (or the type that Android currently allows when an alarm starts a service
from the background — VERIFY the background foreground-service-start exemptions for alarms in current docs).

## Samsung Galaxy F15 5G (One UI) — user steps, show these in the app's Settings if possible
- Settings > Apps > Timegrid > Battery > Unrestricted.
- Settings > Battery > Background usage limits > Never sleeping apps > + Add Timegrid; remove it from Sleeping/Deep sleeping apps.
- Turn off "Put unused apps to sleep".
- Allow notifications, "Alarms & reminders", and full-screen notifications for Timegrid.

## Setup commands (project root)
```
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android
npm run sync            # copies web files to android-www
npx cap add android     # first time only
npx cap open android    # opens Android Studio
```

## Test plan
1. Test alarm button with screen on, screen off, locked, phone on silent, app swiped away.
2. Real reminder 2 minutes ahead; phone locked.
3. Reboot phone, confirm alarms still fire.
4. Change a task on the PC, open phone app, confirm alarms update.
5. Slide-to-stop stops sound and vibration; accidental tap does nothing.
6. Normal browser/GitHub Pages version still works unchanged.
