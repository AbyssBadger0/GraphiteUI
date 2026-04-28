import type { ConditionNode, StateDefinition } from "@/types/node-system";

export type ConditionRuleSourceOption = {
  value: string;
  label: string;
};

export type ConditionRuleEditorModel = {
  sourceOptions: ConditionRuleSourceOption[];
  resolvedSource: string;
  isValueDisabled: boolean;
};

export const CONDITION_RULE_OPERATOR_OPTIONS: Array<{
  value: ConditionNode["config"]["rule"]["operator"];
  label: string;
}> = [
  { value: "==", label: "==" },
  { value: "!=", label: "!=" },
  { value: ">=", label: ">=" },
  { value: "<=", label: "<=" },
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "not contains" },
  { value: "exists", label: "exists" },
];

export function buildConditionRuleEditorModel(
  rule: ConditionNode["config"]["rule"],
  stateSchema: Record<string, StateDefinition>,
): ConditionRuleEditorModel {
  const sourceOptions = Object.entries(stateSchema).map(([stateKey, definition]) => ({
    value: stateKey,
    label: definition.name?.trim() || stateKey,
  }));
  const resolvedSource = sourceOptions.some((option) => option.value === rule.source) ? rule.source : (sourceOptions[0]?.value ?? "");

  return {
    sourceOptions,
    resolvedSource,
    isValueDisabled: rule.operator === "exists",
  };
}

export function isConditionRuleValueInputDisabled(operator: string | null | undefined) {
  return operator === "exists";
}

export function resolveConditionRuleValueDraft(value: ConditionNode["config"]["rule"]["value"] | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

export function resolveConditionRuleOperatorPatch(
  value: string | number | boolean | undefined,
): Pick<ConditionNode["config"]["rule"], "operator"> {
  return { operator: String(value ?? "exists") };
}

export function resolveConditionRuleValuePatch(
  nextDraftValue: string,
  currentValue: ConditionNode["config"]["rule"]["value"] | undefined,
): Pick<ConditionNode["config"]["rule"], "value"> | null {
  if (nextDraftValue === resolveConditionRuleValueDraft(currentValue)) {
    return null;
  }
  return { value: nextDraftValue };
}
