/**
 * Writes public/.well-known/assetlinks.json from native/production-url.json.
 * That JSON file is the only production URL. Android release reads it directly.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const configPath = resolve(root, "native/production-url.json");
const outPath = resolve(root, "public/.well-known/assetlinks.json");

/**
 * @param {string} [raw]
 */
export function loadProductionConfig(raw = readFileSync(configPath, "utf8")) {
  const config = JSON.parse(raw);
  const productionUrl = String(config.productionUrl ?? "").trim().replace(/\/$/, "");
  const host = String(config.host ?? "").trim().toLowerCase();
  const packageId = String(config.packageId ?? "").trim();
  /** @type {unknown[]} */
  const rawPrints = Array.isArray(config.sha256CertFingerprints) ? config.sha256CertFingerprints : [];
  const fingerprints = rawPrints.map((item) => String(item).trim()).filter(Boolean);
  const url = new URL(productionUrl);
  if (url.protocol !== "https:") throw new Error("productionUrl must be https");
  if (url.host !== host) throw new Error(`host (${host}) must match productionUrl host (${url.host})`);
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(packageId)) {
    throw new Error(`packageId is not an Android application id: ${packageId}`);
  }
  if (fingerprints.length === 0) throw new Error("sha256CertFingerprints needs at least one entry");
  return { productionUrl, host, packageId, fingerprints, appName: String(config.appName ?? "Flush Finder") };
}

/**
 * @param {{ packageId: string, fingerprints: string[] }} config
 */
export function assetLinksDocument(config) {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: config.packageId,
        sha256_cert_fingerprints: config.fingerprints,
      },
    },
  ];
}

function main() {
  const config = loadProductionConfig();
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(assetLinksDocument(config), null, 2)}\n`);
  process.stdout.write(`Wrote ${outPath} for ${config.host}\n`);
}

if (process.argv[1] && process.argv[1].endsWith("sync-twa-config.mjs")) main();
