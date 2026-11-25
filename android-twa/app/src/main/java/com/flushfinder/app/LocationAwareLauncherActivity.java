package com.flushfinder.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

/**
 * Requests this app's runtime location permission while LauncherActivity is still visible.
 *
 * A verified TWA delegates {@code navigator.geolocation} to {@link DelegationService}, not
 * Chrome's site permission. The library then starts {@code PermissionRequestActivity} from that
 * service — and on targetSdk 35+ Android blocks that as a background activity launch once this
 * launcher has finished. Asking here first means Chrome can use an already-granted permission.
 */
public class LocationAwareLauncherActivity extends LauncherActivity {
    private static final int REQUEST_LOCATION = 0x4C4F43; // "LOC"
    private static final String[] LOCATION_PERMISSIONS = {
        Manifest.permission.ACCESS_COARSE_LOCATION,
        Manifest.permission.ACCESS_FINE_LOCATION,
    };

    @Override
    protected boolean shouldLaunchImmediately() {
        return hasLocationAccess();
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (isFinishing() || hasLocationAccess()) return;
        // Recreated mid-prompt: wait for onRequestPermissionsResult instead of stacking dialogs.
        if (savedInstanceState != null) return;
        ActivityCompat.requestPermissions(this, LOCATION_PERMISSIONS, REQUEST_LOCATION);
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQUEST_LOCATION || isFinishing()) return;
        // Launch whether granted or denied; the site can fall back to a manual pin.
        launchTwa();
    }

    private boolean hasLocationAccess() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
                == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
    }
}
