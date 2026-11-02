// The last 6 characters of an id, as stored (so it can be searched for): enough to tell
// deliveries apart on a screen (spec 0011). Ids are cuids, so the end is the most varied part.
// The full id goes in a title.
export function shortId(id: string): string {
  return id.slice(-6)
}
