package app.timegrid.personal;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/** Puts alarms into Android's AlarmManager. setAlarmClock is exact, survives Doze and shows the alarm icon. */
public final class AlarmScheduler {
    public static final String EXTRA_ID = "id";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_BODY = "body";
    public static final String EXTRA_PRIORITY = "priority";

    private AlarmScheduler() {}

    public static boolean canScheduleExact(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        return am != null && am.canScheduleExactAlarms();
    }

    /**
     * Replaces all scheduled alarms with this list (JSON objects with id, at, title, body, priority),
     * cancels the ones that are no longer in it, and stores it for rescheduling after a reboot.
     * Alarms in the past are skipped. Returns how many were scheduled.
     */
    public static int replaceAll(Context ctx, JSONArray alarms) {
        long now = System.currentTimeMillis();
        JSONArray kept = new JSONArray();
        Set<Integer> keep = new HashSet<>();
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject a = alarms.optJSONObject(i);
            if (a == null || a.optLong("at") <= now) continue;
            kept.put(a);
            keep.add(a.optInt("id"));
        }
        JSONArray old = AlarmStore.load(ctx);
        for (int i = 0; i < old.length(); i++) {
            JSONObject a = old.optJSONObject(i);
            if (a != null && !keep.contains(a.optInt("id"))) cancelOne(ctx, a.optInt("id"));
        }
        for (int i = 0; i < kept.length(); i++) {
            JSONObject a = kept.optJSONObject(i);
            scheduleOne(ctx, a.optInt("id"), a.optLong("at"), a.optString("title", "Reminder"),
                    a.optString("body", ""), a.optInt("priority", 5));
        }
        AlarmStore.save(ctx, kept);
        return kept.length();
    }

    public static void cancelAll(Context ctx) {
        JSONArray old = AlarmStore.load(ctx);
        for (int i = 0; i < old.length(); i++) {
            JSONObject a = old.optJSONObject(i);
            if (a != null) cancelOne(ctx, a.optInt("id"));
        }
        AlarmStore.save(ctx, new JSONArray());
    }

    /** Re-registers the stored alarms (AlarmManager forgets everything on reboot). */
    public static int restore(Context ctx) {
        if (!canScheduleExact(ctx)) return 0;
        return replaceAll(ctx, AlarmStore.load(ctx));
    }

    private static Intent fireIntent(Context ctx) {
        return new Intent(ctx, AlarmReceiver.class);
    }

    public static void cancelOne(Context ctx, int id) {
        PendingIntent pi = PendingIntent.getBroadcast(ctx, id, fireIntent(ctx),
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (pi != null) {
            ctx.getSystemService(AlarmManager.class).cancel(pi);
            pi.cancel();
        }
    }

    /** Schedules one alarm. Throws SecurityException if exact alarms are not allowed. */
    public static void scheduleOne(Context ctx, int id, long atMs, String title, String body, int priority) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        Intent fire = fireIntent(ctx)
                .putExtra(EXTRA_ID, id)
                .putExtra(EXTRA_TITLE, title)
                .putExtra(EXTRA_BODY, body)
                .putExtra(EXTRA_PRIORITY, priority);
        PendingIntent operation = PendingIntent.getBroadcast(ctx, id, fire,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        // What opens when the user taps the alarm icon in the status bar.
        PendingIntent show = PendingIntent.getActivity(ctx, 0, new Intent(ctx, MainActivity.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.setAlarmClock(new AlarmManager.AlarmClockInfo(atMs, show), operation);
    }
}
