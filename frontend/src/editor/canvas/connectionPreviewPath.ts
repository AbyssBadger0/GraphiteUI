import { buildConnectorCurvePath } from "./connectionCurvePath.ts";

export function buildPendingConnectionPreviewPath(input: {
  kind: "flow-out" | "route-out" | "state-out";
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}) {
  return buildConnectorCurvePath({
    sourceX: input.sourceX,
    sourceY: input.sourceY,
    targetX: input.targetX,
    targetY: input.targetY,
    sourceSide: "right",
    targetSide: "left",
  });
}
