export type WorkspaceSelectOption = {
  value: string;
  label: string;
};

export function buildWorkspaceSelectOptions(options: WorkspaceSelectOption[]) {
  return options.map((option) => ({
    value: option.value,
    label: option.label,
  }));
}

export function hasWorkspaceSelectOptions(options: WorkspaceSelectOption[]) {
  return options.length > 0;
}

export function resolveWorkspaceSelectTriggerLabel(input: {
  value: string;
  placeholder: string;
  options: WorkspaceSelectOption[];
}) {
  if (!input.value) {
    return input.placeholder;
  }

  return input.options.find((option) => option.value === input.value)?.label ?? input.placeholder;
}
