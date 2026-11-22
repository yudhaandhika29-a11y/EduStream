# Memperbaiki login AdminEdu yang menampilkan Invalid login credentials

Login AdminEdu menggunakan alias Auth internal `adminedu@accounts.edustream.example.com`. Migrasi SQL hanya menyiapkan role `admin`; migrasi tidak otomatis membuat pengguna Auth dan password Admin. Karena itu akun Auth harus dibuat/diperbarui melalui `bootstrap-admin.mjs`.

## 1. Periksa project yang digunakan

Pastikan Project URL pada HTML sama persis dengan `SUPABASE_URL` yang dipakai di terminal. URL harus berbentuk `https://PROJECT-REF.supabase.co`, tanpa `/rest/v1/`. Pastikan publishable/anon key pada HTML berasal dari project yang sama.

## 2. Pastikan migrasi selesai

Di SQL Editor, jalankan secara berurutan jika belum: `EduStream_Supabase.sql`, `EduStream_Admin_Migration.sql`, dan `EduStream_NIS_NIP_Migration.sql`. Jangan jalankan SQL utama jika tabel dan kebijakan telah dibuat kecuali memang perlu instalasi ulang.

## 3. Jalankan pemeriksaan tanpa mengubah data

Buka `Periksa_Admin.sql`, jalankan di SQL Editor, dan baca kolom `status_pemeriksaan`.

## 4. Buat atau reset AdminEdu

Paket berisi `bootstrap-admin.mjs` yang sudah diperbaiki. Skrip ini aman dijalankan berulang: jika Auth AdminEdu belum ada, skrip membuatnya; jika sudah ada, skrip memperbarui password. Skrip juga memastikan profil `adminedu` mempunyai role `admin`.

1. Pastikan Node.js terpasang.
2. Di folder paket, ubah `package-bootstrap-admin.json` menjadi `package.json` (jika belum).
3. Buka PowerShell pada folder itu dan jalankan `npm install`.
4. Salin Project URL dan Secret/service_role key dari project Supabase yang sama. Gunakan key istimewa hanya di terminal lokal.
5. Jalankan (masukkan URL dan key milikmu sendiri):

```powershell
$env:SUPABASE_URL="https://PROJECT-REF.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="ISI_SECRET_SERVICE_ROLE_KEY"
$env:EDUSTREAM_ADMIN_PASSWORD="Edustream*1"
node .\bootstrap-admin.mjs
```

Jangan pernah menempelkan Secret/service_role key ke HTML, JavaScript frontend, GitHub, atau percakapan. Jangan membagikan nilai key tersebut.

Jika skrip melaporkan bahwa role Admin gagal disimpan, jalankan `EduStream_Admin_Migration.sql` pada project yang sama lalu ulangi skrip. Jika username `adminedu` sudah dipakai profil lain, hentikan dan periksa data tersebut terlebih dahulu.

## 5. Login kembali

1. Pastikan HTML memakai Project URL dan publishable/anon key dari project yang sama.
2. Muat ulang website dengan `Ctrl + Shift + R`.
3. Pilih peran **Administrator**.
4. Username `AdminEdu`.
5. Gunakan password yang dimasukkan ke `EDUSTREAM_ADMIN_PASSWORD` pada langkah skrip.

Jika kamu menjalankan skrip dengan password yang berbeda dari `Edustream*1`, gunakan password yang dipakai saat menjalankan skrip.

## Penting

- `Invalid login credentials` biasanya berarti akun Auth tidak ada di project yang dituju, password berbeda, atau website dan skrip menunjuk ke project Supabase yang berbeda.
- Jangan membuat akun Admin lewat form signup publik.
- Setelah berhasil login, segera ganti password awal dengan password kuat dan rahasia.
- Deploy Edge Function `edustream-admin` tetap diperlukan untuk edit/hapus akun melalui panel Admin, tetapi tidak diperlukan hanya untuk login Admin.
