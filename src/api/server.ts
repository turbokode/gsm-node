import axios from "axios";

export const api = axios.create({
  baseURL: "https://power-switch-back-end.onrender.com",
  headers: {
    Authorization:
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTMwMjYxMzYsImV4cCI6MTAzMzI5Mzk3MzYsInN1YiI6ImQ2MTY4ODk3LWI1MGMtNGE5Yy04ZTg3LWZmYjNlMmY1ZTBmNSJ9.1a9lMAmQjIEoVWUkAnNa46K-aJbSSmLbiFjfdjPlcoQ",
  },
});
