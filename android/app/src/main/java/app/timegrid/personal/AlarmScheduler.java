package app.timegrid.personal;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

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

    /** Schedules one alarm. Throws SecurityException if exact alarms are not allowed. */
    public static void scheduleOne(Context ctx, int id, long atMs, String title, String body, int priority) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        Intent fire = new Intent(ctx, AlarmReceiver.class)
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
