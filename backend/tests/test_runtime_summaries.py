from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.runtime.runtime_summaries import summarize_inputs, summarize_outputs


class RuntimeSummariesTests(unittest.TestCase):
    def test_summarize_inputs_handles_empty_and_truncates_values(self) -> None:
        self.assertEqual(summarize_inputs({}), "no inputs")
        summary = summarize_inputs({"long": "x" * 120, "short": "ok"})

        self.assertIn("long", summary)
        self.assertIn("short", summary)
        self.assertLessEqual(len(summary), 160)

    def test_summarize_outputs_prefers_final_result_then_outputs(self) -> None:
        self.assertEqual(summarize_outputs({"answer": "from-output"}, "final"), "final")
        self.assertEqual(summarize_outputs({}, ""), "no outputs")
        summary = summarize_outputs({"answer": "x" * 120}, "")

        self.assertIn("answer", summary)
        self.assertLessEqual(len(summary), 160)


if __name__ == "__main__":
    unittest.main()
