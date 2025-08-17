// Simple AES-GCM encryption/decryption helpers using Web Crypto API
// - 전화번호를 토큰화하기 위한 암복호화 및 base64url 변환 유틸

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/** AES-GCM에 사용할 대칭키를 환경변수로부터 파생합니다. */
async function getAesKey(): Promise<CryptoKey> {
  const pass = (import.meta as any)?.env?.VITE_PHONE_CRYPT_PASS || "demo-passphrase";
  const hashBuf = await crypto.subtle.digest("SHA-256", textEncoder.encode(String(pass)));
  return crypto.subtle.importKey("raw", hashBuf, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/** 주어진 문자열을 AES-GCM으로 암호화하고 'iv:ct' 형태의 base64 문자열을 반환합니다. */
export async function encryptToBase64(plain: string): Promise<string> {
  const key = await getAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ctBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, textEncoder.encode(plain));
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ctBuf)));
  return `${ivB64}:${ctB64}`;
}

/** 'iv:ct' 형태의 base64 문자열을 복호화하여 원문을 반환합니다. */
export async function decryptFromBase64(payload: string): Promise<string | null> {
  try {
    const [ivB64, ctB64] = String(payload || "").split(":");
    if (!ivB64 || !ctB64) return null;
    const iv = new Uint8Array(
      atob(ivB64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const ct = new Uint8Array(
      atob(ctB64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const key = await getAesKey();
    const ptBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return textDecoder.decode(ptBuf);
  } catch {
    return null;
  }
}

// Base64URL helpers for embedding encrypted payloads into identifiers
/** 일반 문자열을 base64url로 인코딩합니다. */
export function toBase64Url(input: string): string {
  const b64 = btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/** base64url 문자열을 일반 문자열로 디코딩합니다. */
export function fromBase64UrlToString(input: string): string | null {
  try {
    let b64 = input.replace(/-/g, "+").replace(/_/g, "/");
    // pad
    while (b64.length % 4 !== 0) b64 += "=";
    const str = atob(b64);
    return decodeURIComponent(escape(str));
  } catch {
    return null;
  }
}
