import test from "node:test";
import assert from "node:assert/strict";

import { createStateDraftFromQuery, matchesStatePortSearch } from "./statePortCreateModel.ts";

test("matchesStatePortSearch matches state names keys and descriptions", () => {
  assert.equal(
    matchesStatePortSearch(
      {
        key: "review_notes",
        name: "Review Notes",
        description: "Freeform notes from human review.",
      },
      "review",
    ),
    true,
  );
  assert.equal(
    matchesStatePortSearch(
      {
        key: "review_notes",
        name: "Review Notes",
        description: "Freeform notes from human review.",
      },
      "freeform",
    ),
    true,
  );
  assert.equal(
    matchesStatePortSearch(
      {
        key: "review_notes",
        name: "Review Notes",
        description: "Freeform notes from human review.",
      },
      "answer",
    ),
    false,
  );
});

test("createStateDraftFromQuery creates a unique text state draft from the search query", () => {
  assert.deepEqual(createStateDraftFromQuery("Review Notes", ["review_notes"]), {
    key: "review_notes_2",
    definition: {
      name: "Review Notes",
      description: "",
      type: "text",
      value: "",
      color: "",
    },
  });
});

test("createStateDraftFromQuery keeps Chinese names while using side-specific machine keys", () => {
  assert.deepEqual(createStateDraftFromQuery("最终答案", [], { side: "output" }), {
    key: "output_1",
    definition: {
      name: "最终答案",
      description: "",
      type: "text",
      value: "",
      color: "",
    },
  });

  assert.equal(createStateDraftFromQuery("最终答案", ["output_1"], { side: "output" }).key, "output_2");
  assert.equal(createStateDraftFromQuery("用户问题", [], { side: "input" }).key, "input_1");
});
