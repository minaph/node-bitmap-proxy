import http from "http";
import url from "url";

/// <reference path="./@types/cors-anywhere.d.ts" />
import { createServer, withCORS } from "../lib/cors-anywhere.js";
import { ResponseReportWriter, BitmapContentSender } from "./BitmapEmbedder";

import fs from "fs";

type BitmapProxyOptions = {
  port?: number;
  host?: string;
  path?: string;
  cors_anywhere?: boolean;
  whiteList?: string[];
  blackList?: string[];
  denyHttp?: boolean;
};

export class BitmapProxy {
  private readonly cors_anywhere: http.Server;
  private readonly cors_anywhere_internal: http.Server;

  constructor(readonly options?: BitmapProxyOptions) {
    this.cors_anywhere = createServer({
      handleInitialRequest: this.handleRequest.bind(this),
      originWhitelist: options?.whiteList,
      originBlacklist: options?.blackList ?? [],
      redirectSameOrigin: true,
      removeHeaders: ["cookie", "cookie2"],
      requireHeader: ["origin", "sec-fetch-dest"],
      setHeaders: {
        "x-powered-by": "bitmap-proxy",
      },
    });
    this.cors_anywhere_internal = createServer({});
  }

  private get host(): string {
    return this.options?.host ?? "127.0.0.1";
  }

  private get port(): number {
    return this.options?.port ?? ("PORT" in process.env ? Number.parseInt(process.env.PORT!) : null) ?? 3000;
  }

  private get path(): string {
    return this.options?.path ?? "";
  }

  private get denyHttp(): boolean {
    return this.options?.denyHttp ?? true;
  }

  private get cors_anywhere_enabled(): boolean {
    return this.options?.cors_anywhere ?? false;
  }

  public start() {
    this.cors_anywhere.listen(this.port, this.host, () => {
      console.log(`Server running at http://${this.host}:${this.port}/`);
    });
  }

  public stop() {
    this.cors_anywhere.close();
  }

  private initialCheck(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    query: url.UrlWithParsedQuery
  ) {
    if(this.denyHttp && query && query.protocol === "http:") {
      return false;
    }
    if (req.headers["sec-fetch-dest"] === "image") {
      return true;
    };
    if (this.cors_anywhere_enabled) {
      return true;
    }
    return false;
  }

  private handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    query: url.UrlWithParsedQuery
  ) {
    const flag = this.initialCheck(req, res, query);
    if (flag) {
      console.log("request", req.headers);
      this.internal(req, res, query);
    }
    return flag;
  }

  private internal(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    query: url.UrlWithParsedQuery
  ) {
    const overwriteHeader = withCORS({}, req);
    const wrappedResponse = new ResponseReportWriter();
    BitmapContentSender.pipe(wrappedResponse, res, overwriteHeader);

    // start the proxy
    this.cors_anywhere_internal.emit("request", req, wrappedResponse);

    // Todo: Callback Architectureにする
    // this.callback(req, res, query);
  }
}