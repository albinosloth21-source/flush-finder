# Flush Finder

Nearby restrooms on a satellite map, rated in toilets. Guests can browse. Confirmed accounts can review, add pins, and earn titles.

## Stack

- TanStack Start + React
- Leaflet satellite map
- Better Auth (email, Google, X)
- PGLite / Postgres
- Capacitor Android/iOS wrapper (`com.flushfinder.app`)

## Local

```bash
npm install
npm run dev
```

Zoom in (level 13+) to see pins.

## Play Store

See `native/store/listing.txt`. Open `android/` in Android Studio after setting `CAPACITOR_SERVER_URL` to the live site and running `npx cap sync android`.
