package app.timegrid.personal;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.window.OnBackInvokedDispatcher;

/** Full-screen alarm shown over the lock screen. The only way out that stops the alarm is the slider. */
public class AlarmActivity extends Activity {
    private TextView title, body, prio;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        float d = getResources().getDisplayMetrics().density;
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setBackgroundColor(0xFF101418);
        int pad = (int) (28 * d);
        root.setPadding(pad, (int) (96 * d), pad, (int) (64 * d));

        TextView label = text(15, 0xFF9AA4AE, false);
        label.setText("Timegrid alarm");
        title = text(30, Color.WHITE, true);
        body = text(17, 0xFFD0D6DC, false);
        prio = text(15, 0xFFFFB74D, true);

        LinearLayout.LayoutParams gap = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        gap.topMargin = (int) (16 * d);
        root.addView(label);
        root.addView(title, gap);
        root.addView(body, gap);
        root.addView(prio, gap);

        android.view.View spacer = new android.view.View(this);
        root.addView(spacer, new LinearLayout.LayoutParams(1, 0, 1f));

        SlideToStopView slider = new SlideToStopView(this);
        slider.setOnSlid(this::stopAlarm);
        root.addView(slider, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        setContentView(root);
        blockBack();
        show(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        show(intent);
    }

    private void show(Intent i) {
        String t = i.getStringExtra(AlarmScheduler.EXTRA_TITLE);
        title.setText(t == null ? "Reminder" : t);
        String b = i.getStringExtra(AlarmScheduler.EXTRA_BODY);
        body.setText(b == null ? "" : b);
        prio.setText("Priority " + i.getIntExtra(AlarmScheduler.EXTRA_PRIORITY, 5));
    }

    private TextView text(int sp, int color, boolean bold) {
        TextView v = new TextView(this);
        v.setTextSize(sp);
        v.setTextColor(color);
        v.setGravity(Gravity.CENTER_HORIZONTAL);
        if (bold) v.setTypeface(Typeface.DEFAULT_BOLD);
        return v;
    }

    private void stopAlarm() {
        startService(new Intent(this, AlarmService.class).setAction(AlarmService.ACTION_STOP));
        finishAndRemoveTask();
    }

    // Back must not silence or close the alarm; only the slider does.
    private void blockBack() {
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, () -> {});
        }
    }

    @Override
    @SuppressWarnings("MissingSuperCall")
    public void onBackPressed() {}
}
