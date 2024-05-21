import "dotenv/config";
import AppQueue from "./libs/Queue";

AppQueue.process();

console.log("🏍 Queue process started!");
