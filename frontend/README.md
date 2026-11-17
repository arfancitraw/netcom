# Netcom Analytics — Frontend

Aplikasi web client untuk platform analitik operasional dan intelijen bisnis Netcom E-Commerce.

## Tech Stack
- React 19
- Vite 8
- Tailwind CSS
- Chart.js & react-chartjs-2
- Lucide React

## Panduan Pengembangan (Development)
```bash
npm install
npm run dev
```

Aplikasi berjalan pada `http://localhost:3000` dan secara otomatis meneruskan (*proxy*) permintaan API ke backend Flask di `http://127.0.0.1:5000`.

## Production Build
```bash
npm run build
```
Menghasilkan berkas aset statis produksi di dalam direktori `dist/`.
