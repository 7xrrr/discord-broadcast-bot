import axios, { AxiosInstance, AxiosProxyConfig, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { generateHeaders } from "./genrateHeaders.js";
import { client } from "../index.js";

interface ProxyConfig {
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
}
let proxyIndex = 0;

export const makeAxiosInstance = (
  token: string,
  useProxy: boolean = false,
): AxiosInstance => {
  const headers = generateHeaders(token);
  let config = {
    baseURL: "https://discord.com/api/v9/",
    headers: headers,
    timeout: 10000,
  } as AxiosRequestConfig;
  if (useProxy) {
    let currentProxyIndex = proxyIndex + 1;
    const proxyList = client.proxy;
    if (!proxyList.at(currentProxyIndex)) {
      currentProxyIndex = 0;
    }
    const proxy = proxyList.at(currentProxyIndex);
    if (proxy) {
      config.proxy = {
        protocol: "http",
        host: proxy.ip.split(":")[0],
        port: parseInt(proxy.ip.split(":")[1]),
        auth: {
          username: proxy.authentication.split(":")[0],
          password: proxy.authentication.split(":")[1],
        },
      } as AxiosProxyConfig;
      proxyIndex = currentProxyIndex;
    } else {
      console.warn("No valid proxy found, proceeding without proxy.");
    }
  }
  if (config.proxy) console.log(`Using proxy: ${config.proxy.host}:${config.proxy.port}`);
  const axiosInstance: AxiosInstance = axios.create(config);

  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  axiosInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return axiosInstance;
};
