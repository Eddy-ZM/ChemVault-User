export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function passwordError(value: string): string | null {
  if (value.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export function required(value: string, label: string): string | null {
  return value.trim() ? null : `${label} is required.`;
}
