import { defineConfig } from 'vite';
export default defineConfig({
// Базовый путь. Если будешь выкладывать на GitHub Pages в папку репозитория,
// поменяй на '/repo-name/'. Для корня сайта оставь './'
base: './',
build: {
outDir: 'dist', // Куда складывать готовую сборку
assetsDir: 'assets',
sourcemap: true, // Помогает искать ошибки в сжатом коде
minify: 'terser', // Используем хороший минификатор
},
server: {
port: 3000,
open: true // Автоматически открывать браузер при запуске
}
});