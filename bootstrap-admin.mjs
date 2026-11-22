import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.EDUSTREAM_ADMIN_PASSWORD;
const email = "adminedu@accounts.edustream.example.com";

if (!url || !serviceKey || !password) {
  console.error("Isi SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, dan EDUSTREAM_ADMIN_PASSWORD di terminal terlebih dahulu.");
  process.exit(1);
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url.trim())) {
  console.error("SUPABASE_URL harus berupa Project URL dasar, contoh https://PROJECT-REF.supabase.co (tanpa /rest/v1/).");
  process.exit(1);
}
if (password.length < 8 || password.length > 72) {
  console.error("Password admin harus 8–72 karakter.");
  process.exit(1);
}

const supabase = createClient(url.trim().replace(/\/$/, ""), serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findAdminUser() {
  const perPage = 1000;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Gagal memeriksa pengguna Auth: ${error.message}`);
    const found = (data.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email);
    if (found) return found;
    if ((data.users ?? []).length < perPage) return null;
  }
  throw new Error("Pencarian akun melewati batas halaman. Periksa Auth > Users secara manual.");
}

try {
  // Jika akun sudah ada, password diperbarui. Jika belum ada, akun baru dibuat.
  const existing = await findAdminUser();
  let user;

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { username: "adminedu", role: "student" },
    });
    if (error) throw new Error(`Akun Admin ditemukan, tetapi password gagal diperbarui: ${error.message}`);
    user = data.user;
    console.log("Akun Auth AdminEdu sudah ada; password berhasil diperbarui.");
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: "adminedu", role: "student" },
    });
    if (error) throw new Error(`Gagal membuat akun Auth AdminEdu: ${error.message}`);
    user = data.user;
    console.log("Akun Auth AdminEdu berhasil dibuat.");
  }

  // Pastikan profil Admin ada dan role-nya benar. Ini perlu Admin migration.
  const { data: profileByUsername, error: lookupError } = await supabase
    .from("profiles")
    .select("id, username, role")
    .eq("username", "adminedu")
    .maybeSingle();
  if (lookupError) throw new Error(`Tidak dapat membaca public.profiles: ${lookupError.message}. Pastikan EduStream_Supabase.sql dan EduStream_Admin_Migration.sql sudah dijalankan.`);
  if (profileByUsername && profileByUsername.id !== user.id) {
    throw new Error("Username internal 'adminedu' sudah dipakai profil lain. Jangan hapus akun tersebut secara langsung; periksa public.profiles terlebih dahulu.");
  }

  const { data: ownProfile, error: ownLookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (ownLookupError) throw new Error(`Gagal memeriksa profil Admin: ${ownLookupError.message}`);

  const profileValues = { id: user.id, username: "adminedu", role: "admin", approved: true, wa_number: null };
  const profileWrite = ownProfile
    ? await supabase.from("profiles").update({ username: "adminedu", role: "admin", approved: true, wa_number: null }).eq("id", user.id)
    : await supabase.from("profiles").insert(profileValues);

  if (profileWrite.error) {
    throw new Error(`Auth sudah tersedia, tetapi role Admin gagal disimpan: ${profileWrite.error.message}. Pastikan EduStream_Admin_Migration.sql sudah dijalankan.`);
  }

  console.log("\nBERHASIL: akun administrator siap digunakan.");
  console.log("Pilihan peran : Administrator");
  console.log("Username      : AdminEdu");
  console.log("Password      : sesuai nilai EDUSTREAM_ADMIN_PASSWORD yang kamu masukkan di terminal");
  console.log("Project       : " + url.trim().replace(/\/$/, ""));
  console.log("Catatan       : pastikan Project URL pada HTML sama persis dengan Project di atas.");
} catch (error) {
  console.error("\nPERBAIKAN ADMIN GAGAL:");
  console.error(error?.message ?? String(error));
  process.exit(1);
}
