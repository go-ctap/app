export function formatJSON(source: string): string | null {
  try {
    return JSON.stringify(JSON.parse(source), null, 2) as string;
  } catch {
    return null;
  }
}
