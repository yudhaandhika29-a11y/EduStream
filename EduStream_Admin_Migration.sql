-- EduStream Admin migration
-- Jalankan SETELAH EduStream_Supabase.sql pada Supabase SQL Editor.
-- Role admin HANYA diberikan manual setelah user dibuat melalui Supabase Auth Dashboard.

-- Izinkan role admin di tabel profiles; akun publik tetap hanya dapat mendaftar sebagai student/bk
-- karena trigger edustream_handle_new_user() tetap menolak metadata role admin.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student','bk','admin'));

-- Constraint ini juga harus mengizinkan profil administrator tanpa nomor WhatsApp.
alter table public.profiles drop constraint if exists profiles_role_wa_check;
alter table public.profiles add constraint profiles_role_wa_check check (
  (role = 'student' and wa_number is null) or
  (role = 'bk' and wa_number is not null and wa_number ~ '^[0-9]{10,15}$') or
  (role = 'admin' and wa_number is null)
);

-- Pastikan peran Admin tidak dapat diubah lewat metadata pendaftaran publik.
-- Trigger lama tetap hanya menerima student/bk, sehingga signup publik tidak bisa memilih admin.

-- Setelah membuat user admin melalui Authentication > Users > Add user,
-- pastikan user_metadata memuat username='adminedu' dan role='student' (untuk trigger awal).
-- Kemudian ubah profile akun khusus tersebut menjadi admin menggunakan SQL berikut:
-- UPDATE public.profiles p
-- SET role = 'admin', approved = true, wa_number = null
-- FROM auth.users u
-- WHERE u.id = p.id
--   AND lower(u.email) = 'adminedu@accounts.edustream.example.com'
--   AND p.username = 'adminedu';

-- Konfirmasi tidak ada username lain yang memperoleh role admin:
-- SELECT p.id, p.username, p.role, u.email
-- FROM public.profiles p JOIN auth.users u ON u.id=p.id
-- WHERE p.role='admin';
