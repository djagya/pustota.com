import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        manifesto: resolve(__dirname, "manifesto/index.html"),
        "manifesto-ru": resolve(__dirname, "manifesto/ru/index.html"),
      },
    },
  },
  plugins: [
    {
      name: "manifesto-slash",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === "/manifesto") {
            req.url = "/manifesto/";
          } else if (req.url === "/manifesto/ru") {
            req.url = "/manifesto/ru/";
          } else if (req.url === "/manifesto/en" || req.url === "/manifesto/en/") {
            req.url = "/manifesto/";
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === "/manifesto") {
            req.url = "/manifesto/";
          } else if (req.url === "/manifesto/ru") {
            req.url = "/manifesto/ru/";
          } else if (req.url === "/manifesto/en" || req.url === "/manifesto/en/") {
            req.url = "/manifesto/";
          }
          next();
        });
      },
    },
  ],
});
