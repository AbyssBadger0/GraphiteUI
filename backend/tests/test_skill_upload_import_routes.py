from __future__ import annotations

from contextlib import ExitStack, contextmanager
from io import BytesIO
from pathlib import Path
import tempfile
import unittest
import zipfile
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


def _skill_markdown(skill_key: str = "uploaded_zip_skill") -> str:
    return f"""---
name: Uploaded Skill
description: Imported from an uploaded archive.
graphite:
  skill_key: {skill_key}
  supported_value_types:
    - text
  side_effects: []
  input_schema:
    - key: text
      label: Text
      valueType: text
      required: true
      description: Source text.
  output_schema:
    - key: result
      label: Result
      valueType: text
      description: Imported result.
---
Imported skill body.
"""


def _patch_skill_storage(skills_dir: Path, state_dir: Path):
    return (
        patch("app.core.storage.skill_store.GRAPHITE_SKILLS_DIR", skills_dir),
        patch("app.core.storage.skill_store.SKILL_STATE_DATA_DIR", state_dir),
        patch("app.core.storage.skill_store.SKILL_STATE_PATH", state_dir / "registry_states.json"),
        patch("app.skills.definitions.GRAPHITE_SKILLS_DIR", skills_dir),
    )


@contextmanager
def _test_client_with_skill_storage(skills_dir: Path, state_dir: Path):
    with ExitStack() as stack:
        for patcher in _patch_skill_storage(skills_dir, state_dir):
            stack.enter_context(patcher)
        yield stack.enter_context(TestClient(app))


def _skill_zip_bytes() -> bytes:
    payload = BytesIO()
    with zipfile.ZipFile(payload, "w") as archive:
        archive.writestr("uploaded_zip_skill/SKILL.md", _skill_markdown())
        archive.writestr("uploaded_zip_skill/helper.py", "print('helper')\n")
    return payload.getvalue()


class SkillUploadImportRouteTests(unittest.TestCase):
    def test_zip_archive_upload_imports_skill_into_managed_catalog(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            skills_dir = temp_path / "skill"
            state_dir = temp_path / "data" / "skills"
            with _test_client_with_skill_storage(skills_dir, state_dir) as client:
                response = client.post(
                    "/api/skills/imports/upload",
                    files=[("files", ("uploaded_zip_skill.zip", _skill_zip_bytes(), "application/zip"))],
                )

                self.assertEqual(response.status_code, 200)
                payload = response.json()
                self.assertEqual(payload["skillKey"], "uploaded_zip_skill")
                self.assertEqual(payload["status"], "active")
                self.assertTrue(payload["canManage"])
                self.assertFalse(payload["canImport"])
                self.assertEqual(payload["sourceScope"], "graphite_managed")

                imported_path = skills_dir / "claude_code" / "uploaded_zip_skill" / "SKILL.md"
                self.assertTrue(imported_path.exists())
                self.assertTrue((skills_dir / "claude_code" / "uploaded_zip_skill" / "helper.py").exists())

                catalog_response = client.get("/api/skills/catalog?include_disabled=true")
                self.assertEqual(catalog_response.status_code, 200)
                self.assertIn("uploaded_zip_skill", [item["skillKey"] for item in catalog_response.json()])

    def test_folder_upload_imports_skill_using_browser_relative_paths(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            skills_dir = temp_path / "skill"
            state_dir = temp_path / "data" / "skills"
            with _test_client_with_skill_storage(skills_dir, state_dir) as client:
                response = client.post(
                    "/api/skills/imports/upload",
                    data={
                        "relativePaths": [
                            "uploaded_folder_skill/SKILL.md",
                            "uploaded_folder_skill/helper.py",
                        ],
                    },
                    files=[
                        ("files", ("SKILL.md", _skill_markdown("uploaded_folder_skill"), "text/markdown")),
                        ("files", ("helper.py", "print('helper')\n", "text/x-python")),
                    ],
                )

                self.assertEqual(response.status_code, 200)
                payload = response.json()
                self.assertEqual(payload["skillKey"], "uploaded_folder_skill")
                self.assertTrue((skills_dir / "claude_code" / "uploaded_folder_skill" / "SKILL.md").exists())
                self.assertTrue((skills_dir / "claude_code" / "uploaded_folder_skill" / "helper.py").exists())


if __name__ == "__main__":
    unittest.main()
