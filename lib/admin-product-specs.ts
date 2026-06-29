/** Parse DB specifications (plain text or JSONB array) into admin form rows. */
export function parseSpecificationsForForm(
  raw: string | { label: string; value: string }[] | null | undefined
): { label: string; value: string }[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((item) => ({
      label: String(item.label ?? ""),
      value: String(item.value ?? ""),
    }));
  }

  if (typeof raw !== "string") return [];

  return raw
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const parts = line.split(":");
      if (parts.length >= 2) {
        return {
          label: parts[0].trim(),
          value: parts.slice(1).join(":").trim(),
        };
      }
      return { label: line.trim(), value: "" };
    });
}
