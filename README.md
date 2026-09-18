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

## Nationwide gas stations and grocery stores

The full US catalogs live in [`src/data/parts/`](src/data/parts/) (split so GitHub can host them):

- 108,230 gas stations
- 15,187 grocery stores

The app also reads `src/data/us-gas-stations.json.gz` / `us-grocery-stores.json` when those files are present locally. Rebuild map tiles with:

```bash
node scripts/build-poi-tiles.mjs
```

## Play Store

See `native/store/listing.txt`. Open `android/` in Android Studio after setting `CAPACITOR_SERVER_URL` to the live site and running `npx cap sync android`.

### "Made with Grok" banner (do not delete the app)

That pill is **not** Flush Finder. It is loaded from:

- [`scripts/grok-pwa-shared.mjs`](scripts/grok-pwa-shared.mjs) — search for `MADE WITH GROK BANNER` and `extensions.js`
- [`vite.config.ts`](vite.config.ts) — `grokPwaPlugin()`

Before a Play Store build, stop loading `extensions.js`. Do **not** delete `src/`, `android/`, `docs/`, or this whole `grok-pwa-shared.mjs` file.
