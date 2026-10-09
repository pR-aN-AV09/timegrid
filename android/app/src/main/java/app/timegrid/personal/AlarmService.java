package app.timegrid.personal;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.provider.Settings;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Rings an alarm: loops the alarm sound on the alarm volume, vibrates, and posts a
 * full-screen notification that opens AlarmActivity over the lock screen.
 * Keeps going until AlarmActivity sends ACTION_STOP (slide to stop).
 */
public class AlarmService extends Service {
    public static final String ACTION_RING = "app.timegrid.personal.RING";
    public static final String ACTION_STOP = "app.timegrid.personal.STOP";
    static final String CHANNEL_ID = "timegrid_alarms";
    static final int NOTIF_ID = 4711;

    private MediaPlayer player;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            stopRinging();
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }
        String title = intent.getStringExtra(AlarmScheduler.EXTRA_TITLE);
        String body = intent.getStringExtra(AlarmScheduler.EXTRA_BODY);
        int priority = intent.getIntExtra(AlarmScheduler.EXTRA_PRIORITY, 5);

        Intent open = alarmScreen(title, body, priority);
        Notification n = buildNotification(title, body, open);
        if (Build.VERSION.SDK_INT >= 34) {
            ServiceCompat.startForeground(this, NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED);
        } else {
            startForeground(NOTIF_ID, n);
        }
        startRinging(); // no-op if already ringing; a second alarm just replaces the text
        // With "Appear on top" allowed, take over the screen even while the phone is in use.
        // Without it, Android shows the full-screen notification as a banner instead.
        if (Settings.canDrawOverlays(this)) {
            try { startActivity(open); } catch (Exception ignored) {}
        }
        return START_NOT_STICKY;
    }

    private Intent alarmScreen(String title, String body, int priority) {
        return new Intent(this, AlarmActivity.class)
                .putExtra(AlarmScheduler.EXTRA_TITLE, title)
                .putExtra(AlarmScheduler.EXTRA_BODY, body)
                .putExtra(AlarmScheduler.EXTRA_PRIORITY, priority)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
    }

    private Notification buildNotification(String title, String body, Intent open) {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Alarms", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Ringing Timegrid alarms");
            ch.setSound(null, null);       // the service plays the sound itself, on the alarm volume
            ch.enableVibration(false);     // and vibrates itself
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
        PendingIntent full = PendingIntent.getActivity(this, 1, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(title == null ? "Timegrid alarm" : title)
                .setContentText(body == null ? "Open to slide and stop" : body)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentIntent(full)
                .setFullScreenIntent(full, true)
                .build();
    }

    private void startRinging() {
        if (player != null) return;
        PowerManager pm = getSystemService(PowerManager.class);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "timegrid:ringing");
        wakeLock.acquire(60 * 60 * 1000L); // safety cap: 1 hour

        AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(attrs);
            player.setDataSource(this, alarmSound());
            player.setLooping(true);
            player.prepare();
            player.start();
        } catch (Exception e) {
            if (player != null) player.release();
            player = null;
        }

        if (Build.VERSION.SDK_INT >= 31) {
            vibrator = getSystemService(VibratorManager.class).getDefaultVibrator();
        } else {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        }
        if (vibrator != null && vibrator.hasVibrator()) {
            long[] pattern = {0, 800, 600};
            if (Build.VERSION.SDK_INT >= 26) vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0), attrs);
            else vibrator.vibrate(pattern, 0, attrs);
        }
    }

    private Uri alarmSound() {
        Uri u = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM);
        if (u == null) u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (u == null) u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        return u;
    }

    private void stopRinging() {
        if (player != null) {
            try { player.stop(); } catch (Exception ignored) {}
            player.release();
            player = null;
        }
        if (vibrator != null) { vibrator.cancel(); vibrator = null; }
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        wakeLock = null;
    }

    @Override
    public void onDestroy() {
        stopRinging();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
