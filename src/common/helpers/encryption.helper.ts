export async function encryptData(text: string, keyBase64: string) {
  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
    'encrypt',
  ]);
  const encoded = new TextEncoder().encode(text);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptData(
  encryptedBase64: string,
  ivBase64: string,
  keyBase64: string,
) {
  const encrypted = Uint8Array.from(atob(encryptedBase64), (c) =>
    c.charCodeAt(0),
  );
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
    'decrypt',
  ]);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted,
  );
  return new TextDecoder().decode(decrypted);
}
