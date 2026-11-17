# Netcom Analytics — Referensi API & Koleksi Postman

Direktori ini berisi koleksi Postman resmi dan dokumentasi referensi REST API untuk platform Netcom E-Commerce.

---

## Koleksi Postman

Berkas koleksi API tersedia pada:
* **[netcom_api_collection.postman_collection.json](netcom_api_collection.postman_collection.json)** (Format Postman v2.1.0)

### Fitur yang Disertakan dalam Koleksi:
* **Environment Variables Siap Pakai:** Nilai bawaan `baseUrl` diatur ke `http://127.0.0.1:5000`.
* **Pengambilan Token Otomatis (Auto Token Capture):** Menjalankan request **Login - Admin Role** akan secara otomatis mengekstrak token JWT dari respons dan menyimpannya ke variabel koleksi `jwt_token`.
* **Otorisasi Otomatis:** Seluruh endpoint yang terproteksi dalam koleksi akan langsung mewarisi header `Bearer {{jwt_token}}` tanpa perlu salin-tempel token secara manual.
* **Parameter Uji Realistis:** Dilengkapi parameter query dan ID nyata yang sesuai dengan dataset Brazilian E-Commerce (misalnya tanggal transaksi Black Friday 2017, ID pelanggan valid, dan composite primary key).

---

## Cara Impor & Penggunaan

1. Buka aplikasi **Postman**, lalu klik tombol **Import** (di kiri atas).
2. Seret dan lepas berkas `netcom_api_collection.postman_collection.json` (atau pilih berkas secara manual).
3. Pastikan server backend sudah berjalan:
   ```bash
   python backend/app.py
   ```
4. Pada koleksi yang sudah diimpor, jalankan request:
   **Authentication & RBAC &rarr; Login - Admin Role**
5. Script pengujian Postman akan otomatis menyimpan token ke variabel `{{jwt_token}}`.
6. Anda kini dapat langsung mengeksekusi request apa pun di dalam folder Analytics, Orders, maupun CRUD.

---

## Autentikasi & Akun Uji Coba

Setiap endpoint yang terproteksi membutuhkan header `Authorization: Bearer <token>`. Database telah dilengkapi dengan tiga akun pengujian berbasis peran (*Role-Based Access Control* / RBAC):

| Peran (Role) | Username | Password | Cakupan Hak Akses |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin@123` | Akses Penuh: Manajemen pengguna, mutasi CRUD lengkap (*create/read/update/delete*), pembaruan status pesanan, dan seluruh analitik. |
| **Manager** | `manager` | `Manager@123` | Akses Operasional: Menambah dan memperbarui data pada CRUD, memperbarui status pesanan, dan melihat analitik (tidak dapat menghapus data atau mengelola pengguna). |
| **Viewer** | `viewer` | `Viewer@123` | Akses Hanya Baca (*Read-Only*): Hanya dapat melihat dasbor dan tabel. Seluruh percobaan mutasi (POST, PUT, PATCH, DELETE) akan mengembalikan respons `403 Forbidden`. |

---

## Ringkasan Endpoint API

### 1. Sistem
* `GET /api/health` — Pemeriksaan status koneksi database. Mengembalikan status `200 OK` jika terhubung.

### 2. Autentikasi & Pengguna
* `POST /api/auth/login` — Verifikasi kredensial pengguna; mengembalikan token JWT dan profil akun.
* `GET /api/auth/me` — Mengambil data profil dan klaim peran (*role*) dari token pengguna yang sedang aktif.
* `GET /api/auth/users` — Menampilkan daftar pengguna terdaftar (Khusus Admin).

### 3. Analitik & Antrean Operasional
* `GET /api/analytics/overview` — Metrik KPI utama platform (total omzet merchandise, jumlah pesanan, total pembeli, distribusi kategori produk, dan metode pembayaran).
* `GET /api/analytics/daily-revenue?year=2017&month=11` — Data runtun waktu (*time series*) pendapatan harian dan volume pesanan. Mendukung filter `year=all` dan `month=all`.
* `GET /api/analytics/anomalies?year=2017&method=zscore&threshold=2.5` — Deteksi anomali statistik harian (Z-Score dan IQR) untuk mengidentifikasi lonjakan permintaan ekstrem.
* `GET /api/analytics/unshipped-orders?page=1&page_size=20&status=all` — Antrean operasional pesanan belum terkirim yang dilengkapi indikator batas waktu pengiriman (SLA).
* `PATCH /api/analytics/orders/<order_id>/status` — Memperbarui status pemrosesan pesanan (`shipped`, `delivered`, `canceled`).

### 4. Mesin CRUD Universal (9 Entitas Dataset)
Mendukung seluruh 9 entitas relasional: `customers`, `orders`, `order_items`, `order_payments`, `order_reviews`, `products`, `sellers`, `geolocation`, dan `product_category_translation`.

* `GET /api/crud/datasets` — Menampilkan daftar 9 dataset beserta total baris data terkini dan skema primary key.
* `GET /api/crud/schema/<dataset>` — Introspeksi skema tabel (tipe data kolom, nullability, dan batasan integritas data).
* `GET /api/crud/<dataset>?page=1&per_page=25&search=<query>&sort_by=<col>&sort_order=<asc|desc>` — Mengambil data dengan paginasi, pengurutan (*sorting*), dan pencarian multi-kolom di sisi server.
* `GET /api/crud/<dataset>/<id>` — Mengambil satu baris data berdasarkan kunci. Untuk composite key, gunakan pemisah garis miring (misal: `/api/crud/order_items/<order_id>/<order_item_id>`).
* `POST /api/crud/<dataset>` — Menambahkan baris data baru (Admin/Manager).
* `PUT /api/crud/<dataset>/<id>` — Memperbarui baris data yang ada (Admin/Manager).
* `DELETE /api/crud/<dataset>/<id>` — Menghapus baris data (Khusus Admin).
