export type * from "./common";
export type * from "./destination";
export type * from "./tour";
export type * from "./hotel";
export type * from "./booking";

/*
 * `types/catalogue.ts` is deliberately NOT re-exported here.
 *
 * It carries the live `Hotel`, `Destination` and `PropertyType`, and the
 * prototype files above still carry fixture-shaped versions of the same names.
 * Exporting both would make which one you get depend on import order — and the
 * two disagree about whether a price is dollars or minor units, which is the
 * worst possible thing to be ambiguous about. Import the live ones by path:
 *
 *   import type { Hotel } from "@/types/catalogue";
 */
export type * from "./experience";
export type * from "./transfer";
export type * from "./admin";
export type * from "./partner";
export type * from "./auth";
