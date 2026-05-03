import type { PendingGraphConnection } from "../../lib/graph-connections.ts";
import { VIRTUAL_ANY_OUTPUT_STATE_KEY } from "../../lib/virtual-any-input.ts";
import type { GraphNode, GraphPosition, StateDefinition } from "../../types/node-system.ts";
import type { ProjectedCanvasAnchor } from "./edgeProjection.ts";
import { resolveCanvasConnectionStateValueType } from "./canvasConnectionInteractionModel.ts";

type StateSchemaLike = Record<string, Pick<StateDefinition, "type"> | undefined>;
type NodeLookupLike = Record<string, GraphNode | undefined>;

export type CanvasConnectionCompletionAction =
  | {
      type: "connect-flow";
      payload: { sourceNodeId: string; targetNodeId: string };
    }
  | {
      type: "connect-state";
      payload: {
        sourceNodeId: string;
        sourceStateKey: string;
        targetNodeId: string;
        targetStateKey: string;
        position: GraphPosition;
        sourceValueType?: string | null;
      };
    }
  | {
      type: "connect-state-input-source";
      payload: {
        sourceNodeId: string;
        targetNodeId: string;
        targetStateKey: string;
        targetValueType?: string | null;
      };
    }
  | {
      type: "connect-route";
      payload: { sourceNodeId: string; branchKey: string; targetNodeId: string };
    }
  | {
      type: "reconnect-flow";
      payload: { sourceNodeId: string; currentTargetNodeId: string; nextTargetNodeId: string };
    }
  | {
      type: "reconnect-route";
      payload: { sourceNodeId: string; branchKey: string; nextTargetNodeId: string };
    };

type CanvasConnectionCompletionInput = {
  connection: PendingGraphConnection | null;
  targetAnchor: ProjectedCanvasAnchor;
  stateSchema: StateSchemaLike;
  nodes?: NodeLookupLike;
};

export type CanvasConnectionCompletionRequest = {
  action: CanvasConnectionCompletionAction | null;
  clearConnectionInteraction: true;
  clearSelectedEdge: true;
};

export type CanvasConnectionCompletionExecutionAction =
  | { type: "ignore-locked" }
  | { type: "ignore-missing-connection" }
  | ({
      type: "complete-connection";
    } & CanvasConnectionCompletionRequest);

export function resolveCanvasConnectionCompletionAction(
  input: CanvasConnectionCompletionInput,
): CanvasConnectionCompletionAction | null {
  const { connection, targetAnchor } = input;
  if (!connection) {
    return null;
  }

  if (connection.mode === "reconnect") {
    if (connection.sourceKind === "route-out" && connection.branchKey) {
      return {
        type: "reconnect-route",
        payload: {
          sourceNodeId: connection.sourceNodeId,
          branchKey: connection.branchKey,
          nextTargetNodeId: targetAnchor.nodeId,
        },
      };
    }
    if (connection.currentTargetNodeId) {
      return {
        type: "reconnect-flow",
        payload: {
          sourceNodeId: connection.sourceNodeId,
          currentTargetNodeId: connection.currentTargetNodeId,
          nextTargetNodeId: targetAnchor.nodeId,
        },
      };
    }
    return null;
  }

  if (connection.sourceKind === "route-out" && connection.branchKey) {
    return {
      type: "connect-route",
      payload: {
        sourceNodeId: connection.sourceNodeId,
        branchKey: connection.branchKey,
        targetNodeId: targetAnchor.nodeId,
      },
    };
  }

  if (connection.sourceKind === "state-out" && connection.sourceStateKey && targetAnchor.stateKey) {
    const sourceValueType =
      connection.sourceStateKey === VIRTUAL_ANY_OUTPUT_STATE_KEY
        ? resolveCanvasConnectionStateValueType(
            connection.sourceStateKey,
            input.stateSchema,
            input.nodes?.[connection.sourceNodeId],
          )
        : null;
    return {
      type: "connect-state",
      payload: {
        sourceNodeId: connection.sourceNodeId,
        sourceStateKey: connection.sourceStateKey,
        targetNodeId: targetAnchor.nodeId,
        targetStateKey: targetAnchor.stateKey,
        position: { x: targetAnchor.x, y: targetAnchor.y },
        ...(sourceValueType ? { sourceValueType } : {}),
      },
    };
  }

  if (
    connection.sourceKind === "state-in" &&
    connection.sourceStateKey &&
    targetAnchor.kind === "state-out" &&
    targetAnchor.stateKey
  ) {
    const sourceValueType =
      targetAnchor.stateKey === VIRTUAL_ANY_OUTPUT_STATE_KEY
        ? resolveCanvasConnectionStateValueType(targetAnchor.stateKey, input.stateSchema, input.nodes?.[targetAnchor.nodeId])
        : null;
    return {
      type: "connect-state",
      payload: {
        sourceNodeId: targetAnchor.nodeId,
        sourceStateKey: targetAnchor.stateKey,
        targetNodeId: connection.sourceNodeId,
        targetStateKey: connection.sourceStateKey,
        position: { x: targetAnchor.x, y: targetAnchor.y },
        ...(sourceValueType ? { sourceValueType } : {}),
      },
    };
  }

  if (connection.sourceKind === "state-in" && connection.sourceStateKey) {
    return {
      type: "connect-state-input-source",
      payload: {
        sourceNodeId: targetAnchor.nodeId,
        targetNodeId: connection.sourceNodeId,
        targetStateKey: connection.sourceStateKey,
        targetValueType: resolveCanvasConnectionStateValueType(connection.sourceStateKey, input.stateSchema),
      },
    };
  }

  return {
    type: "connect-flow",
    payload: {
      sourceNodeId: connection.sourceNodeId,
      targetNodeId: targetAnchor.nodeId,
    },
  };
}

export function resolveCanvasConnectionCompletionRequest(
  input: CanvasConnectionCompletionInput,
): CanvasConnectionCompletionRequest | null {
  if (!input.connection) {
    return null;
  }

  return {
    action: resolveCanvasConnectionCompletionAction(input),
    clearConnectionInteraction: true,
    clearSelectedEdge: true,
  };
}

export function resolveCanvasConnectionCompletionExecutionAction(
  input: CanvasConnectionCompletionInput & { interactionLocked: boolean },
): CanvasConnectionCompletionExecutionAction {
  if (input.interactionLocked) {
    return { type: "ignore-locked" };
  }

  if (!input.connection) {
    return { type: "ignore-missing-connection" };
  }

  return {
    type: "complete-connection",
    action: resolveCanvasConnectionCompletionAction(input),
    clearConnectionInteraction: true,
    clearSelectedEdge: true,
  };
}
