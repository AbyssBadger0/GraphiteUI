export type SkillIoField = {
  key: string;
  label: string;
  valueType: string;
  required: boolean;
  description: string;
};

export type SkillRuntimeSpec = {
  type: string;
  entrypoint: string;
};

export type SkillHealthSpec = {
  type: string;
};

export type SkillDefinition = {
  skillKey: string;
  label: string;
  description: string;
  schemaVersion: string;
  version: string;
  targets: string[];
  kind: string;
  mode: string;
  scope: string;
  permissions: string[];
  runtime: SkillRuntimeSpec;
  health: SkillHealthSpec;
  inputSchema: SkillIoField[];
  outputSchema: SkillIoField[];
  supportedValueTypes: string[];
  sideEffects: string[];
  agentNodeEligibility: string;
  agentNodeBlockers: string[];
  sourceFormat: string;
  sourceScope: string;
  sourcePath: string;
  runtimeReady: boolean;
  runtimeRegistered: boolean;
  configured: boolean;
  healthy: boolean;
  status: string;
  canManage: boolean;
  canImport: boolean;
};
