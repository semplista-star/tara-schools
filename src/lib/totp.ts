import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

const ISSUER = "Tara — Centro de control";

export function generateTotpSecret() {
  return generateSecret();
}

export async function totpQrDataUrl(email: string, secret: string) {
  const uri = generateURI({ issuer: ISSUER, label: email, secret });
  return QRCode.toDataURL(uri);
}

export async function verifyTotp(token: string, secret: string) {
  try {
    const result = await verify({ secret, token });
    return result.valid;
  } catch {
    return false;
  }
}
