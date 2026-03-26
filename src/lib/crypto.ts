/**
 * Client-side encryption for Supabase data.
 *
 * Ensures no plaintext business data (stakeholder names, project names,
 * activity names, notes) is stored in the Supabase database.
 *
 * Uses AES-GCM with a key derived from the user's password via PBKDF2.
 * The key is stored in sessionStorage for page refreshes and cleared on logout.
 */

const SALT_PREFIX = 'zeiterfassung_v6_';
const SESSION_KEY = 'ze_enc_key';
const ENC_PREFIX = 'enc:'; // Prefix to identify encrypted values

// ============================================================================
// Key Derivation & Storage
// ============================================================================

/** Derive an AES-256-GCM key from password + userId */
export async function deriveEncryptionKey(password: string, userId: string): Promise<void> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT_PREFIX + userId),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Export and store in sessionStorage (survives page refresh, not tab close)
  const exported = await crypto.subtle.exportKey('raw', key);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  sessionStorage.setItem(SESSION_KEY, b64);
}

/** Get the stored encryption key (null if not available) */
async function getKey(): Promise<CryptoKey | null> {
  const b64 = sessionStorage.getItem(SESSION_KEY);
  if (!b64) return null;

  try {
    const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      'raw',
      raw,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch {
    return null;
  }
}

/** Check if encryption key is available */
export function hasEncryptionKey(): boolean {
  return sessionStorage.getItem(SESSION_KEY) !== null;
}

/** Clear the encryption key (on logout) */
export function clearEncryptionKey(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

// ============================================================================
// Encrypt / Decrypt
// ============================================================================

/**
 * Encrypt a plaintext string. Returns `enc:<base64>` format.
 * If encryption key is not available, returns plaintext unchanged.
 */
export async function encryptField(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;
  const key = await getKey();
  if (!key) return plaintext;

  try {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    );
    const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return ENC_PREFIX + btoa(String.fromCharCode(...combined));
  } catch {
    return plaintext;
  }
}

/**
 * Decrypt an encrypted string. If the string doesn't start with `enc:`,
 * it's treated as unencrypted plaintext and returned as-is.
 *
 * IMPORTANT: Never returns ciphertext to the UI. If decryption fails
 * (no key, wrong key), returns a placeholder instead of the raw `enc:` blob.
 */
export async function decryptField(ciphertext: string): Promise<string> {
  if (!ciphertext || !ciphertext.startsWith(ENC_PREFIX)) return ciphertext;
  const key = await getKey();
  if (!key) return ''; // No key available — return empty rather than ciphertext

  try {
    const b64 = ciphertext.slice(ENC_PREFIX.length);
    const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    console.warn('Decryption failed for field — key mismatch or corrupted data');
    return ''; // Decryption failed — return empty rather than raw ciphertext
  }
}

// ============================================================================
// Batch helpers (for encrypting/decrypting multiple fields at once)
// ============================================================================

/** Encrypt multiple fields in an object */
export async function encryptFields<T extends Record<string, any>>(
  obj: T,
  fieldNames: (keyof T)[]
): Promise<T> {
  const result = { ...obj };
  for (const field of fieldNames) {
    if (typeof result[field] === 'string') {
      (result as any)[field] = await encryptField(result[field] as string);
    }
  }
  return result;
}

/** Decrypt multiple fields in an object */
export async function decryptFields<T extends Record<string, any>>(
  obj: T,
  fieldNames: (keyof T)[]
): Promise<T> {
  const result = { ...obj };
  for (const field of fieldNames) {
    if (typeof result[field] === 'string') {
      (result as any)[field] = await decryptField(result[field] as string);
    }
  }
  return result;
}
