// Konfigurasi Cloudinary - Ganti dengan credential Anda
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'your-upload-preset';

/**
 * Validasi file gambar sebelum upload
 */
export const validateImageFile = (file) => {
  if (!file) return { ok: false, error: 'File tidak dipilih.' };
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return { ok: false, error: 'Format file harus JPG, PNG, WEBP, atau GIF.' };
  }
  
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { ok: false, error: `Ukuran file maksimal 5MB. File Anda: ${(file.size / 1024 / 1024).toFixed(2)}MB` };
  }
  
  return { ok: true };
};

/**
 * Upload gambar ke Cloudinary
 */
export const uploadImageToCloudinary = async (file, folder = 'general') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Gagal upload ke Cloudinary. Periksa konfigurasi cloud_name dan upload_preset.');
  }

  const data = await response.json();
  return {
    url: data.secure_url,
    publicId: data.public_id,
  };
};

/**
 * Optimasi URL Cloudinary (resize, compress)
 */
export const optimizedUrl = (url, options = {}) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  const { width = 800, quality = 80 } = options;
  
  // Sisipkan transformasi ke URL Cloudinary
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;
  
  return `${parts[0]}/upload/c_scale,w_${width},q_${quality}/${parts[1]}`;
};
