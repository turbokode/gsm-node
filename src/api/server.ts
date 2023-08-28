import axios from "axios";

export const api = axios.create({
  baseURL: "https://power-switch-back-end.onrender.com",
});
