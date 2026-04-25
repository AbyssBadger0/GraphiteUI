from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app


class SettingsModelProviderTests(unittest.TestCase):
    def test_discovers_openai_compatible_models_from_base_url(self) -> None:
        with patch(
            "app.api.routes_settings.discover_provider_models",
            return_value=["gemma-4-26b-a4b-it", "huihui-gemma-4-26b-a4b-it-abliterated"],
        ) as discover:
            with TestClient(app) as client:
                response = client.post(
                    "/api/settings/model-providers/discover",
                    json={
                        "base_url": "http://127.0.0.1:8888/v1",
                        "api_key": "sk-local",
                    },
                )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "models": [
                    "gemma-4-26b-a4b-it",
                    "huihui-gemma-4-26b-a4b-it-abliterated",
                ]
            },
        )
        discover.assert_called_once_with(
            provider_id="custom",
            transport="openai-compatible",
            base_url="http://127.0.0.1:8888/v1",
            api_key="sk-local",
            auth_header="Authorization",
            auth_scheme="Bearer",
        )

    def test_discovery_endpoint_dispatches_anthropic_transport(self) -> None:
        with patch("app.api.routes_settings.discover_provider_models", return_value=["claude-sonnet-4-5"]) as discover:
            with TestClient(app) as client:
                response = client.post(
                    "/api/settings/model-providers/discover",
                    json={
                        "provider_id": "anthropic",
                        "transport": "anthropic-messages",
                        "base_url": "https://api.anthropic.com/v1",
                        "api_key": "sk-ant",
                        "auth_header": "x-api-key",
                        "auth_scheme": "",
                    },
                )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"models": ["claude-sonnet-4-5"]})
        discover.assert_called_once_with(
            provider_id="anthropic",
            transport="anthropic-messages",
            base_url="https://api.anthropic.com/v1",
            api_key="sk-ant",
            auth_header="x-api-key",
            auth_scheme="",
        )

    def test_update_settings_preserves_existing_api_key_when_blank(self) -> None:
        existing_settings = {
            "model_providers": {
                "openai": {
                    "label": "OpenAI",
                    "transport": "openai-compatible",
                    "base_url": "https://api.openai.com/v1",
                    "api_key": "sk-existing",
                    "enabled": True,
                    "auth_header": "Authorization",
                    "auth_scheme": "Bearer",
                    "models": [{"model": "gpt-4.1", "label": "GPT 4.1"}],
                }
            }
        }
        saved_payload: dict = {}

        def capture_save(payload: dict) -> dict:
            saved_payload.update(payload)
            return payload

        with patch("app.api.routes_settings.load_app_settings", return_value=existing_settings):
            with patch("app.api.routes_settings.save_app_settings", side_effect=capture_save):
                with patch("app.api.routes_settings._build_settings_payload", return_value={"ok": True}):
                    with TestClient(app) as client:
                        response = client.post(
                            "/api/settings",
                            json={
                                "model": {
                                    "text_model_ref": "openai/gpt-4.1",
                                    "video_model_ref": "openai/gpt-4.1",
                                },
                                "agent_runtime_defaults": {
                                    "model": "openai/gpt-4.1",
                                    "thinking_enabled": False,
                                    "temperature": 0.2,
                                },
                                "model_providers": {
                                    "openai": {
                                        "label": "OpenAI",
                                        "transport": "openai-compatible",
                                        "base_url": "https://api.openai.com/v1",
                                        "api_key": "",
                                        "enabled": True,
                                        "auth_header": "Authorization",
                                        "auth_scheme": "Bearer",
                                        "models": [{"model": "gpt-4.1", "label": "GPT 4.1", "modalities": ["text"]}],
                                    }
                                },
                            },
                        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(saved_payload["model_providers"]["openai"]["api_key"], "sk-existing")
        self.assertTrue(saved_payload["model_providers"]["openai"]["enabled"])
        self.assertEqual(saved_payload["model_providers"]["openai"]["transport"], "openai-compatible")


if __name__ == "__main__":
    unittest.main()
