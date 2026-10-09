package app.timegrid.personal;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;

/** Called by AlarmManager at the alarm time; hands over to AlarmService, which does the ringing. */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        Intent svc = new Intent(ctx, AlarmService.class)
                .setAction(AlarmService.ACTION_RING)
                .putExtras(intent);
        ContextCompat.startForegroundService(ctx, svc);
    }
}
