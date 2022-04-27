"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BitmapProxy_1 = require("./BitmapProxy");
(function main() {
    const proxy = new BitmapProxy_1.BitmapProxy({
        whiteList: ["https://scrapbox.io"]
    });
    proxy.start();
})();
