import bodyParser from "body-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import "./dotenv";
import { logger } from "./logger";
import { logRequest } from "./logger/middleware";
import { Routes } from "./routes";

const app = express();
app.enable("trust proxy");
app.use(cors());
app.use(bodyParser.json());

if(process.env.NODE_ENV !== `test`) {
  app.use(logRequest);
}

// register express routes from defined application routes
Routes.forEach((route) => {
  (app as any)[route.method](
    route.route,
    async (req: Request, res: Response, next: Function) => {
      try {
        const result = await new (route.controller as any)()[route.action](
          req,
          res,
          next
        );

        // if the method returned undefined it means it handled the error itself
        if(typeof result === `undefined`) return;

        return res.json(result);
      } catch (err) {
        logger.error(err.stack);
        next(err);
      }
    }
  );
});

export default app;
