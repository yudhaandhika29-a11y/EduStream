-- EduStream Supabase schema
-- Jalankan seluruh script ini sekali melalui Supabase Dashboard > SQL Editor.
-- Frontend menggunakan anon/publishable key saja; jangan pernah menaruh service_role key di HTML.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username) and username ~ '^[a-z0-9._-]{3,24}$'),
  role text not null check (role in ('student','bk')),
  wa_number text,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  constraint profiles_role_wa_check check (
    (role = 'student' and wa_number is null) or
    (role = 'bk' and wa_number is not null and wa_number ~ '^[0-9]{10,15}$')
  )
);

comment on column public.profiles.username is
  'Identifier login EduStream: NIS untuk role student, Nomor Induk Guru untuk role bk, dan username adminedu untuk role admin.';

create table if not exists public.student_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  completed_modules text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.student_journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target text not null check (char_length(target) between 1 and 120),
  target_date date not null,
  duration text not null default '25 menit',
  obstacle text not null default '',
  strategy text not null default '',
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists student_journals_user_created_idx on public.student_journals(user_id, created_at desc);

create table if not exists public.student_reflections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  selected jsonb not null default '[]'::jsonb,
  subject text not null default '',
  difficult text not null default '',
  next_step text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.bk_preparation_notes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  topic text not null default '',
  note text not null default '',
  updated_at timestamptz not null default now()
);

-- Profil dibuat otomatis saat Supabase Auth membuat akun.
-- Siswa langsung aktif; akun Guru BK menunggu persetujuan administrator.
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

drop trigger if exists edustream_on_auth_user_created on auth.users;
create trigger edustream_on_auth_user_created
after insert on auth.users
for each row execute procedure public.edustream_handle_new_user();

-- RLS: semua tabel aplikasi diproteksi. Profil yang bisa dibaca siswa hanyalah profil BK terverifikasi.
alter table public.profiles enable row level security;
alter table public.student_progress enable row level security;
alter table public.student_journals enable row level security;
alter table public.student_reflections enable row level security;
alter table public.bk_preparation_notes enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.student_progress from anon, authenticated;
revoke all on table public.student_journals from anon, authenticated;
revoke all on table public.student_reflections from anon, authenticated;
revoke all on table public.bk_preparation_notes from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.student_progress to authenticated;
grant select, insert, update, delete on table public.student_journals to authenticated;
grant select, insert, update, delete on table public.student_reflections to authenticated;
grant select, insert, update, delete on table public.bk_preparation_notes to authenticated;

drop policy if exists "Read own profile and approved BK directory" on public.profiles;
create policy "Read own profile and approved BK directory"
on public.profiles for select to authenticated
using (
  (select auth.uid()) = id
  or (role = 'bk' and approved = true)
);

-- Siswa hanya mengakses progres miliknya sendiri.
drop policy if exists "Students manage own progress" on public.student_progress;
create policy "Students manage own progress" on public.student_progress
for all to authenticated
using (
  (select auth.uid()) = user_id
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student')
)
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student')
);

-- Jurnal hanya dapat dibaca/diubah/dihapus oleh pemiliknya.
drop policy if exists "Students manage own journals" on public.student_journals;
create policy "Students manage own journals" on public.student_journals
for all to authenticated
using (
  (select auth.uid()) = user_id
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student')
)
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student')
);

-- Refleksi hanya dapat diakses oleh pemiliknya.
drop policy if exists "Students manage own reflections" on public.student_reflections;
create policy "Students manage own reflections" on public.student_reflections
for all to authenticated
using (
  (select auth.uid()) = user_id
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student')
)
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student')
);

-- Catatan persiapan konsultasi bersifat pribadi bagi siswa terkait.
drop policy if exists "Students manage own BK preparation notes" on public.bk_preparation_notes;
create policy "Students manage own BK preparation notes" on public.bk_preparation_notes
for all to authenticated
using (
  (select auth.uid()) = user_id
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student')
)
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student')
);

-- Setelah memverifikasi identitas Guru BK secara manual, jalankan contoh ini:
-- update public.profiles set approved = true
-- where username = 'username_guru_bk' and role = 'bk';

-- Untuk menolak/menonaktifkan akun Guru BK:
-- update public.profiles set approved = false
-- where username = 'username_guru_bk' and role = 'bk';
