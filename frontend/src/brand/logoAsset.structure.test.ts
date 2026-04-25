import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const logoSource = readFileSync(resolve(currentDirectory, "../../public/logo.svg"), "utf8");

test("brand logo uses the gold ring as the exact icon boundary", () => {
  assert.match(logoSource, /width="512" height="512" viewBox="-256 -256 512 512"/);
  assert.doesNotMatch(logoSource, /<rect\b/);
  assert.match(logoSource, /<circle cx="0" cy="0" r="240" fill="url\(#paper\)"\/>/);
  assert.match(logoSource, /<clipPath id="innerWindow">\s*<circle cx="0" cy="0" r="240"\/>\s*<\/clipPath>/);
  assert.match(logoSource, /<circle cx="0" cy="0" r="248" fill="none" stroke="url\(#ringGold\)" stroke-width="16"\/>/);
});

test("brand logo includes a centered gold sparkle above the cat head", () => {
  assert.match(logoSource, /<path\s+id="logoSparkle"\s+fill="url\(#ringGold\)"\s+d="M0-224/);
  assert.match(logoSource, /C15-192 7-184 0-164/);
  assert.match(logoSource, /C-15-196-7-204 0-224Z"/);
});
