package app.timegrid.personal;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.view.MotionEvent;
import android.view.View;

/**
 * "Slide to stop" control. Only a drag that starts on the knob counts, and it must reach
 * the right end; anything less springs back. Taps anywhere do nothing.
 */
public class SlideToStopView extends View {
    public interface OnSlid { void onSlid(); }

    private static final float DONE_AT = 0.9f;
    private final Paint track = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint knob = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint label = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF rect = new RectF();
    private final float density;
    private float pos;          // 0..1 knob position
    private float grabOffset;   // where on the knob the finger is
    private boolean dragging, done;
    private OnSlid listener;

    public SlideToStopView(Context ctx) {
        super(ctx);
        density = ctx.getResources().getDisplayMetrics().density;
        track.setColor(0x33FFFFFF);
        knob.setColor(0xFFFFFFFF);
        label.setColor(0xCCFFFFFF);
        label.setTextSize(18 * density);
        label.setTextAlign(Paint.Align.CENTER);
        setContentDescription("Slide to stop alarm");
    }

    public void setOnSlid(OnSlid l) { listener = l; }

    private float knobSize() { return getHeight() - 8 * density; }
    private float travel() { return getWidth() - getHeight(); }
    private float knobLeft() { return 4 * density + pos * travel(); }

    @Override
    protected void onMeasure(int w, int h) {
        setMeasuredDimension(MeasureSpec.getSize(w), (int) (72 * density));
    }

    @Override
    protected void onDraw(Canvas c) {
        float r = getHeight() / 2f;
        rect.set(0, 0, getWidth(), getHeight());
        c.drawRoundRect(rect, r, r, track);
        label.setAlpha((int) (204 * (1 - pos)));
        c.drawText("Slide to stop  ›››", getWidth() / 2f + r / 2, r - (label.descent() + label.ascent()) / 2, label);
        float k = knobSize();
        float left = knobLeft();
        c.drawCircle(left + k / 2, r, k / 2, knob);
    }

    @Override
    public boolean onTouchEvent(MotionEvent e) {
        if (done) return true;
        float x = e.getX();
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                float left = knobLeft();
                if (x < left || x > left + knobSize()) return false; // not on the knob: ignore
                dragging = true;
                grabOffset = x - left;
                getParent().requestDisallowInterceptTouchEvent(true);
                return true;
            case MotionEvent.ACTION_MOVE:
                if (!dragging) return false;
                pos = Math.max(0, Math.min(1, (x - grabOffset - 4 * density) / travel()));
                invalidate();
                return true;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                if (!dragging) return false;
                dragging = false;
                if (pos >= DONE_AT && e.getActionMasked() == MotionEvent.ACTION_UP) {
                    done = true;
                    pos = 1;
                    invalidate();
                    if (listener != null) listener.onSlid();
                } else {
                    springBack();
                }
                return true;
        }
        return false;
    }

    private void springBack() {
        ValueAnimator a = ValueAnimator.ofFloat(pos, 0);
        a.setDuration(250);
        a.addUpdateListener(v -> { pos = (float) v.getAnimatedValue(); invalidate(); });
        a.start();
    }
}
