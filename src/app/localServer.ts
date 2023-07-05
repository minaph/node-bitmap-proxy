// const handler = require("./local/api/index").default;
import { scrapingService } from "./ScrapingService";
import { server } from "../server/BmpHttpServer";

import * as fs from "fs";
import * as https from "https";

// relative to the root of the project
const sslServerKey = "./ssl/privatekey.pem";
const sslServerCrt = "./ssl/cert.pem";

var options = {
  key: fs.readFileSync(sslServerKey),
  cert: fs.readFileSync(sslServerCrt),
};

const handler = server(scrapingService, "none");


https
  .createServer(options, (req, res) => {
    // const url = new URL(req.url, "https://localhost:3000");
    // if (url.searchParams.has("q")) {
    //   req.query = { q: url.searchParams.get("q") };
    // } else {
    //   req.query = { q: url.pathname.substring(1) };
    // }
    // res.status = (code: any) => {
    //   res.statusCode = code;
    //   return res;
    // };
    // res.send = (body: any) => {
    //   res.end(body);
    //   return res;
    // };
    handler(req, res);
    // res.writeHead(200);
    // res.end("hello world\n");
  })
  .listen(3001);

console.log("Server running at https://localhost:3001/");
