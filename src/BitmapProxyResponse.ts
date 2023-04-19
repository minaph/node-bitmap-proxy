interface ProxyTargetResponse {
  headers: JSONObject;
  status: number;
  statusText: string;
  body: Buffer;
}

type ProxyResponseHeader = {
  headers: JSONObject;
  status: number;
  statusText: string;
};

class ProxyResponse {
  headerLength: number;
  header: ProxyResponseHeader;
  private _header: Buffer;
  body: Buffer;
  constructor({ headers, status, statusText, body }: ProxyTargetResponse) {
    this.header = {
      headers,
      status,
      statusText,
    };
    this.body = body;
    this._header = Buffer.from(JSON.stringify(this.header));
    this.headerLength = this._header.byteLength;
  }

  toBuffer() {
    const totalLength = 2 + this.headerLength + this.body.byteLength;
    const buffer = Buffer.alloc(totalLength);
    buffer.writeUInt16LE(this.headerLength, 0);
    buffer.fill(this._header, 2);
    this.body.copy(buffer, 2 + this.headerLength);
    return buffer;
  }
}

type JSONValue = string | number | boolean | JSONObject | JSONArray;
interface JSONObject {
  [x: string]: JSONValue;
}
interface JSONArray extends Array<JSONValue> {}

export { ProxyTargetResponse, JSONValue, JSONObject, JSONArray, ProxyResponse };