from __future__ import annotations

from app.core.schemas.skills import SkillDefinition, SkillIoField, SkillSideEffect


SKILL_DEFINITIONS: list[SkillDefinition] = [
    SkillDefinition(
        skillKey="generate_hello_greeting",
        label="Generate Hello Greeting",
        description="Generate a short greeting string from a provided name.",
        inputSchema=[
            SkillIoField(
                key="name",
                label="Name",
                valueType="text",
                required=True,
                description="Name to greet.",
            )
        ],
        outputSchema=[
            SkillIoField(
                key="greeting",
                label="Greeting",
                valueType="text",
                description="Generated greeting text.",
            )
        ],
        supportedValueTypes=["text"],
        sideEffects=[SkillSideEffect.MODEL_CALL],
    ),
    SkillDefinition(
        skillKey="search_docs",
        label="Search Docs",
        description="Search the local knowledge base and return concise matching references.",
        inputSchema=[
            SkillIoField(
                key="query",
                label="Query",
                valueType="text",
                required=True,
                description="Natural-language search query.",
            )
        ],
        outputSchema=[
            SkillIoField(
                key="results",
                label="Results",
                valueType="json",
                description="Matched knowledge records with title, summary, and source.",
            )
        ],
        supportedValueTypes=["text", "json"],
        sideEffects=[SkillSideEffect.KNOWLEDGE_READ],
    ),
    SkillDefinition(
        skillKey="evaluate_output",
        label="Evaluate Output",
        description="Evaluate generated content and return score, issues, and suggestions.",
        inputSchema=[
            SkillIoField(
                key="content",
                label="Content",
                valueType="text",
                required=True,
                description="Content to evaluate.",
            )
        ],
        outputSchema=[
            SkillIoField(key="score", label="Score", valueType="json", description="Evaluation score."),
            SkillIoField(key="issues", label="Issues", valueType="json", description="List of detected issues."),
            SkillIoField(
                key="suggestions",
                label="Suggestions",
                valueType="json",
                description="Improvement suggestions for the evaluated content.",
            ),
        ],
        supportedValueTypes=["text", "json"],
        sideEffects=[SkillSideEffect.MODEL_CALL],
    ),
    SkillDefinition(
        skillKey="fetch_market_news_context",
        label="Fetch Market News Context",
        description="Fetch market news items to provide research context for downstream nodes.",
        inputSchema=[
            SkillIoField(
                key="task_input",
                label="Task Input",
                valueType="text",
                description="Research task or market question to guide the news fetch.",
            )
        ],
        outputSchema=[
            SkillIoField(
                key="rss_items",
                label="RSS Items",
                valueType="json",
                description="Fetched market news records.",
            )
        ],
        supportedValueTypes=["text", "json"],
        sideEffects=[SkillSideEffect.NETWORK],
    ),
    SkillDefinition(
        skillKey="clean_market_news",
        label="Clean Market News",
        description="Normalize fetched market news into cleaned items and a text research context.",
        inputSchema=[
            SkillIoField(
                key="rss_items",
                label="RSS Items",
                valueType="json",
                required=True,
                description="Raw fetched market news records.",
            )
        ],
        outputSchema=[
            SkillIoField(
                key="clean_news_items",
                label="Clean News Items",
                valueType="json",
                description="Normalized news items used by downstream research nodes.",
            ),
            SkillIoField(
                key="news_context",
                label="News Context",
                valueType="text",
                description="Concise text context distilled from cleaned news items.",
            ),
        ],
        supportedValueTypes=["json", "text"],
        sideEffects=[SkillSideEffect.NONE],
    ),
    SkillDefinition(
        skillKey="build_creative_brief",
        label="Build Creative Brief",
        description="Assemble a creative brief from structured research and pattern inputs.",
        inputSchema=[
            SkillIoField(
                key="task_input",
                label="Task Input",
                valueType="text",
                description="Creative task or campaign brief goal.",
            ),
            SkillIoField(
                key="news_context",
                label="News Context",
                valueType="text",
                description="Normalized text research context used to shape the brief.",
            ),
            SkillIoField(
                key="theme_config",
                label="Theme Config",
                valueType="json",
                description="Theme configuration used to shape genre, tone, and evaluation focus.",
            ),
            SkillIoField(
                key="pattern_summary",
                label="Pattern Summary",
                valueType="text",
                description="Optional extracted pattern summary used by the brief builder.",
            ),
        ],
        outputSchema=[
            SkillIoField(
                key="creative_brief",
                label="Creative Brief",
                valueType="text",
                description="Structured creative brief payload.",
            )
        ],
        supportedValueTypes=["text", "json"],
        sideEffects=[SkillSideEffect.MODEL_CALL],
    ),
    SkillDefinition(
        skillKey="generate_creative_variants",
        label="Generate Creative Variants",
        description="Generate structured creative variants from the current task and brief.",
        inputSchema=[
            SkillIoField(key="task_input", label="Task Input", valueType="text", description="Creative task or campaign goal."),
            SkillIoField(key="creative_brief", label="Creative Brief", valueType="text", required=True, description="Brief used to generate variants."),
            SkillIoField(key="theme_config", label="Theme Config", valueType="json", description="Theme configuration used by the generator."),
            SkillIoField(key="variant_count", label="Variant Count", valueType="json", description="How many variants to generate."),
        ],
        outputSchema=[
            SkillIoField(key="script_variants", label="Script Variants", valueType="json", description="Generated creative variants."),
        ],
        supportedValueTypes=["text", "json"],
        sideEffects=[SkillSideEffect.MODEL_CALL],
    ),
    SkillDefinition(
        skillKey="review_creative_variants",
        label="Review Creative Variants",
        description="Review generated variants and return pass or revise guidance.",
        inputSchema=[
            SkillIoField(key="task_input", label="Task Input", valueType="text", description="Creative task or campaign goal."),
            SkillIoField(key="creative_brief", label="Creative Brief", valueType="text", required=True, description="Brief used for evaluation."),
            SkillIoField(key="script_variants", label="Script Variants", valueType="json", required=True, description="Variants to review."),
            SkillIoField(key="theme_config", label="Theme Config", valueType="json", description="Theme configuration used by the reviewer."),
            SkillIoField(key="pass_threshold", label="Pass Threshold", valueType="json", description="Score threshold for pass."),
        ],
        outputSchema=[
            SkillIoField(key="review_results", label="Review Results", valueType="json", description="Per-variant review results."),
            SkillIoField(key="best_variant", label="Best Variant", valueType="json", description="Best reviewed variant."),
            SkillIoField(key="revision_feedback", label="Revision Feedback", valueType="json", description="Feedback for revise path."),
            SkillIoField(key="evaluation_result", label="Evaluation Result", valueType="json", description="Decision payload used by condition nodes."),
        ],
        supportedValueTypes=["text", "json"],
        sideEffects=[SkillSideEffect.MODEL_CALL],
    ),
]


def list_skill_definitions() -> list[SkillDefinition]:
    return [definition.model_copy(deep=True) for definition in SKILL_DEFINITIONS]


def get_skill_definition_registry() -> dict[str, SkillDefinition]:
    return {definition.skill_key: definition.model_copy(deep=True) for definition in SKILL_DEFINITIONS}
