import * as express from "express";
import { logger } from "../logger";

export const logRequest = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction | undefined
) => {
  const [oldWrite, oldEnd] = [res.write, res.end];
  const chunks: Buffer[] = [];

  (res.write as unknown) = function (chunk) {
    chunks.push(Buffer.from(chunk));
    (oldWrite as Function).apply(res, arguments);
  };

  res.end = function (chunk) {
    if (chunk) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks).toString("utf8");
    logger.info(
      {
        time: new Date().toUTCString(),
        fromIP: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        method: req.method,
        originalUri: req.originalUrl,
        uri: req.url,
        requestData: JSON.stringify(req.body),
        responseData: JSON.stringify(body), // THIS IS NOT FILLED WHEN 304 RETURNED / CACHE IS HIT
        statusCode: res.statusCode,
        referer: req.headers.referer || "",
        // ua: req.headers["user-agent"],
      },
    );
    (oldEnd as Function).apply(res, arguments);
  };
  if (next) {
    next();
  }
};
