# EduStream — Website Prototype

EduStream adalah prototipe website HTML, CSS, dan JavaScript untuk media psikoedukasi digital siswa SMA kelas X–XII.

## Cara menjalankan
1. Ekstrak folder `EduStream`.
2. Buka `index.html` menggunakan Chrome, Edge, Firefox, atau browser modern.
3. Website dapat digunakan tanpa server dan tanpa instalasi package.
4. Untuk pengembangan lebih lanjut, buka folder ini melalui editor kode seperti VS Code.

## Fitur
- Beranda dengan ringkasan progres aktivitas.
- Strategi Belajar: deep approach vs surface approach dan toolkit teknik belajar.
- Evaluasi Mandiri: lembar refleksi metakognitif.
- Jurnal Kemandirian: tambah, edit, hapus, filter, tandai tuntas, dan export CSV.
- Bantuan BK: informasi contoh sekolah yang dapat diatur dan catatan persiapan konsultasi pribadi.
- Tentang & Privasi: tujuan, batas penggunaan, serta kontrol hapus data lokal.
- Navigasi responsif untuk desktop dan ponsel.

## Penyimpanan dan privasi
Data jurnal, refleksi, catatan BK, dan pengaturan contoh disimpan pada `localStorage` browser di perangkat yang sedang digunakan. Tidak ada database atau server yang menerima data. Menghapus data browser atau menggunakan perangkat/browser lain berarti data lokal ini tidak otomatis ikut terbawa. Tombol **Hapus seluruh data lokal** menghapus data aplikasi dari browser aktif.

## Konfigurasi Bantuan BK
Nama, kontak, lokasi, dan jadwal BK belum ditentukan di proposal sebagai data sekolah tertentu. Karena itu bagian tersebut berupa placeholder dan dapat diisi oleh sekolah melalui tombol **Atur informasi contoh sekolah**. Informasi contoh tersebut hanya tersimpan di browser lokal dan bukan integrasi kontak resmi.

## Landasan proposal
Prototipe mengikuti enam menu dalam proposal: Beranda, Strategi Belajar, Evaluasi Mandiri, Jurnal Kemandirian, Bantuan BK, serta Tentang & Privasi. Konsepnya merujuk pada Biggs (2011), Flavell (1979), Zimmerman (2002), Sujarwo et al. (2023), serta Prayitno & Amti (2015). Teknik praktis seperti Active Recall, Spaced Practice, Mind Mapping, dan Explain It Simply ditampilkan sebagai contoh aktivitas pendukung, bukan klaim bahwa semua nama teknik tersebut tercantum dalam proposal.

## Batasan
EduStream bukan alat diagnosis, bukan tes psikologis, bukan pengganti konseling langsung, dan tidak menjanjikan peningkatan nilai secara instan. Prototipe ini belum terhubung dengan sistem sekolah, akun siswa, database online, atau pengiriman permintaan konsultasi.
