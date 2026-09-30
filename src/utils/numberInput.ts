/**
 * Reads a number box on a settings form. An empty box is `null` ("no value"), never 0.
 *
 * `Number("")` is 0, so the old `Number(event.target.value)` turned a cleared box into a
 * real 0 and saved it. With 0 now a valid co-op setting (a 0% fee), that fake 0 would be a
 * real vote nobody made. `null` goes to the backend as-is, which refuses it with a message
 * naming the setting, so a missing value is reported instead of silently saved.
 */
export function parseNumberInput(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }
  return Number(value);
}
