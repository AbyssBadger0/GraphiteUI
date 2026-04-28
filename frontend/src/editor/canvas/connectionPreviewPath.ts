import { buildConnectorCurvePath } from "./connectionCurvePath.ts";
import { buildSequenceFlowPath } from "./flowEdgePath.ts";

export function buildPendingConnectionPreviewPath(input: {
  kind: "flow-out" | "route-out" | "state-out" | "state-in";
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}) {
  if (input.kind === "flow-out" || input.kind === "route-out") {
    return buildSequenceFlowPath(input);
  }

  if (input.kind === "state-in") {
    return buildConnectorCurvePath({
      sourceX: input.targetX,
      sourceY: input.targetY,
      targetX: input.sourceX,
      targetY: input.sourceY,
      sourceSide: "right",
      targetSide: "left",
    });
  }

  return buildConnectorCurvePath({
    sourceX: input.sourceX,
    sourceY: input.sourceY,
    targetX: input.targetX,
    targetY: input.targetY,
    sourceSide: "right",
    targetSide: "left",
  });
}
