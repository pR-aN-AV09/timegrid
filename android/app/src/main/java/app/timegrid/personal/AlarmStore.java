package app.timegrid.personal;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** The scheduled alarm list, kept on the phone so it can be rescheduled after a reboot or app update. */
public final class AlarmStore {
    private static final String PREFS = "timegrid_alarms";
    private static final String KEY = "alarms";

    private AlarmStore() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static synchronized JSONArray load(Context ctx) {
        try {
            return new JSONArray(prefs(ctx).getString(KEY, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    public static synchronized void save(Context ctx, JSONArray alarms) {
        prefs(ctx).edit().putString(KEY, alarms.toString()).apply();
    }

    /** Drops one alarm (after it has rung) so the count stays right and it isn't rescheduled at boot. */
    public static synchronized void remove(Context ctx, int id) {
        JSONArray all = load(ctx), kept = new JSONArray();
        for (int i = 0; i < all.length(); i++) {
            JSONObject a = all.optJSONObject(i);
            if (a != null && a.optInt("id") != id) kept.put(a);
        }
        save(ctx, kept);
    }
}
