export type Pt = { x: number; y: number };
export type Rect = { id: string; x: number; y: number; w: number; h: number }; // top-left + size
export type Side = "left" | "right" | "top" | "bottom";
export type EdgeReq = { id: string; from: string; to: string };
export type Routed = { id: string; points: Pt[]; ok: boolean };
export type RouterOptions = {
  cell: number; // grid cell size in px (lane spacing)
  margin: number; // cells kept free around every box
  bendCost: number;
  crossCost: number; // crossing a line running the other way
  shareCost: number; // running in a cell already used in the same direction (≈ forbidden)
  maxExpansions: number; // per edge, safety valve
};
export const DEFAULTS: RouterOptions = {
  cell: 10,
  margin: 1,
  bendCost: 6,
  crossCost: 8,
  shareCost: 400,
  maxExpansions: 400_000,
};
