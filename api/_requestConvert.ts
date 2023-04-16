import { URL } from 'url';
import { ClientRequestArgs } from 'http';
import { JSONValue } from './_BitmapProxyResponse';

type JSONifiedHeaders = {
  [key in keyof Headers]: Headers[key] extends JSONValue ? Headers[key] : never;
}

type HeaderKeys = keyof Headers


function convertRequestToClientRequestArgs(
  request: Request,
  username?: string,
  password?: string,
): ClientRequestArgs {
  const url = new URL(request.url);

  const headers = new Headers(request.headers);

  if (request.keepalive) {
    headers.set('Connection', 'keep-alive');
  }

  if (request.referrer && request.referrerPolicy) {
    const referrerValue = applyReferrerPolicy(request.referrer, request.url, request.referrerPolicy);
    if (referrerValue) {
      headers.set('Referer', referrerValue);
    }
  }

  if (request.referrerPolicy) {
    headers.set('Referrer-Policy', request.referrerPolicy);
  }

  // Basic認証を使用する場合
  if (request.credentials === 'include' && username && password) {
    headers.set('Authorization', `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`);
  }

  const clientRequestArgs: ClientRequestArgs = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    protocol: url.protocol,
    method: request.method,
    // somehow a type error occurs here
    // @ts-ignore
    headers: Object.fromEntries([...headers.entries()]),
    signal: request.signal,
  };

  return clientRequestArgs;
}

function applyReferrerPolicy(referrer: string, destinationUrl: string, referrerPolicy: string): string | undefined {
  const destination = new URL(destinationUrl);
  const referrerUrl = new URL(referrer);

  const isDowngrade = referrerUrl.protocol === 'https:' && destination.protocol === 'http:';
  const isSameOrigin = referrerUrl.origin === destination.origin;

  switch (referrerPolicy) {
    case 'no-referrer':
      return undefined;

    case 'no-referrer-when-downgrade':
      if (isDowngrade) {
        return undefined;
      } else {
        return referrer;
      }

    case 'origin':
      return referrerUrl.origin;

    case 'origin-when-cross-origin':
      if (isSameOrigin) {
        return referrer;
      } else {
        return referrerUrl.origin;
      }

    case 'same-origin':
      if (isSameOrigin) {
        return referrer;
      } else {
        return undefined;
      }

    case 'strict-origin':
      if (isDowngrade) {
        return undefined;
      } else {
        return referrerUrl.origin;
      }

    case 'strict-origin-when-cross-origin':
      if (isSameOrigin) {
        return referrer;
      } else if (isDowngrade) {
        return undefined;
      } else {
        return referrerUrl.origin;
      }

    case 'unsafe-url':
      return referrer;

    default:
      throw new Error(`Unknown Referrer-Policy value: ${referrerPolicy}`);
  }
}


function appendOriginHeader(request: Request): Request {
  let serializedOrigin = new URL(request.url).origin
  if (
    // request.mode === 'websocket' ||
    request.referrerPolicy === 'unsafe-url') {
    request.headers.set('Origin', serializedOrigin)
  } else if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (request.mode !== 'cors') {
      switch (request.referrerPolicy) {
        case 'no-referrer':
          serializedOrigin = 'null'
          break
        case 'no-referrer-when-downgrade':
        case 'strict-origin':
        case 'strict-origin-when-cross-origin':
          if (serializedOrigin.startsWith('https:') && !request.url.startsWith('https:')) {
            serializedOrigin = 'null'
          }
          break
        case 'same-origin':
          if (serializedOrigin !== new URL(request.url).origin) {
            serializedOrigin = 'null'
          }
          break
        default:
          break
      }
    }
    request.headers.set('Origin', serializedOrigin)
  }
  return request
}
