import { authenticator } from "otplib";
import QRCode from "qrcode";

authenticator.options = { window: 1 };

export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

export function verifyMfaCode(secret: string, code: string): boolean {
  return authenticator.verify({ token: code, secret });
}

export async function generateMfaQrDataUrl(
  secret: string,
  email: string
): Promise<string> {
  const otpauth = authenticator.keyuri(email, "The Photizo Haven", secret);
  return QRCode.toDataURL(otpauth);
}

export function getMfaProvisioningUri(secret: string, email: string): string {
  return authenticator.keyuri(email, "The Photizo Haven", secret);
}
