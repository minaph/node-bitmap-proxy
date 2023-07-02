import { server } from "./server/BmpHttpServer";
import { proxyService } from "./app/proxyService";
import { scrapingService } from "./app/ScrapingService";

const proxy = server(proxyService, "gcs");
const scraping = server(scrapingService, "gcs");

export { proxy, scraping };

