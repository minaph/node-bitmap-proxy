import { server } from "./server/BmpHttpServer";
import { proxyService } from "./app/proxyService";

const handler = server(proxyService);

export { handler };

