package app.timegrid.personal;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Android forgets all alarms on reboot (and on app update); put the stored ones back. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        String a = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(a)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)
                || "android.intent.action.QUICKBOOT_POWERON".equals(a)) {
            AlarmScheduler.restore(ctx);
        }
    }
}
