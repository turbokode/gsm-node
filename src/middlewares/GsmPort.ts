import { NextFunction, Request, Response } from "express";
import { GSMPortType } from "../@types/app";

export class GsmPort {
  gsmPort: GSMPortType;

  constructor(gsmPort: GSMPortType) {
    this.gsmPort = gsmPort;
  }

  handle(req: Request, res: Response, next: NextFunction) {
    console.log("PORT: ", this.gsmPort);

    if (!this.gsmPort) {
      console.error("GSM port canot be null!");
      return;
    }

    req.gsmPort = this.gsmPort;

    next();
  }
}
