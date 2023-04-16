import { Bookmarklet } from "./Bookmarklet";

function base71(text: string): string {
  const regex =
    /[^!'()*-.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz]+/g;
  return text.replace(regex, encodeChar);
}

function encodeChar(_text: string): string {
  if (_text === "~") {
    return "~~";
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return (
    "~" +
    _text
      .split("~")
      .map((text) => {
        const data = encoder.encode(text);
        let left = 0n;
        for (const byte of data) {
          left = (left << 8n) | BigInt(byte);
        }
        const result = new Uint8Array(data.length * 4);
        let i = 0;

        while (left > 0) {
          const index = left % 70n;
          left = left / 70n;
          result[i++] = getCodepoint(Number(index));
        }

        return decoder.decode(result.subarray(0, i));
      })
      .join("~~") +
    "~"
  );
}

function getCodepoint(i: number): number {
  if (i >= 72) throw new Error("Out of range");
  let _i = i + 1;
  if (i >= 70) _i += 55;
  else if (i >= 44) _i += 52;
  else if (i >= 43) _i += 51;
  else if (i >= 17) _i += 47;
  else if (i >= 7) _i += 40;
  else if (i >= 5) _i += 39;
  else if (i >= 1) _i += 37;
  else _i += 32;

  return _i;
}

const encodeCharBL = new Bookmarklet(encodeChar, [getCodepoint]);
const base71BL = new Bookmarklet(base71, [encodeCharBL]);

function decodeBase71(text: string): string {
  const regex = /~.*?(?<!~)~(?!~)|~~/g;
  return text.replace(regex, decodeChar);
}

function decodeChar(text: string): string {
  if (text === "~~") {
    return "~";
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return text
    .substring(1, text.length - 1)
    .split("~~")
    .map((_text) => {
      if (!_text) return "";
      const data = encoder.encode(_text);
      let left = 0n;
      let j = 0n;
      for (const byte of data) {
        left += 70n ** j++ * BigInt(getInt(byte));
      }
      const result = new Uint8Array(data.length);
      let i = data.length - 1;
      while (left > 0) {
        const index = left % 256n;
        left >>= 8n;
        result[i--] = Number(index);
      }
      return decoder.decode(result.subarray(i + 1));
    })
    .join("~");
}

function getInt(i: number): number {
  if (i >= 127) throw new Error("Out of range");
  let _i = i + 1;
  if (i >= 126) _i -= 56;
  else if (i >= 97) _i -= 53;
  else if (i >= 95) _i -= 52;
  else if (i >= 65) _i -= 48;
  else if (i >= 48) _i -= 41;
  else if (i >= 45) _i -= 40;
  else if (i >= 39) _i -= 38;
  else _i -= 33;

  return _i - 1;
}

export { base71, base71BL, decodeBase71 };
