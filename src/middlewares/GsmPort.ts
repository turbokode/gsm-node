import { NextFunction, Request, Response } from "express";
import { GSMPortType } from "../@types/app";

export class GsmPort {
  #port: GSMPortType;

  constructor(port: GSMPortType) {
    this.#port = port;
  }

  handle(req: Request, res: Response, next: NextFunction) {
    if (!this.#port) {
      console.error("GSM port canot be null!");
      return;
    }

    req.gsmPort = this.#port;

    next();
  }
}
