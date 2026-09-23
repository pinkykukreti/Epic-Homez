// import { defineConfig } from "vite";
// export default defineConfig({
//   esbuild: { jsx: "automatic" },
//   build: {
//     rollupOptions: {
//       output: {
//         manualChunks: {
//           react: ["react", "react-dom", "react-router-dom"],
//           supabase: ["@supabase/supabase-js"],
//         },
//       },
//     },
//   },
// });

import { defineConfig } from "vite";

export default defineConfig({
  // base: "/Epic-Homez/",
  esbuild: { jsx: "automatic" },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
});
