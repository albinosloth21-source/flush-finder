package com.flushfinder.app;

import com.google.androidbrowserhelper.locationdelegation.LocationDelegationExtraCommandHandler;

/**
 * Lets Chrome ask this app for location while the Trusted Web Activity is open.
 * Digital Asset Links must verify the origin or Chrome will ignore the service.
 */
public class DelegationService extends com.google.androidbrowserhelper.trusted.DelegationService {
    @Override
    public void onCreate() {
        super.onCreate();
        registerExtraCommandHandler(new LocationDelegationExtraCommandHandler());
    }
}
