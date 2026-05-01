import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const componentSource = readFileSync(resolve(currentDirectory, "FloatingStatePortPill.vue"), "utf8").replace(/\r\n/g, "\n");

test("FloatingStatePortPill owns drag preview pill presentation", () => {
  assert.match(componentSource, /<Teleport to="body">/);
  assert.match(componentSource, /v-if="floatingPort"/);
  assert.match(componentSource, /:style="floatingStyle"/);
  assert.match(componentSource, /'node-card__port-pill--input': floatingPort\.side === 'input'/);
  assert.match(componentSource, /'node-card__port-pill--output': floatingPort\.side === 'output'/);
  assert.match(componentSource, /floatingPort\.port\.label/);
  assert.match(componentSource, /node-card__port-pill-anchor-slot--leading/);
});

test("FloatingStatePortPill carries floating pill geometry styles", () => {
  assert.match(componentSource, /\.node-card__port-pill \{[\s\S]*display:\s*inline-flex;/);
  assert.match(componentSource, /\.node-card__port-pill--floating \{[\s\S]*position:\s*fixed;/);
  assert.match(componentSource, /\.node-card__port-pill--floating \{[\s\S]*z-index:\s*5000;/);
  assert.match(componentSource, /\.node-card__port-pill--removable\.node-card__port-pill--input \{[\s\S]*padding-right:\s*39px;/);
  assert.match(componentSource, /\.node-card__port-pill--removable\.node-card__port-pill--output \{[\s\S]*padding-left:\s*39px;/);
  assert.doesNotMatch(componentSource, /text-overflow:\s*ellipsis;/);
});
