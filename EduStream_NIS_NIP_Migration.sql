-- EduStream NIS / Nomor Induk Guru migration
-- Jalankan SETELAH EduStream_Supabase.sql.
-- Tidak menghapus akun atau data yang sudah ada.
-- Kolom public.profiles.username dipakai sebagai penyimpanan nilai NIS untuk siswa,
-- Nomor Induk Guru untuk Guru BK, dan tetap 'adminedu' untuk akun administrator.
-- UI tidak meminta alamat email; email alias hanya dipakai oleh Supabase Auth di belakang layar.

comment on column public.profiles.username is
  'Identifier login EduStream: NIS untuk role student, Nomor Induk Guru untuk role bk, dan username adminedu untuk role admin.';

create or replace function public.edustream_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_role text;
  v_wa text;
  v_admin_bootstrap boolean;
begin
  v_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'student');
  v_wa := regexp_replace(coalesce(new.raw_user_meta_data ->> 'wa_number', ''), '[^0-9]', '', 'g');
  v_admin_bootstrap := (v_role = 'student'
    and v_username = 'adminedu'
    and lower(coalesce(new.email, '')) = 'adminedu@accounts.edustream.example.com');

  if v_role not in ('student','bk') then
    raise exception 'Role EduStream tidak valid';
  end if;

  -- Siswa memakai NIS dan Guru BK memakai Nomor Induk Guru.
  -- Pengecualian adminedu hanya untuk skrip bootstrap akun admin yang kemudian
  -- langsung mengubah role profil menjadi admin.
  if not v_admin_bootstrap and v_username !~ '^[0-9]{3,24}$' then
    if v_role = 'student' then
      raise exception 'NIS harus terdiri dari 3-24 angka';
    else
      raise exception 'Nomor Induk Guru harus terdiri dari 3-24 angka';
    end if;
  end if;

  if v_role = 'bk' and (char_length(v_wa) < 10 or char_length(v_wa) > 15) then
    raise exception 'Nomor WhatsApp Guru BK tidak valid';
  end if;

  insert into public.profiles (id, username, role, wa_number, approved)
  values (
    new.id,
    v_username,
    v_role,
    case when v_role = 'bk' then v_wa else null end,
    (v_role = 'student' and not v_admin_bootstrap)
  );

  if v_role = 'student' and not v_admin_bootstrap then
    insert into public.student_progress (user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

-- Trigger yang sudah ada tetap terpasang dan menggunakan fungsi yang diperbarui.
