import {
  acceptedScale,
  type Axis,
  type DrawnLine,
  type PlottedPoint,
  type Point,
  type Sheet,
  type SlopeTriangle,
} from "@pa/analysis";

import type { Projection } from "../events/replay";
import type { Json, LabEvent, NewEvent } from "../events/types";

/**
 * The graph of an attempt, rebuilt from its events (step 7, Plot): the axes and scales the
 * student chose, each point they plotted, their best-fit line and their slope triangle. Values
 * are in the plotted columns' units, read off the sheet. Events that do not fit are ignored.
 */

export interface GraphState {
  sheet: Sheet | undefined;
  plotted: PlottedPoint[];
  line: DrawnLine | undefined;
  triangle: SlopeTriangle | undefined;
}

export const EMPTY_GRAPH: GraphState = {
  sheet: undefined,
  plotted: [],
  line: undefined,
  triangle: undefined,
};

export type GraphCommand =
  | { type: "set-axes"; sheet: Sheet }
  | { type: "plot"; point: PlottedPoint }
  | { type: "unplot"; row: string }
  | { type: "draw-line"; line: DrawnLine }
  | { type: "erase-line" }
  | { type: "draw-triangle"; triangle: SlopeTriangle }
  | { type: "erase-triangle" };

export type GraphRefusal =
  "bad-axes" | "no-axes" | "bad-point" | "not-plotted" | "nothing-to-erase";

export type GraphDecision = { ok: true; events: NewEvent[] } | { ok: false; reason: GraphRefusal };

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isPoint = (v: unknown): v is Point =>
  !!v && typeof v === "object" && finite((v as Point).x) && finite((v as Point).y);
const isAxis = (v: unknown): v is Axis =>
  !!v &&
  typeof v === "object" &&
  typeof (v as Axis).column === "string" &&
  (v as Axis).column.length > 0 &&
  (v as Axis).column.length <= 40 &&
  finite((v as Axis).start) &&
  acceptedScale((v as Axis).per2cm);
const isRow = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 40;

const json = (v: unknown) => v as Json;
const accept = (kind: string, data: Json): GraphDecision => ({
  ok: true,
  events: [{ kind, data }],
});

/** Turn a graph action into events, or refuse it. Pure. */
export function decideGraph(state: GraphState, command: GraphCommand): GraphDecision {
  switch (command.type) {
    case "set-axes":
      return isAxis(command.sheet.x) && isAxis(command.sheet.y)
        ? accept("graph.axes", json({ x: command.sheet.x, y: command.sheet.y }))
        : { ok: false, reason: "bad-axes" };
    case "plot":
      if (!state.sheet) return { ok: false, reason: "no-axes" };
      return isRow(command.point.row) && isPoint(command.point)
        ? accept("graph.point", json(command.point))
        : { ok: false, reason: "bad-point" };
    case "unplot":
      return state.plotted.some((p) => p.row === command.row)
        ? accept("graph.unplot", { row: command.row })
        : { ok: false, reason: "not-plotted" };
    case "draw-line":
      if (!state.sheet) return { ok: false, reason: "no-axes" };
      return isPoint(command.line.from) &&
        isPoint(command.line.to) &&
        command.line.from.x !== command.line.to.x
        ? accept("graph.line", json(command.line))
        : { ok: false, reason: "bad-point" };
    case "erase-line":
      return state.line
        ? accept("graph.line-erase", {})
        : { ok: false, reason: "nothing-to-erase" };
    case "draw-triangle":
      if (!state.sheet) return { ok: false, reason: "no-axes" };
      return isPoint(command.triangle.a) &&
        isPoint(command.triangle.b) &&
        command.triangle.a.x !== command.triangle.b.x
        ? accept("graph.triangle", json(command.triangle))
        : { ok: false, reason: "bad-point" };
    case "erase-triangle":
      return state.triangle
        ? accept("graph.triangle-erase", {})
        : { ok: false, reason: "nothing-to-erase" };
  }
}

function commandOf(e: LabEvent): GraphCommand | undefined {
  const d = (e.data ?? {}) as Record<string, unknown>;
  switch (e.kind) {
    case "graph.axes":
      return isAxis(d.x) && isAxis(d.y)
        ? { type: "set-axes", sheet: { x: d.x, y: d.y } }
        : undefined;
    case "graph.point":
      return isRow(d.row) && isPoint(d)
        ? { type: "plot", point: { row: d.row, x: d.x as number, y: d.y as number } }
        : undefined;
    case "graph.unplot":
      return isRow(d.row) ? { type: "unplot", row: d.row } : undefined;
    case "graph.line":
      return isPoint(d.from) && isPoint(d.to)
        ? {
            type: "draw-line",
            line: { from: { x: d.from.x, y: d.from.y }, to: { x: d.to.x, y: d.to.y } },
          }
        : undefined;
    case "graph.line-erase":
      return { type: "erase-line" };
    case "graph.triangle":
      return isPoint(d.a) && isPoint(d.b)
        ? {
            type: "draw-triangle",
            triangle: { a: { x: d.a.x, y: d.a.y }, b: { x: d.b.x, y: d.b.y } },
          }
        : undefined;
    case "graph.triangle-erase":
      return { type: "erase-triangle" };
    default:
      return undefined;
  }
}

function applyGraph(state: GraphState, command: GraphCommand): GraphState {
  switch (command.type) {
    case "set-axes":
      return { ...state, sheet: command.sheet };
    case "plot":
      // Plotting a row again moves its point: a student rubs out and plots again.
      return {
        ...state,
        plotted: [...state.plotted.filter((p) => p.row !== command.point.row), command.point],
      };
    case "unplot":
      return { ...state, plotted: state.plotted.filter((p) => p.row !== command.row) };
    case "draw-line":
      return { ...state, line: command.line };
    case "erase-line":
      return { ...state, line: undefined, triangle: undefined };
    case "draw-triangle":
      return { ...state, triangle: command.triangle };
    case "erase-triangle":
      return { ...state, triangle: undefined };
  }
}

export const graphProjection: Projection<GraphState> = {
  initial: () => EMPTY_GRAPH,
  apply(state, event) {
    const command = commandOf(event);
    if (!command || !decideGraph(state, command).ok) return state;
    return applyGraph(state, command);
  },
};
