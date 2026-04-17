import assert from "node:assert/strict";
import test from "node:test";

import {
  applyConditionBranchMapping,
  listConditionBranchMappingKeys,
  parseConditionBranchMappingDraft,
} from "./node-system-condition-branch-mapping.ts";

test("listConditionBranchMappingKeys returns all mapping keys routed to the target branch", () => {
  assert.deepEqual(
    listConditionBranchMappingKeys(
      {
        true: "continue",
        yes: "continue",
        false: "retry",
      },
      "continue",
    ),
    ["true", "yes"],
  );
});

test("parseConditionBranchMappingDraft keeps distinct trimmed mapping tokens", () => {
  assert.deepEqual(parseConditionBranchMappingDraft(" true, false , true ,, maybe "), ["true", "false", "maybe"]);
});

test("applyConditionBranchMapping rewrites only the selected branch mappings", () => {
  assert.deepEqual(
    applyConditionBranchMapping(
      {
        true: "continue",
        false: "retry",
        maybe: "retry",
      },
      "continue",
      "continue",
      ["yes", "true"],
    ),
    {
      false: "retry",
      maybe: "retry",
      yes: "continue",
      true: "continue",
    },
  );
});
