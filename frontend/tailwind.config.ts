import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        nhost: {
          blue: '#1f6fed',
          dark: '#0d1117',
          card: '#161b22',
          border: '#30363d',
        },
      },
    },
  },
  plugins: [],
};
export default config;
