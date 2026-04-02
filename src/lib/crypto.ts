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
// Rate-limit decryption warnings (once per 60s instead of per field)
let _lastDecryptWarn = 0;
let _decryptWarnCount = 0;

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
    _decryptWarnCount++;
    const now = Date.now();
    if (now - _lastDecryptWarn > 60000) {
      console.warn(`[Crypto] Decryption failed for ${_decryptWarnCount} field(s) — key mismatch or corrupted data`);
      _lastDecryptWarn = now;
      _decryptWarnCount = 0;
    }
    return ''; // Decryption failed — return empty rather than raw ciphertext
  }
}

// ============================================================================
// Team E2E Encryption
// ============================================================================

const TEAM_SESSION_KEY = 'ze_team_key';
const TEAM_TRANSPORT_SALT = 'zeiterfassung_team_transport_';

/** Generate a random 256-bit Team Key and return as base64 */
export async function generateTeamKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/** Derive a transport key from invite code + team ID (for Team Key exchange) */
async function deriveTransportKey(inviteCode: string, teamId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(inviteCode.toUpperCase()),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(TEAM_TRANSPORT_SALT + teamId),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypt the Team Key with the invite-code-derived transport key */
export async function encryptTeamKeyForTransport(
  teamKeyB64: string,
  inviteCode: string,
  teamId: string
): Promise<string> {
  const transportKey = await deriveTransportKey(inviteCode, teamId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    transportKey,
    Uint8Array.from(atob(teamKeyB64), (c) => c.charCodeAt(0))
  );
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/** Decrypt the Team Key using invite code (on team join) */
export async function decryptTeamKeyFromTransport(
  encryptedTeamKey: string,
  inviteCode: string,
  teamId: string
): Promise<string> {
  const transportKey = await deriveTransportKey(inviteCode, teamId);
  const combined = Uint8Array.from(atob(encryptedTeamKey), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    transportKey,
    encrypted
  );
  return btoa(String.fromCharCode(...new Uint8Array(decrypted)));
}

/** Encrypt the Team Key with the user's personal key (for session persistence) */
export async function encryptTeamKeyWithPersonalKey(teamKeyB64: string): Promise<string> {
  const personalKey = await getKey();
  if (!personalKey) throw new Error('Personal encryption key not available');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    personalKey,
    Uint8Array.from(atob(teamKeyB64), (c) => c.charCodeAt(0))
  );
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/** Decrypt the Team Key with the user's personal key (on session restore) */
export async function decryptTeamKeyWithPersonalKey(encryptedB64: string): Promise<string> {
  const personalKey = await getKey();
  if (!personalKey) throw new Error('Personal encryption key not available');
  const combined = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    personalKey,
    encrypted
  );
  return btoa(String.fromCharCode(...new Uint8Array(decrypted)));
}

/** Store the Team Key in sessionStorage */
export function setTeamKey(teamKeyB64: string): void {
  sessionStorage.setItem(TEAM_SESSION_KEY, teamKeyB64);
}

/** Get the Team Key from sessionStorage (null if not in a team or key missing) */
export function getTeamKeyB64(): string | null {
  return sessionStorage.getItem(TEAM_SESSION_KEY);
}

/** Check if a Team Key is available */
export function hasTeamKey(): boolean {
  return sessionStorage.getItem(TEAM_SESSION_KEY) !== null;
}

/** Clear the Team Key (on team leave or logout) */
export function clearTeamKey(): void {
  sessionStorage.removeItem(TEAM_SESSION_KEY);
}

/**
 * Get the active encryption key for field-level encryption.
 * Returns Team Key if available (user is in a team), otherwise personal key.
 * This ensures team members can decrypt each other's entries.
 */
async function getActiveKey(): Promise<CryptoKey | null> {
  // Team Key takes priority (entries need to be team-readable)
  const teamKeyB64 = getTeamKeyB64();
  if (teamKeyB64) {
    try {
      const raw = Uint8Array.from(atob(teamKeyB64), (c) => c.charCodeAt(0));
      return await crypto.subtle.importKey(
        'raw',
        raw,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } catch {
      // Fallback to personal key
    }
  }
  return getKey();
}

/**
 * Encrypt a field with the Team Key specifically (for team-shared data).
 * Falls back to personal key if no Team Key is available.
 */
export async function encryptFieldForTeam(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;
  const key = await getActiveKey();
  if (!key) {
    console.error('[Crypto] encryptFieldForTeam called without encryption key — aborting to prevent plaintext leak');
    throw new Error('Encryption key not available');
  }

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
  } catch (e) {
    console.error('[Crypto] encryptFieldForTeam encryption failed:', e);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt a field trying Team Key first, then personal key.
 * This ensures both team-encrypted and personally-encrypted data can be read.
 */
export async function decryptFieldSmart(ciphertext: string): Promise<string> {
  if (!ciphertext || !ciphertext.startsWith(ENC_PREFIX)) return ciphertext;

  // Try Team Key first (most entries will be team-encrypted when in a team)
  const teamKeyB64 = getTeamKeyB64();
  if (teamKeyB64) {
    try {
      const raw = Uint8Array.from(atob(teamKeyB64), (c) => c.charCodeAt(0));
      const teamKey = await crypto.subtle.importKey(
        'raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
      );
      const b64 = ciphertext.slice(ENC_PREFIX.length);
      const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv }, teamKey, encrypted
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      // Team Key didn't work — try personal key below
    }
  }

  // Fallback to personal key (for pre-team entries or own entries)
  return decryptField(ciphertext);
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
