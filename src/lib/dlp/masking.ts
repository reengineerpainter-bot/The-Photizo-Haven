export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

export function maskName(name: string, authorized: boolean): string {
  if (authorized) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return `${parts[0][0]}***`;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
