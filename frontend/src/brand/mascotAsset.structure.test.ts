import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const mascotSource = readMascotAsset("mascot.svg");
const curlMascotSource = readMascotAsset("mascot-curl.svg");
const simpleMascotSource = readMascotAsset("mascot-simple.svg");

function readMascotAsset(fileName: string): string {
  return readFileSync(resolve(currentDirectory, "../../public", fileName), "utf8");
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

test("brand mascot default asset stays aligned with the short curled-tail version", () => {
  assert.equal(mascotSource, curlMascotSource);
});

test("brand mascot curled-tail asset is short, thick, and ends outside the cat head", () => {
  assertSharedMascotShape(curlMascotSource);
  assert.match(curlMascotSource, /A short curled-tail variant/);
  assert.match(curlMascotSource, /d="M206 154/);
  assert.match(curlMascotSource, /C246 156 284 130 296 90/);
  assert.match(curlMascotSource, /C306 56 288 26 258 28/);
  assert.match(curlMascotSource, /C236 30 232 54 254 60"/);
});

test("brand mascot simple-tail asset only reveals a compact tail cue", () => {
  assertSharedMascotShape(simpleMascotSource);
  assert.match(simpleMascotSource, /A simple short-tail variant/);
  assert.match(simpleMascotSource, /d="M206 154/);
  assert.match(simpleMascotSource, /C240 154 268 136 282 108"/);
  assert.doesNotMatch(simpleMascotSource, /C306 56 288 26 258 28/);
  assert.doesNotMatch(simpleMascotSource, /C236 30 232 54 254 60"/);
});
