export type ConnectorSide = "left" | "right" | "top" | "bottom";

type ConnectorCurveInput = {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceSide: ConnectorSide;
  targetSide: ConnectorSide;
  sourceOffset?: number;
  targetOffset?: number;
};

type ConnectorCurveGeometry = {
  sourceControlX: number;
  sourceControlY: number;
  targetControlX: number;
  targetControlY: number;
};

function roundCoordinate(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resolveDefaultOffset(side: ConnectorSide, deltaX: number, deltaY: number) {
  if (side === "left" || side === "right") {
    return clamp(Math.abs(deltaX) * 0.45, 56, 220);
  }

  return clamp(Math.abs(deltaY) * 0.45, 42, 180);
}

function offsetPoint(x: number, y: number, side: ConnectorSide, distance: number) {
  if (side === "left") {
    return { x: x - distance, y };
  }
  if (side === "right") {
    return { x: x + distance, y };
  }
  if (side === "top") {
    return { x, y: y - distance };
  }
  return { x, y: y + distance };
}

function resolveConnectorCurveGeometry(input: ConnectorCurveInput): ConnectorCurveGeometry {
  const deltaX = input.targetX - input.sourceX;
  const deltaY = input.targetY - input.sourceY;

  const sourceDistance = input.sourceOffset ?? resolveDefaultOffset(input.sourceSide, deltaX, deltaY);
  const targetDistance = input.targetOffset ?? resolveDefaultOffset(input.targetSide, deltaX, deltaY);

  const sourceControl = offsetPoint(input.sourceX, input.sourceY, input.sourceSide, sourceDistance);
  const targetControl = offsetPoint(input.targetX, input.targetY, input.targetSide, targetDistance);

  return {
    sourceControlX: sourceControl.x,
    sourceControlY: sourceControl.y,
    targetControlX: targetControl.x,
    targetControlY: targetControl.y,
  };
}

function evaluateCubicCoordinate(start: number, controlA: number, controlB: number, end: number, t: number) {
  const oneMinusT = 1 - t;
  return (
    oneMinusT ** 3 * start +
    3 * oneMinusT ** 2 * t * controlA +
    3 * oneMinusT * t ** 2 * controlB +
    t ** 3 * end
  );
}

function evaluateCubicDerivative(start: number, controlA: number, controlB: number, end: number, t: number) {
  const oneMinusT = 1 - t;
  return (
    3 * oneMinusT ** 2 * (controlA - start) +
    6 * oneMinusT * t * (controlB - controlA) +
    3 * t ** 2 * (end - controlB)
  );
}

export function buildConnectorCurvePath(input: ConnectorCurveInput) {
  const geometry = resolveConnectorCurveGeometry(input);

  return [
    `M ${roundCoordinate(input.sourceX)} ${roundCoordinate(input.sourceY)}`,
    `C ${roundCoordinate(geometry.sourceControlX)} ${roundCoordinate(geometry.sourceControlY)} ${roundCoordinate(geometry.targetControlX)} ${roundCoordinate(geometry.targetControlY)} ${roundCoordinate(input.targetX)} ${roundCoordinate(input.targetY)}`,
  ].join(" ");
}

export function resolveConnectorCurveLabelPoint(input: ConnectorCurveInput, t = 0.5, normalOffset = 0) {
  const geometry = resolveConnectorCurveGeometry(input);
  const pointX = evaluateCubicCoordinate(input.sourceX, geometry.sourceControlX, geometry.targetControlX, input.targetX, t);
  const pointY = evaluateCubicCoordinate(input.sourceY, geometry.sourceControlY, geometry.targetControlY, input.targetY, t);
  const tangentX = evaluateCubicDerivative(input.sourceX, geometry.sourceControlX, geometry.targetControlX, input.targetX, t);
  const tangentY = evaluateCubicDerivative(input.sourceY, geometry.sourceControlY, geometry.targetControlY, input.targetY, t);
  const normalLength = Math.hypot(tangentX, tangentY) || 1;
  const normalX = tangentY / normalLength;
  const normalY = -tangentX / normalLength;

  return {
    x: roundCoordinate(pointX + normalX * normalOffset),
    y: roundCoordinate(pointY + normalY * normalOffset),
  };
}
