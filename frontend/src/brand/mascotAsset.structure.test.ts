import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const mascotSource = readMascotAsset("mascot.svg");

function readMascotAsset(fileName: string): string {
  return readFileSync(resolve(currentDirectory, "../../public", fileName), "utf8");
}

function publicAssetExists(fileName: string): boolean {
  return existsSync(resolve(currentDirectory, "../../public", fileName));
}

function assertSharedMascotShape(source: string): void {
  assert.match(source, /width="640" height="560" viewBox="-260 -180 640 560"/);
  assert.doesNotMatch(source, /<circle\b/);
  assert.doesNotMatch(source, /<clipPath\b/);
  assert.doesNotMatch(source, /stroke="url\(#ringGold\)"/);
  assert.match(source, /id="mascotTail"[\s\S]*stroke-width="38"/);
  assert.doesNotMatch(source, /stroke-width="30"/);
  assert.doesNotMatch(source, /C260 156 314 112 322 48/);
  assert.doesNotMatch(source, /C330 -18 282 -58 238 -42/);
  assert.doesNotMatch(source, /C210 -30 216 2 250 8"/);
  assert.match(source, /id="mascotSparkle"[\s\S]*d="M0-150/);
  assert.match(source, /C18-101 5-88 0-62/);
  assert.match(source, /id="mascotHead"[\s\S]*C226 208 145 264 0 264/);
  assert.match(source, /<ellipse cx="-80" cy="82" rx="24" ry="52" fill="url\(#eyeGold\)"\/>/);
  assert.match(source, /<ellipse cx="80" cy="82" rx="24" ry="52" fill="url\(#eyeGold\)"\/>/);
}

test("brand mascot keeps the simple short-tail variant as the only public mascot asset", () => {
  assertSharedMascotShape(mascotSource);
  assert.match(mascotSource, /A simple short-tail variant/);
  assert.match(mascotSource, /d="M206 154/);
  assert.match(mascotSource, /C240 154 268 136 282 108"/);
  assert.doesNotMatch(mascotSource, /A short curled-tail variant/);
  assert.doesNotMatch(mascotSource, /C246 156 284 130 296 90/);
  assert.doesNotMatch(mascotSource, /C306 56 288 26 258 28/);
  assert.doesNotMatch(mascotSource, /C236 30 232 54 254 60"/);
  assert.equal(publicAssetExists("mascot-curl.svg"), false);
  assert.equal(publicAssetExists("mascot-simple.svg"), false);
});
