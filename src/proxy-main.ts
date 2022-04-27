import { BitmapProxy } from "./BitmapProxy";

(function main() {
  const proxy = new BitmapProxy({
    whiteList: ["https://scrapbox.io"]
  });
  proxy.start();
})();
