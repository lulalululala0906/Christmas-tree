/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",  // 匹配入口 html 文件
    "./**/*.{js,ts,jsx,tsx}",  // 匹配 src 目录下所有相关文件（若有）
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
