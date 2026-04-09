from __future__ import annotations

from typing import Any

from app.templates.creative_factory.handlers import get_creative_factory_supported_node_types
from app.templates.creative_factory.state import get_creative_factory_state_keys, get_creative_factory_state_schema
from app.templates.creative_factory.themes import get_creative_factory_theme_presets


def _create_node(
    *,
    node_id: str,
    node_type: str,
    label: str,
    x: int,
    y: int,
    reads: list[str] | None = None,
    writes: list[str] | None = None,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    params = params or {}
    return {
        "id": node_id,
        "type": node_type,
        "label": label,
        "position": {"x": x, "y": y},
        "reads": reads or [],
        "writes": writes or [],
        "params": params,
        "config": dict(params),
        "implementation": {
            "executor": "node_handler",
            "handler_key": node_type,
            "tool_keys": [],
        },
    }


def _create_edge(
    *,
    edge_id: str,
    source: str,
    target: str,
    flow_keys: list[str],
    edge_kind: str = "normal",
    branch_label: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": edge_id,
        "source": source,
        "target": target,
        "flow_keys": flow_keys,
        "edge_kind": edge_kind,
    }
    if branch_label is not None:
        payload["branch_label"] = branch_label
    return payload


def _apply_node_param_overrides(nodes: list[dict[str, Any]], overrides: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    next_nodes: list[dict[str, Any]] = []
    for node in nodes:
        node_overrides = overrides.get(node["id"], {})
        if not node_overrides:
            next_nodes.append(node)
            continue
        merged_params = {**node["params"], **node_overrides}
        next_nodes.append(
            {
                **node,
                "params": merged_params,
                "config": dict(merged_params),
            }
        )
    return next_nodes


def _create_default_graph(theme_preset: dict[str, Any]) -> dict[str, Any]:
    base_nodes = [
        _create_node(node_id="start_1", node_type="start", label="Start", x=40, y=220, writes=["theme_config"]),
        _create_node(
            node_id="research_1",
            node_type="research",
            label="Research",
            x=240,
            y=80,
            reads=["theme_config"],
            writes=["market_inputs"],
            params={"sources": ["rss", "ad_library"]},
        ),
        _create_node(
            node_id="collect_assets_1",
            node_type="collect_assets",
            label="Collect Assets",
            x=240,
            y=260,
            reads=["theme_config"],
            writes=["market_inputs"],
            params={"sourcePreset": "ad_library"},
        ),
        _create_node(
            node_id="normalize_assets_1",
            node_type="normalize_assets",
            label="Normalize Assets",
            x=460,
            y=260,
            reads=["market_inputs"],
            writes=["market_inputs"],
        ),
        _create_node(
            node_id="select_assets_1",
            node_type="select_assets",
            label="Select Assets",
            x=680,
            y=260,
            reads=["market_inputs"],
            writes=["selected_video_items"],
            params={"top_n": 2},
        ),
        _create_node(
            node_id="analyze_assets_1",
            node_type="analyze_assets",
            label="Analyze Assets",
            x=900,
            y=260,
            reads=["selected_video_items"],
            writes=["video_analysis_results"],
        ),
        _create_node(
            node_id="extract_patterns_1",
            node_type="extract_patterns",
            label="Extract Patterns",
            x=1120,
            y=260,
            reads=["video_analysis_results"],
            writes=["pattern_summary"],
        ),
        _create_node(
            node_id="build_brief_1",
            node_type="build_brief",
            label="Build Brief",
            x=1340,
            y=260,
            reads=["theme_config", "market_inputs", "pattern_summary"],
            writes=["creative_brief"],
        ),
        _create_node(
            node_id="generate_variants_1",
            node_type="generate_variants",
            label="Generate Variants",
            x=1580,
            y=260,
            reads=["theme_config", "creative_brief"],
            writes=["script_variants"],
            params={"variantCount": 3},
        ),
        _create_node(
            node_id="generate_storyboards_1",
            node_type="generate_storyboards",
            label="Storyboards",
            x=1800,
            y=180,
            reads=["script_variants"],
            writes=["storyboard_packages"],
        ),
        _create_node(
            node_id="generate_video_prompts_1",
            node_type="generate_video_prompts",
            label="Video Prompts",
            x=1800,
            y=340,
            reads=["script_variants", "storyboard_packages"],
            writes=["video_prompt_packages"],
        ),
        _create_node(
            node_id="review_variants_1",
            node_type="review_variants",
            label="Review",
            x=2020,
            y=260,
            reads=["creative_brief", "script_variants"],
            writes=["best_variant", "evaluation_result"],
            params={"scoreThreshold": 7.8},
        ),
        _create_node(
            node_id="condition_1",
            node_type="condition",
            label="Condition",
            x=2240,
            y=260,
            reads=["evaluation_result"],
            params={"decision_key": "evaluation_result.decision"},
        ),
        _create_node(
            node_id="prepare_image_todo_1",
            node_type="prepare_image_todo",
            label="Image TODO",
            x=2460,
            y=180,
            reads=["best_variant", "storyboard_packages"],
            writes=["image_generation_todo"],
        ),
        _create_node(
            node_id="prepare_video_todo_1",
            node_type="prepare_video_todo",
            label="Video TODO",
            x=2460,
            y=340,
            reads=["best_variant", "video_prompt_packages"],
            writes=["video_generation_todo"],
        ),
        _create_node(
            node_id="finalize_1",
            node_type="finalize",
            label="Finalize",
            x=2680,
            y=260,
            reads=["evaluation_result", "best_variant", "storyboard_packages", "video_prompt_packages", "image_generation_todo", "video_generation_todo"],
            writes=["final_package"],
        ),
        _create_node(
            node_id="end_1",
            node_type="end",
            label="End",
            x=2900,
            y=260,
            reads=["final_package", "evaluation_result"],
        ),
    ]
    nodes = _apply_node_param_overrides(base_nodes, theme_preset.get("node_param_overrides", {}))
    return {
        "name": theme_preset.get("graph_name") or "Creative Factory",
        "template_id": "creative_factory",
        "theme_config": theme_preset["theme_config"],
        "state_schema": get_creative_factory_state_schema(),
        "nodes": nodes,
        "edges": [
            _create_edge(edge_id="edge_1", source="start_1", target="research_1", flow_keys=["theme_config"]),
            _create_edge(edge_id="edge_2", source="research_1", target="collect_assets_1", flow_keys=["market_inputs"]),
            _create_edge(edge_id="edge_3", source="collect_assets_1", target="normalize_assets_1", flow_keys=["market_inputs"]),
            _create_edge(edge_id="edge_4", source="normalize_assets_1", target="select_assets_1", flow_keys=["market_inputs"]),
            _create_edge(edge_id="edge_5", source="select_assets_1", target="analyze_assets_1", flow_keys=["selected_video_items"]),
            _create_edge(edge_id="edge_6", source="analyze_assets_1", target="extract_patterns_1", flow_keys=["video_analysis_results"]),
            _create_edge(edge_id="edge_7", source="extract_patterns_1", target="build_brief_1", flow_keys=["pattern_summary"]),
            _create_edge(edge_id="edge_8", source="build_brief_1", target="generate_variants_1", flow_keys=["creative_brief"]),
            _create_edge(edge_id="edge_9", source="generate_variants_1", target="generate_storyboards_1", flow_keys=["script_variants"]),
            _create_edge(edge_id="edge_10", source="generate_storyboards_1", target="generate_video_prompts_1", flow_keys=["storyboard_packages"]),
            _create_edge(edge_id="edge_11", source="generate_video_prompts_1", target="review_variants_1", flow_keys=["video_prompt_packages"]),
            _create_edge(edge_id="edge_12", source="review_variants_1", target="condition_1", flow_keys=["evaluation_result", "best_variant"]),
            _create_edge(edge_id="edge_13", source="condition_1", target="prepare_image_todo_1", flow_keys=["evaluation_result", "best_variant"], edge_kind="branch", branch_label="pass"),
            _create_edge(edge_id="edge_14", source="prepare_image_todo_1", target="prepare_video_todo_1", flow_keys=["image_generation_todo"]),
            _create_edge(edge_id="edge_15", source="prepare_video_todo_1", target="finalize_1", flow_keys=["video_generation_todo"]),
            _create_edge(edge_id="edge_16", source="condition_1", target="generate_variants_1", flow_keys=["evaluation_result"], edge_kind="branch", branch_label="revise"),
            _create_edge(edge_id="edge_17", source="condition_1", target="end_1", flow_keys=["evaluation_result"], edge_kind="branch", branch_label="fail"),
            _create_edge(edge_id="edge_18", source="finalize_1", target="end_1", flow_keys=["final_package"]),
        ],
        "metadata": {},
    }


def _create_default_node_system_graph(theme_preset: dict[str, Any]) -> dict[str, Any]:
    return {
        "graph_family": "node_system",
        "name": f"{theme_preset.get('graph_name') or 'Creative Factory'} Review Flow",
        "template_id": "creative_factory",
        "theme_config": theme_preset["theme_config"],
        "state_schema": get_creative_factory_state_schema(),
        "nodes": [
            {
                "id": "input_1",
                "type": "default",
                "position": {"x": 80, "y": 220},
                "data": {
                    "nodeId": "input_1",
                    "config": {
                        "presetId": "preset.input.task_input.v1",
                        "label": "Task Input",
                        "description": "Describe the market research task for the creative workflow.",
                        "family": "input",
                        "valueType": "text",
                        "output": {
                            "key": "task_input",
                            "label": "Task Input",
                            "valueType": "text",
                        },
                        "defaultValue": "Research current SLG mobile ad market hooks and summarize reusable signals.",
                        "inputMode": "inline",
                        "placeholder": "Describe the research task",
                    },
                    "previewText": "",
                },
            },
            {
                "id": "agent_fetch_1",
                "type": "default",
                "position": {"x": 540, "y": 220},
                "data": {
                    "nodeId": "agent_fetch_1",
                    "config": {
                        "presetId": "preset.agent.fetch_market_news_context.v1",
                        "label": "Fetch Market News",
                        "description": "Collect raw market news and trend signals for the current creative research task.",
                        "family": "agent",
                        "inputs": [
                            {
                                "key": "task_input",
                                "label": "Task Input",
                                "valueType": "text",
                                "required": True,
                            }
                        ],
                        "outputs": [
                            {
                                "key": "rss_items",
                                "label": "RSS Items",
                                "valueType": "json",
                            }
                        ],
                        "systemInstruction": "You are a research collection agent.",
                        "taskInstruction": "Collect raw market news and trend references for the provided task.",
                        "skills": [
                            {
                                "name": "fetch_market_news",
                                "skillKey": "fetch_market_news_context",
                                "inputMapping": {
                                    "task_input": "$inputs.task_input",
                                },
                                "contextBinding": {},
                                "usage": "required",
                            }
                        ],
                        "responseMode": "json",
                        "outputBinding": {
                            "rss_items": "$skills.fetch_market_news.rss_items",
                        },
                    },
                    "previewText": "",
                },
            },
            {
                "id": "agent_clean_1",
                "type": "default",
                "position": {"x": 1000, "y": 220},
                "data": {
                    "nodeId": "agent_clean_1",
                    "config": {
                        "presetId": "preset.agent.clean_market_news.v1",
                        "label": "Clean Market News",
                        "description": "Normalize raw market news and produce a compact research context.",
                        "family": "agent",
                        "inputs": [
                            {
                                "key": "rss_items",
                                "label": "RSS Items",
                                "valueType": "json",
                                "required": True,
                            }
                        ],
                        "outputs": [
                            {
                                "key": "clean_news_items",
                                "label": "Clean News Items",
                                "valueType": "json",
                            },
                            {
                                "key": "news_context",
                                "label": "News Context",
                                "valueType": "text",
                            }
                        ],
                        "systemInstruction": "You are a research normalization agent.",
                        "taskInstruction": "Normalize fetched news into cleaned items and a concise text context.",
                        "skills": [
                            {
                                "name": "clean_market_news",
                                "skillKey": "clean_market_news",
                                "inputMapping": {
                                    "rss_items": "$inputs.rss_items",
                                },
                                "contextBinding": {},
                                "usage": "required",
                            }
                        ],
                        "responseMode": "json",
                        "outputBinding": {
                            "clean_news_items": "$skills.clean_market_news.clean_news_items",
                            "news_context": "$skills.clean_market_news.news_context",
                        },
                    },
                    "previewText": "",
                },
            },
            {
                "id": "agent_brief_1",
                "type": "default",
                "position": {"x": 1460, "y": 220},
                "data": {
                    "nodeId": "agent_brief_1",
                    "config": {
                        "presetId": "preset.agent.build_creative_brief.v1",
                        "label": "Build Creative Brief",
                        "description": "Assemble a concise creative brief from task input and cleaned research context.",
                        "family": "agent",
                        "inputs": [
                            {
                                "key": "task_input",
                                "label": "Task Input",
                                "valueType": "text",
                                "required": True,
                            },
                            {
                                "key": "news_context",
                                "label": "News Context",
                                "valueType": "text",
                                "required": True,
                            },
                        ],
                        "outputs": [
                            {
                                "key": "creative_brief",
                                "label": "Creative Brief",
                                "valueType": "text",
                            }
                        ],
                        "systemInstruction": "You are a creative strategy agent.",
                        "taskInstruction": "Build a concise creative brief from the task and research context.",
                        "skills": [
                            {
                                "name": "build_creative_brief",
                                "skillKey": "build_creative_brief",
                                "inputMapping": {
                                    "task_input": "$inputs.task_input",
                                    "news_context": "$inputs.news_context",
                                    "theme_config": "$graph.theme_config",
                                },
                                "contextBinding": {},
                                "usage": "required",
                            }
                        ],
                        "responseMode": "json",
                        "outputBinding": {
                            "creative_brief": "$skills.build_creative_brief.creative_brief",
                        },
                    },
                    "previewText": "",
                },
            },
            {
                "id": "output_1",
                "type": "default",
                "position": {"x": 1900, "y": 120},
                "data": {
                    "nodeId": "output_1",
                    "config": {
                        "presetId": "preset.output.creative_brief.v1",
                        "label": "Creative Brief Output",
                        "description": "Preview the generated creative brief for downstream creative steps.",
                        "family": "output",
                        "input": {
                            "key": "value",
                            "label": "Creative Brief",
                            "valueType": "text",
                            "required": True,
                        },
                        "displayMode": "auto",
                        "persistEnabled": False,
                        "persistFormat": "txt",
                        "fileNameTemplate": "creative_brief",
                    },
                    "previewText": "",
                },
            },
            {
                "id": "agent_variants_1",
                "type": "default",
                "position": {"x": 1900, "y": 360},
                "data": {
                    "nodeId": "agent_variants_1",
                    "config": {
                        "presetId": "preset.agent.generate_creative_variants.v1",
                        "label": "Generate Creative Variants",
                        "description": "Generate structured creative variants from the current task and brief.",
                        "family": "agent",
                        "inputs": [
                            {"key": "task_input", "label": "Task Input", "valueType": "text", "required": True},
                            {"key": "creative_brief", "label": "Creative Brief", "valueType": "text", "required": True},
                        ],
                        "outputs": [
                            {"key": "script_variants", "label": "Script Variants", "valueType": "json"},
                        ],
                        "systemInstruction": "You are a creative variant generator.",
                        "taskInstruction": "Generate structured creative variants from the task and brief.",
                        "skills": [
                            {
                                "name": "generate_creative_variants",
                                "skillKey": "generate_creative_variants",
                                "inputMapping": {
                                    "task_input": "$inputs.task_input",
                                    "creative_brief": "$inputs.creative_brief",
                                    "theme_config": "$graph.theme_config",
                                },
                                "contextBinding": {},
                                "usage": "required",
                            }
                        ],
                        "responseMode": "json",
                        "outputBinding": {
                            "script_variants": "$skills.generate_creative_variants.script_variants",
                        },
                    },
                    "previewText": "",
                },
            },
            {
                "id": "agent_review_1",
                "type": "default",
                "position": {"x": 2360, "y": 360},
                "data": {
                    "nodeId": "agent_review_1",
                    "config": {
                        "presetId": "preset.agent.review_creative_variants.v1",
                        "label": "Review Creative Variants",
                        "description": "Review generated variants and produce an evaluation result.",
                        "family": "agent",
                        "inputs": [
                            {"key": "task_input", "label": "Task Input", "valueType": "text", "required": True},
                            {"key": "creative_brief", "label": "Creative Brief", "valueType": "text", "required": True},
                            {"key": "script_variants", "label": "Script Variants", "valueType": "json", "required": True},
                        ],
                        "outputs": [
                            {"key": "evaluation_result", "label": "Evaluation Result", "valueType": "json"},
                            {"key": "best_variant", "label": "Best Variant", "valueType": "json"},
                            {"key": "revision_feedback", "label": "Revision Feedback", "valueType": "json"},
                        ],
                        "systemInstruction": "You are a creative review agent.",
                        "taskInstruction": "Review generated variants and return pass or revise guidance.",
                        "skills": [
                            {
                                "name": "review_creative_variants",
                                "skillKey": "review_creative_variants",
                                "inputMapping": {
                                    "task_input": "$inputs.task_input",
                                    "creative_brief": "$inputs.creative_brief",
                                    "script_variants": "$inputs.script_variants",
                                    "theme_config": "$graph.theme_config",
                                },
                                "contextBinding": {},
                                "usage": "required",
                            }
                        ],
                        "responseMode": "json",
                        "outputBinding": {
                            "evaluation_result": "$skills.review_creative_variants.evaluation_result",
                            "best_variant": "$skills.review_creative_variants.best_variant",
                            "revision_feedback": "$skills.review_creative_variants.revision_feedback",
                        },
                    },
                    "previewText": "",
                },
            },
            {
                "id": "condition_1",
                "type": "default",
                "position": {"x": 2820, "y": 360},
                "data": {
                    "nodeId": "condition_1",
                    "config": {
                        "presetId": "preset.condition.review_gate.v1",
                        "label": "Review Gate",
                        "description": "Route the flow according to the review decision.",
                        "family": "condition",
                        "inputs": [
                            {"key": "review_result", "label": "Review Result", "valueType": "json", "required": True},
                        ],
                        "branches": [
                            {"key": "pass", "label": "Pass"},
                            {"key": "revise", "label": "Revise"},
                        ],
                        "conditionMode": "rule",
                        "rule": {
                            "source": "$inputs.review_result.decision",
                            "operator": "==",
                            "value": "pass",
                        },
                        "branchMapping": {
                            "true": "pass",
                            "false": "revise",
                        },
                    },
                    "previewText": "",
                },
            },
            {
                "id": "output_pass_1",
                "type": "default",
                "position": {"x": 3280, "y": 240},
                "data": {
                    "nodeId": "output_pass_1",
                    "config": {
                        "presetId": "preset.output.decision_signal.v1",
                        "label": "Pass Output",
                        "description": "Show the pass branch signal when review succeeds.",
                        "family": "output",
                        "input": {"key": "value", "label": "Decision Signal", "valueType": "any", "required": True},
                        "displayMode": "auto",
                        "persistEnabled": False,
                        "persistFormat": "txt",
                        "fileNameTemplate": "review_pass",
                    },
                    "previewText": "",
                },
            },
            {
                "id": "output_revise_1",
                "type": "default",
                "position": {"x": 3280, "y": 480},
                "data": {
                    "nodeId": "output_revise_1",
                    "config": {
                        "presetId": "preset.output.decision_signal.v1",
                        "label": "Revise Output",
                        "description": "Show the revise branch signal when review asks for changes.",
                        "family": "output",
                        "input": {"key": "value", "label": "Decision Signal", "valueType": "any", "required": True},
                        "displayMode": "auto",
                        "persistEnabled": False,
                        "persistFormat": "txt",
                        "fileNameTemplate": "review_revise",
                    },
                    "previewText": "",
                },
            },
        ],
        "edges": [
            {
                "id": "edge_1",
                "source": "input_1",
                "target": "agent_fetch_1",
                "sourceHandle": "output:task_input",
                "targetHandle": "input:task_input",
            },
            {
                "id": "edge_2",
                "source": "agent_fetch_1",
                "target": "agent_clean_1",
                "sourceHandle": "output:rss_items",
                "targetHandle": "input:rss_items",
            },
            {
                "id": "edge_3",
                "source": "agent_clean_1",
                "target": "agent_brief_1",
                "sourceHandle": "output:news_context",
                "targetHandle": "input:news_context",
            },
            {
                "id": "edge_4",
                "source": "input_1",
                "target": "agent_brief_1",
                "sourceHandle": "output:task_input",
                "targetHandle": "input:task_input",
            },
            {
                "id": "edge_5",
                "source": "agent_brief_1",
                "target": "output_1",
                "sourceHandle": "output:creative_brief",
                "targetHandle": "input:value",
            },
            {
                "id": "edge_6",
                "source": "input_1",
                "target": "agent_variants_1",
                "sourceHandle": "output:task_input",
                "targetHandle": "input:task_input",
            },
            {
                "id": "edge_7",
                "source": "agent_brief_1",
                "target": "agent_variants_1",
                "sourceHandle": "output:creative_brief",
                "targetHandle": "input:creative_brief",
            },
            {
                "id": "edge_8",
                "source": "input_1",
                "target": "agent_review_1",
                "sourceHandle": "output:task_input",
                "targetHandle": "input:task_input",
            },
            {
                "id": "edge_9",
                "source": "agent_brief_1",
                "target": "agent_review_1",
                "sourceHandle": "output:creative_brief",
                "targetHandle": "input:creative_brief",
            },
            {
                "id": "edge_10",
                "source": "agent_variants_1",
                "target": "agent_review_1",
                "sourceHandle": "output:script_variants",
                "targetHandle": "input:script_variants",
            },
            {
                "id": "edge_11",
                "source": "agent_review_1",
                "target": "condition_1",
                "sourceHandle": "output:evaluation_result",
                "targetHandle": "input:review_result",
            },
            {
                "id": "edge_12",
                "source": "condition_1",
                "target": "output_pass_1",
                "sourceHandle": "output:pass",
                "targetHandle": "input:value",
            },
            {
                "id": "edge_13",
                "source": "condition_1",
                "target": "output_revise_1",
                "sourceHandle": "output:revise",
                "targetHandle": "input:value",
            },
        ],
        "metadata": {},
    }


def get_creative_factory_template() -> dict[str, Any]:
    theme_presets = get_creative_factory_theme_presets()
    default_theme_preset = "slg_launch"
    default_theme = next((preset for preset in theme_presets if preset["id"] == default_theme_preset), theme_presets[0])
    return {
        "template_id": "creative_factory",
        "label": "Creative Factory",
        "description": "Research, analyze, generate, review, and export a creative package.",
        "default_graph_name": "Creative Factory",
        "default_theme_preset": default_theme_preset,
        "supported_node_types": get_creative_factory_supported_node_types(),
        "state_keys": get_creative_factory_state_keys(),
        "state_schema": get_creative_factory_state_schema(),
        "theme_presets": theme_presets,
        "default_graph": _create_default_graph(default_theme),
        "default_node_system_graph": _create_default_node_system_graph(default_theme),
    }
