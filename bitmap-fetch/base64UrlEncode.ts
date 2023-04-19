export function base64UrlEncode(input: Uint8Array): string {
  let base64 = btoa(String.fromCharCode(...input));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}




