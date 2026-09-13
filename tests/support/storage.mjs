// In-memory storage double for the data-list model's persistence contract
// (concepts/app/components/data-list/model.js and filters.js), for use in
// tests/data-list.test.mjs. Mirrors the shape of the real localStorage-backed
// implementation (savedDataListLayout/persistDataListLayout/loadCustomFilters/
// persistCustomFilters, ported verbatim from the baseline at
// .baseline/concepts/app-shell.html:21277-21360) without touching
// localStorage or any other I/O — every value round-trips through
// structuredClone, the same way JSON.parse(JSON.stringify(...)) round-trips
// through the real localStorage-backed implementation, so a test can freely
// mutate what it gets back without corrupting the store.
//
// memoryLayoutStorage() starts empty (no pre-seeded layout/filters for any
// context) and returns a fresh, independent store on every call.

/**
 * @returns {{
 *   loadLayout(context: string): unknown,
 *   saveLayout(context: string, layout: unknown | null): boolean,
 *   loadCustomFilters(context: string): unknown[],
 *   saveCustomFilters(context: string, filters: unknown[]): boolean,
 * }}
 */
export function memoryLayoutStorage() {
  const layouts = new Map();
  const customFilters = new Map();

  return {
    // Returns the stored layout for `context`, or null if none was ever
    // saved — same "nothing stored yet" signal savedDataListLayout's own
    // JSON.parse(... || 'null') produces before its fallback-shaping runs.
    loadLayout(context) {
      return layouts.has(context) ? structuredClone(layouts.get(context)) : null;
    },
    // Passing `layout: null` clears the stored layout for `context` (mirrors
    // the original's localStorage.removeItem(...) reset path); any other
    // value replaces it. Always succeeds (no quota to exceed in memory).
    saveLayout(context, layout) {
      if (layout == null) layouts.delete(context);
      else layouts.set(context, structuredClone(layout));
      return true;
    },
    // Returns [] when nothing was ever saved for `context`, matching
    // loadCustomFilters's own JSON.parse(... || '[]') default.
    loadCustomFilters(context) {
      return customFilters.has(context) ? structuredClone(customFilters.get(context)) : [];
    },
    saveCustomFilters(context, filters) {
      customFilters.set(context, structuredClone(filters));
      return true;
    },
  };
}
