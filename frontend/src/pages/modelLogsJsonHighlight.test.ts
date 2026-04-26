import test from "node:test";
import assert from "node:assert/strict";

import { highlightJson } from "./modelLogsJsonHighlight.ts";

test("highlightJson renders JSON string line breaks as aligned multiline string blocks", () => {
  const html = highlightJson(
    JSON.stringify(
      {
        content: "hello\nworld",
        literal: "hello\\nworld",
        html: "<strong>safe</strong>",
      },
      null,
      2,
    ),
  );

  assert.match(html, /model-logs-page__json-string--multiline/);
  assert.match(html, /model-logs-page__json-string-lines/);
  assert.match(html, /<span class="model-logs-page__json-string-line">hello<\/span>/);
  assert.match(html, /<span class="model-logs-page__json-string-line">world<\/span>/);
  assert.doesNotMatch(html, /model-logs-page__json-line-break|<br>/);
  assert.match(html, /hello\\\\nworld/);
  assert.match(html, /&lt;strong&gt;safe&lt;\/strong&gt;/);
  assert.doesNotMatch(html, /<strong>safe<\/strong>/);
});
