import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	base: process.env.NODE_ENV === "production" ? "/mock-mapping-frontend/" : "/",
	server: {
		hmr: true, // Automatically refresh/reload the page behind the scenes to reflect code changes.
	},
});
