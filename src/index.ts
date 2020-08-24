import "./dotenv";
import { getNetworkName } from "./eos/networks";
import { logger } from "./logger";
import app from "./server";

async function start() {
  // start express server
  const PORT = process.env.PORT || 8080;
  const VERSION = process.env.npm_package_version
  app.set('views', __dirname + '/views');
  app.engine('html', require('ejs').renderFile);
  app.set('view engine', 'html');
  app.listen(PORT);
  
  logger.info(
    `Reporter v${VERSION} (${getNetworkName()}): Express server has started on port ${PORT}.\nOpen http://localhost:${PORT}/logs`
  );
}

start().catch(error => logger.error(error.message || error));

process.on("unhandledRejection", function(reason: any, p) {
  let message = reason ? (reason as any).stack : reason;
  logger.error(`Possibly Unhandled Rejection at: ${message}`);

  process.exit(1);
});
