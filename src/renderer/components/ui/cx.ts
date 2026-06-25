// Tiny className combiner. Keeps component JSX readable without pulling in a
// dependency; falsy values (false/null/undefined) are dropped so conditional
// classes can be written inline.
export type ClassValue = string | false | null | undefined;

export function cx(...values: readonly ClassValue[]): string {
  return values.filter((value): value is string => Boolean(value)).join(" ");
}
