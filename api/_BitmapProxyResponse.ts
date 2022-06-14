

export interface ProxyTargetResponse {
  headers: JSONObject;
  status: number;
  statusText: string;
  body: string;
}



export type JSONValue = string | number | boolean | JSONObject | JSONArray;
export interface JSONObject {
  [x: string]: JSONValue;
}
export interface JSONArray extends Array<JSONValue> {}