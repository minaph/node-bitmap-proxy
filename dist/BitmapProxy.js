"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitmapProxy = void 0;
/// <reference path="./@types/cors-anywhere.d.ts" />
const cors_anywhere_js_1 = require("../lib/cors-anywhere.js");
const BitmapEmbedder_1 = require("./BitmapEmbedder");
class BitmapProxy {
    constructor(options) {
        this.options = options;
        this.cors_anywhere = (0, cors_anywhere_js_1.createServer)({
            handleInitialRequest: this.handleRequest.bind(this),
            originWhitelist: options?.whiteList,
            originBlacklist: options?.blackList,
            redirectSameOrigin: true,
            removeHeaders: ["cookie", "cookie2"],
            requireHeader: ["origin", "sec-fetch-dest"],
            setHeaders: {
                "x-powered-by": "bitmap-proxy",
            },
        });
        this.cors_anywhere_internal = (0, cors_anywhere_js_1.createServer)({});
    }
    get host() {
        return this.options?.host ?? "127.0.0.1";
    }
    get port() {
        return this.options?.port ?? ("PORT" in process.env ? Number.parseInt(process.env.PORT) : null) ?? 3000;
    }
    get path() {
        return this.options?.path ?? "";
    }
    get denyHttp() {
        return this.options?.denyHttp ?? true;
    }
    get cors_anywhere_enabled() {
        return this.options?.cors_anywhere ?? false;
    }
    start() {
        this.cors_anywhere.listen(this.port, this.host, () => {
            console.log(`Server running at http://${this.host}:${this.port}/`);
        });
    }
    stop() {
        this.cors_anywhere.close();
    }
    initialCheck(req, res, query) {
        if (this.denyHttp && query.protocol === "http:") {
            return false;
        }
        if (req.headers["sec-fetch-dest"] === "image") {
            return true;
        }
        ;
        if (this.cors_anywhere_enabled) {
            return true;
        }
        return false;
    }
    handleRequest(req, res, query) {
        const flag = this.initialCheck(req, res, query);
        if (flag) {
            console.log("request", req.headers);
            this.internal(req, res, query);
        }
        return flag;
    }
    internal(req, res, query) {
        const overwriteHeader = (0, cors_anywhere_js_1.withCORS)({}, req);
        const wrappedResponse = new BitmapEmbedder_1.ResponseReportWriter();
        BitmapEmbedder_1.BitmapContentSender.pipe(wrappedResponse, res, overwriteHeader);
        // start the proxy
        this.cors_anywhere_internal.emit("request", req, wrappedResponse);
        // Todo: Callback Architectureにする
        // this.callback(req, res, query);
    }
}
exports.BitmapProxy = BitmapProxy;
