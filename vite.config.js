import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // Keep Three.js's core and renderer in independently cached chunks.
            { name: 'three-core', test: /\/three\/build\/three\.core\.js$/ },
            { name: 'three-renderer', test: /\/three\/build\/three\.module\.js$/ },
            { name: 'react', test: /\/node_modules\/(react|react-dom|scheduler)\// },
          ],
        },
      },
    },
  },
})
