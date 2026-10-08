// Konfigurasi Cloudinary — AMAN: hanya cloud name + unsigned preset di frontend
export const CLOUDINARY_CLOUD_NAME = 'ryp8rbvj';
export const CLOUDINARY_UPLOAD_PRESET = 'sppg_unsigned';

const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

export function validateImageFile(file) {
  if (!file) return { ok: false, error: 'Belum ada file dipilih.' };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: 'Format tidak didukung. Hanya JPG, JPEG, PNG, WEBP. Video tidak diizinkan.' };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `Ukuran file ${(file.size / 1024 / 1024).toFixed(1)}MB melebihi batas 2MB. Pilih foto yang lebih kecil.` };
  }
  return { ok: true };
}

export async function uploadImageToCloudinary(file, folder) {
  const check = validateImageFile(file);
  if (!check.ok) throw new Error(check.error);
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  form.append('folder', folder);
  const res = await fetch(UPLOAD_URL, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || 'Gagal upload ke Cloudinary.');
  }
  const json = await res.json();
  return { url: json.secure_url, publicId: json.public_id };
}

// URL dengan transformasi Cloudinary (compress + resize otomatis)
export function optimizedUrl(url, { width } = {}) {
  if (!url) return url;
  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const transforms = ['f_auto', 'q_auto', width ? `w_${width}` : '', 'c_limit'].filter(Boolean).join(',');
  return url.replace(marker, `${marker}${transforms}/`);
}
