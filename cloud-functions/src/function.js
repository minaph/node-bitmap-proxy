"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BitmapHttpServer_1 = __importDefault(require("./BitmapHttpServer"));
const functions_framework_1 = __importDefault(require("@google-cloud/functions-framework"));
// export { handler };
functions_framework_1.default.http("bitmap-server", (req, res) => {
    (0, BitmapHttpServer_1.default)(req, res);
});
