const handler = require("./local/api/index").default;

const http = require("http");

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost:3000");
    req.query = { q: url.pathname.substring(1) };
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.send = (body) => {
      res.end(body);
      return res;
    };
    handler(req, res);
  })
  .listen(3000);
