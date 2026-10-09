package app.timegrid.personal;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Native side of window.TGNative (see native.js). */
@CapacitorPlugin(
    name = "TimegridAlarm",
    permissions = { @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications") }
)
public class TimegridAlarmPlugin extends Plugin {
    static final int TEST_ALARM_ID = 0; // web alarm ids are always >= 1

    /** Replaces all alarms with the list from the web app (rolling ~14-day window). */
    @PluginMethod
    public void schedule(PluginCall call) {
        JSArray alarms = call.getArray("alarms", new JSArray());
        if (!AlarmScheduler.canScheduleExact(getContext())) {
            call.reject("Exact alarms are not allowed for Timegrid");
            return;
        }
        try {
            int n = AlarmScheduler.replaceAll(getContext(), alarms);
            JSObject ret = new JSObject();
            ret.put("scheduled", n);
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("Exact alarms are not allowed for Timegrid", e);
        }
    }

    @PluginMethod
    public void cancelAll(PluginCall call) {
        AlarmScheduler.cancelAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void testAlarm(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "testAlarmAfterPermission");
            return;
        }
        scheduleTest(call);
    }

    @PermissionCallback
    private void testAlarmAfterPermission(PluginCall call) {
        // Ring even if notifications were refused: sound and vibration still work, only the screen won't pop up.
        scheduleTest(call);
    }

    private void scheduleTest(PluginCall call) {
        Context ctx = getContext();
        if (!AlarmScheduler.canScheduleExact(ctx)) {
            call.reject("Exact alarms are not allowed for Timegrid");
            return;
        }
        int delay = Math.max(1, call.getInt("delaySeconds", 10));
        long at = System.currentTimeMillis() + delay * 1000L;
        try {
            AlarmScheduler.scheduleOne(ctx, TEST_ALARM_ID, at, "Test alarm",
                    "This is how Timegrid alarms ring. Slide to stop.", 1);
        } catch (SecurityException e) {
            call.reject("Exact alarms are not allowed for Timegrid", e);
            return;
        }
        JSObject ret = new JSObject();
        ret.put("at", at);
        call.resolve(ret);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        Context ctx = getContext();
        JSObject ret = new JSObject();
        ret.put("exactAlarmAllowed", AlarmScheduler.canScheduleExact(ctx));
        boolean fullScreen = true;
        if (Build.VERSION.SDK_INT >= 34) {
            fullScreen = ctx.getSystemService(NotificationManager.class).canUseFullScreenIntent();
        }
        ret.put("fullScreenAllowed", fullScreen);
        ret.put("overlayAllowed", Settings.canDrawOverlays(ctx));
        ret.put("notificationsAllowed", NotificationManagerCompat.from(ctx).areNotificationsEnabled());
        PowerManager pm = ctx.getSystemService(PowerManager.class);
        ret.put("batteryOptimizationIgnored", pm.isIgnoringBatteryOptimizations(ctx.getPackageName()));
        ret.put("scheduledCount", AlarmStore.load(ctx).length());
        ret.put("soundName", soundName(ctx));
        call.resolve(ret);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Context ctx = getContext();
        String pkg = ctx.getPackageName();
        Uri pkgUri = Uri.parse("package:" + pkg);
        String page = call.getString("page", "");
        Intent i;
        if ("exactAlarm".equals(page) && Build.VERSION.SDK_INT >= 31) {
            i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, pkgUri);
        } else if ("fullScreen".equals(page) && Build.VERSION.SDK_INT >= 34) {
            i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pkgUri);
        } else if ("overlay".equals(page)) {
            i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, pkgUri);
        } else if ("notifications".equals(page) && Build.VERSION.SDK_INT >= 26) {
            i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, pkg);
        } else if ("batteryRequest".equals(page)) {
            // Android's own "Let app always run in background? Allow / Deny" pop-up.
            i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, pkgUri);
        } else {
            // Battery (and fallback): the app's info page, where Samsung has Battery > Unrestricted.
            i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkgUri);
        }
        // Resolves when the user comes back, so the page can refresh its switches.
        try {
            startActivityForResult(call, i, "settingsClosed");
        } catch (Exception e) {
            startActivityForResult(call, new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkgUri), "settingsClosed");
        }
    }

    @ActivityCallback
    private void settingsClosed(PluginCall call, ActivityResult result) {
        call.resolve();
    }

    /** Opens Android's alarm-sound list; the choice is used for every Timegrid alarm. */
    @PluginMethod
    public void pickSound(PluginCall call) {
        Context ctx = getContext();
        String current = AlarmStore.sound(ctx);
        Intent i = new Intent(RingtoneManager.ACTION_RINGTONE_PICKER)
                .putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM)
                .putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Timegrid alarm sound")
                .putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
                .putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
                .putExtra(RingtoneManager.EXTRA_RINGTONE_DEFAULT_URI, Settings.System.DEFAULT_ALARM_ALERT_URI)
                .putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI,
                        current == null ? Settings.System.DEFAULT_ALARM_ALERT_URI : Uri.parse(current));
        startActivityForResult(call, i, "soundPicked");
    }

    @ActivityCallback
    private void soundPicked(PluginCall call, ActivityResult result) {
        Intent data = result.getData();
        if (result.getResultCode() == Activity.RESULT_OK && data != null) {
            Uri u = data.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI);
            // "Default" (or nothing) means: follow the phone's default alarm sound.
            boolean followDefault = u == null || Settings.System.DEFAULT_ALARM_ALERT_URI.equals(u);
            AlarmStore.setSound(getContext(), followDefault ? null : u.toString());
        }
        JSObject ret = new JSObject();
        ret.put("soundName", soundName(getContext()));
        call.resolve(ret);
    }

    static String soundName(Context ctx) {
        String picked = AlarmStore.sound(ctx);
        Uri u = picked == null ? AlarmService.defaultAlarmSound(ctx) : Uri.parse(picked);
        try {
            Ringtone r = RingtoneManager.getRingtone(ctx, u);
            String title = r == null ? null : r.getTitle(ctx);
            if (title != null) return picked == null ? title + " (phone default)" : title;
        } catch (Exception ignored) {}
        return picked == null ? "Phone default" : "Custom sound";
    }
}
