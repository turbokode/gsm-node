"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configServer = void 0;
const server_1 = require("../api/server");
let tryCounter = 0;
function configServer() {
    return __awaiter(this, void 0, void 0, function* () {
        tryCounter++;
        return new Promise((resolve, reject) => {
            server_1.api
                .post("/configSystem/save", { smsServerURL: process.env.GSM_PORT }, {
                headers: {
                    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTMwMjYxMzYsImV4cCI6MTAzMzI5Mzk3MzYsInN1YiI6ImQ2MTY4ODk3LWI1MGMtNGE5Yy04ZTg3LWZmYjNlMmY1ZTBmNSJ9.1a9lMAmQjIEoVWUkAnNa46K-aJbSSmLbiFjfdjPlcoQ",
                },
            })
                .then(({ data }) => {
                resolve(JSON.stringify(data));
            })
                .catch(({ data }) => __awaiter(this, void 0, void 0, function* () {
                if (tryCounter === 10)
                    reject(`Failed when try to send SMS Server URL to API! \n==========\n${data} `);
                yield configServer();
            }))
                .finally(() => {
                tryCounter = 0;
            });
        });
    });
}
exports.configServer = configServer;
