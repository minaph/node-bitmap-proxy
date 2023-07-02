import { server } from "../src/server/BmpHttpServer";
import { proxyService } from "../src/app/proxyService";

const handler = server(proxyService);


export default handler