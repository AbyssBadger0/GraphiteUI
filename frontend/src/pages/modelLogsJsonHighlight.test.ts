import test from "node:test";
import assert from "node:assert/strict";

import { highlightJson } from "./modelLogsJsonHighlight.ts";

test("highlightJson renders JSON string line breaks as visible line breaks", () => {
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

  assert.match(html, /hello<span class="model-logs-page__json-line-break" aria-hidden="true">↵<\/span><br>world/);
  assert.match(html, /hello\\\\nworld/);
  assert.match(html, /&lt;strong&gt;safe&lt;\/strong&gt;/);
  assert.doesNotMatch(html, /<strong>safe<\/strong>/);
});
