import test from "node:test";
import assert from "node:assert/strict";

import { buildStatePanelViewModel } from "./statePanelViewModel.ts";

test("buildStatePanelViewModel returns sorted state rows with readable values", () => {
  const view = buildStatePanelViewModel({
    beta: {
      name: "",
      description: "Second field.",
      type: "text",
      value: { ok: true },
      color: "#000000",
    },
    alpha: {
      name: "Question",
      description: "Primary question.",
      type: "text",
      value: "What is GraphiteUI?",
      color: "#ffffff",
    },
  });

  assert.equal(view.count, 2);
  assert.deepEqual(
    view.rows.map((row) => ({ key: row.key, title: row.title, typeLabel: row.typeLabel })),
    [
      { key: "alpha", title: "Question", typeLabel: "text" },
      { key: "beta", title: "beta", typeLabel: "text" },
    ],
  );
  assert.equal(view.rows[0].valuePreview, "What is GraphiteUI?");
  assert.match(view.rows[1].valuePreview, /"ok": true/);
});

test("buildStatePanelViewModel reports empty state cleanly", () => {
  const view = buildStatePanelViewModel({});
  assert.equal(view.count, 0);
  assert.equal(view.emptyTitle, "No State Yet");
  assert.equal(view.emptyBody, "Graph state objects will appear here once the graph defines them.");
});
