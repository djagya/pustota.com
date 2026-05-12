import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        credo: resolve(__dirname, "credo/index.html"),
        "credo-ru": resolve(__dirname, "credo/ru/index.html"),
      },
    },
  },
  plugins: [
    {
      name: "credo-routes",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const u = req.url?.split("?")[0] ?? "";
          if (u === "/manifesto" || u === "/manifesto/") {
            req.url = "/credo/";
          } else if (u === "/manifesto/ru" || u === "/manifesto/ru/") {
            req.url = "/credo/ru/";
          } else if (u === "/manifesto/en" || u === "/manifesto/en/") {
            req.url = "/credo/";
          } else if (u === "/credo") {
            req.url = "/credo/";
          } else if (u === "/credo/ru") {
            req.url = "/credo/ru/";
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, _res, next) => {
          const u = req.url?.split("?")[0] ?? "";
          if (u === "/manifesto" || u === "/manifesto/") {
            req.url = "/credo/";
          } else if (u === "/manifesto/ru" || u === "/manifesto/ru/") {
            req.url = "/credo/ru/";
          } else if (u === "/manifesto/en" || u === "/manifesto/en/") {
            req.url = "/credo/";
          } else if (u === "/credo") {
            req.url = "/credo/";
          } else if (u === "/credo/ru") {
            req.url = "/credo/ru/";
          }
          next();
        });
      },
    },
  ],
});
