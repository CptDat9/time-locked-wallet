import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      buffer: "buffer", // alias cho buffer
      process: "process/browser", // một số lib Solana cũng gọi process.env
    },
  },
  define: {
    "process.env": {}, // tránh lỗi process
  },
   optimizeDeps: {
    include: [
      "buffer",
      "@solana/web3.js",
      "@solana/spl-token",
      "@solana/spl-token-metadata"
    ],
  },
});
