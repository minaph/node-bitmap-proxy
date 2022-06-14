let encoder: Text2Binary, decoder: Binary2Text;

type Text2Binary = {
  encode(text: string): Uint8Array;
};

type Binary2Text = {
  decode(binary: Uint8Array): string;
};

if (TextEncoder && TextDecoder) {
  encoder = new TextEncoder();
  decoder = new TextDecoder();
} else if (Buffer) {
  encoder = {
    encode: (text) => Buffer.from(text, "utf-8"),
  };
  decoder = {
    decode: (binary) => Buffer.from(binary).toString("utf-8"),
  };
} else {
  throw new Error("Buffer, TextEncoder and TextDecoder are not supported");
}

function base71(text: string): string {
  const regex =
    /[^!'()*-.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz]/g;
  return text.replace(regex, encodeChar);
}

function encodeChar(text: string): string {
  if (text === "~") {
    return "~~";
  }
  const data = encoder.encode(text);
  let left = 0;
  for (const byte of data) {
    left = (left << 8) | byte;
  }
  const result = new Uint8Array(data.length * 4);
  let i = 0;

  while (left > 0) {
    const index = left % 71;
    left = Math.floor(left / 71);
    result[i++] = getCodepoint(index);
  }

  return "~" + decoder.decode(result.subarray(0, i)) + "~";
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

function decodeBase71(text: string): string {
  const regex = /~.*?~/g;
  return text.replace(regex, decodeChar);
}

function decodeChar(text: string): string {
  if (text === "~~") {
    return "~";
  }

  let _text = text.substring(1, text.length - 1);

  const data = encoder.encode(_text);
  let left = 0n;
  let j = 0n;
  for (const byte of data) {
    left += 71n ** j++ * BigInt(getInt(byte));
  }
  const result = new Uint8Array(data.length);
  let i = data.length - 1;
  while (left > 0) {
    const index = left % 256n;
    left >>= 8n;
    result[i--] = Number(index);
  }
  return decoder.decode(result.subarray(i + 1));
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

export { base71, decodeBase71 };
