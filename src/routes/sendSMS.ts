import { Router } from "express";
import * as controller from "../controllers/send_sms";

const routes = Router();

routes.post("/", controller.send);

export { routes as sendSMSRoutes };
