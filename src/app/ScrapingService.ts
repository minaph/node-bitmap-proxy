// import * as http from "http";
// import * as https from "https";
import { http, https } from "follow-redirects";
import { BmpResponseContent } from "../server/BmpResponse";
import { URL } from "url";


export async function scrapingService(request: string, callback: (content: BmpResponseContent) => void) {
  const urls = request.split(" ");
  const contentList: { url: string, content: string }[] = [];
  for (const url of urls) {
    let content = "";
    content = await webRequest(url);
    contentList.push({
      url,
      content
    });
  }
  callback({
    headers: {},
    status: 200,
    statusText: "OK",
    body: Buffer.from(JSON.stringify(contentList)),
  });
}

function webRequest(url: string) {
  return new Promise<string>((resolve, reject) => {
    const req = (url.startsWith("https") ? https : http).get({
      timeout: 5000,
      maxRedirects: 10,
      ...new URL(url)
    }, (res) => {
      const dataBuffer = [] as Buffer[];

      res.on("data", (data) => {
        if (typeof data === "string") {
          dataBuffer.push(Buffer.from(data));
        } else {
          dataBuffer.push(data);
        }
      });

      res.on("end", () => {
        resolve(Buffer.concat(dataBuffer).toString());
      });
    })
    req.on("error", (e) => {
      reject(e);
    })
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    })
  });
}
