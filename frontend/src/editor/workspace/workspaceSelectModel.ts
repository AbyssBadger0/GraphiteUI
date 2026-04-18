export type WorkspaceSelectOption = {
  value: string;
  label: string;
};

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
