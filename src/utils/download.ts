export function downloadBlob(bytes: Uint8Array, filename: string, mime = 'application/octet-stream'): void {
  // Copy into a fresh ArrayBuffer so the Blob constructor's overload accepts
  // the buffer without TS complaining about ArrayBufferLike.
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const blob = new Blob([ab], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
