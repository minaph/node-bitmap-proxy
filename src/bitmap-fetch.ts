// import { Bookmarklet } from "./makeBookmarkLet";

type JSONObject = {
  [key: string]: JSONValue;
};

type JSONArray = JSONValue[];

type JSONValue = string | number | boolean | JSONArray | JSONObject;

interface ProxyTargetResponse {
  headers: JSONObject;
  status: number;
  statusText: string;
  body: string;
}

// import { RequestOptions } from "http";

type NodeHTTPRequestOptions = {
  method: string;
  path: string;
  hostname: string;
  protocol: string;
  port?: string;
  headers?: Object;
};

import { base71 } from "./base71";

async function fetchInternal(
  endpoint: string,
  input: string | Request,
  init?: RequestInit
): Promise<Response> {
  console.time("fetch");

  const {
    url,
    method,
    headers,
    // body,
    // referrer,
    // referrerPolicy,
    // mode,
    // credentials,
    // cache,
    // redirect,
    // integrity,
    // keepalive,
    signal,
    // window,
  } = new Request(input, init);

  const { hostname, pathname, protocol, search, port } = new URL(url);

  const request: NodeHTTPRequestOptions = {
    method,
    path: pathname + search,
    hostname,
    protocol,
  };

  if (port.length) {
    request.port = port;
  }

  const entries = [...headers.entries()];

  if (entries) {
    request.headers = Object.fromEntries(entries);
  }

  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  const requestUrl = ((req: NodeHTTPRequestOptions) => {
    return new URL(endpoint + base71(JSON.stringify(req)));
  })(request);

  return (async () => {
    signal?.addEventListener("abort", () => {
      throw new DOMException("Aborted", "AbortError");
    });

    console.timeLog("fetch", "setup");

    // img setup & load
    const img = document.createElement("img");
    img.crossOrigin = "Anonymous";
    img.src = requestUrl.href;
    await img.decode();

    console.timeLog("fetch", "image decode");

    // canvas setup
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;

    let binary;

    // recordTime(requestUrl.href, () => {
    // hack
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    // get response
    ctx.drawImage(img, 0, 0);
    const RGBA = ctx.getImageData(0, 0, img.width, img.height).data;
    console.assert(RGBA.length === img.width * img.height * 4);

    // decode
    binary = RGBA.filter((_, i) => i % 4 !== 3).reverse();

    console.timeLog("fetch", "binary decode");

    const text = new TextDecoder("utf-8").decode(binary).replace(/\1\0*$/, "");
    const { status, statusText, headers, body } = JSON.parse(text) as {
      headers: Record<string, string>;
    } & ProxyTargetResponse;

    console.timeLog("fetch", "text decode");

    //　make response
    const result = new Response(body, { status, statusText, headers });

    console.timeEnd("fetch");
    console.debug(result);
    return result;
  })();
}

async function fetch(input: string, init?: RequestInit): Promise<Response> {
  const endpoint = "https://vercel-bitmap-proxy-minaph.vercel.app/";
  // const endpoint = "http://localhost:3000/";
  return fetchInternal(endpoint, input, init);
}

type RaceResult = {
  endpoint: string;
  response: Response;
};

async function fetchRace(
  input: string,
  init?: RequestInit
): Promise<RaceResult> {
  const endpoints = [
    "https://vercel-bitmap-proxy.vercel.app/",
    "https://asia-northeast1-scrgoogproject-1651036452801.cloudfunctions.net/function-2?q=",
    "https://exuberant-quilt-chimpanzee.glitch.me/?q=",
  ];
  const promises = endpoints.map(async (endpoint) => {
    const response = await fetchInternal(endpoint, input, init);
    return { endpoint, response };
  });
  return Promise.race(promises);
}

// const fetchBookmarklet = new Bookmarklet(fetch, [fetchInternal]);

export { fetch, fetchRace, fetchInternal };
