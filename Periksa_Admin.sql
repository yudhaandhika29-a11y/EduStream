-- Jalankan di Supabase SQL Editor pada project yang sama dengan website EduStream.
-- Query ini tidak mengubah data; hanya memeriksa akun Auth dan profil AdminEdu.

select
  u.id,
  u.email,
  u.email_confirmed_at,
  p.username,
  p.role,
  p.approved,
  case
    when u.id is null then 'AUTH USER TIDAK DITEMUKAN - jalankan bootstrap-admin.mjs'
    when p.id is null then 'PROFILE TIDAK DITEMUKAN - jalankan bootstrap-admin.mjs setelah migrasi'
    when p.role <> 'admin' then 'ROLE BELUM ADMIN - jalankan bootstrap-admin.mjs setelah migrasi Admin'
    when u.email_confirmed_at is null then 'EMAIL INTERNAL BELUM TERKONFIRMASI - perbaiki dengan bootstrap-admin.mjs'
    else 'AKUN ADMIN TERDAFTAR - pastikan HTML menggunakan Project URL ini dan password sesuai'
  end as status_pemeriksaan
from (select id, email, email_confirmed_at from auth.users
      where lower(email) = 'adminedu@accounts.edustream.example.com') u
full join public.profiles p
  on p.id = u.id
where (u.email is not null)
   or p.username = 'adminedu';
