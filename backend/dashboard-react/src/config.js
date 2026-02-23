// Dynamic API base URL that works on both desktop and mobile
export const API_BASE_URL = window.location.origin;

// Cloudinary Configuration for direct uploads (no backend needed)
export const CLOUDINARY_CONFIG = {
  CLOUD_NAME: 'dzgccprpv',
  UPLOAD_PRESET: 'course_uploads', // Unsigned preset for direct uploads
  API_URL: 'https://api.cloudinary.com/v1_1/dzgccprpv/image/upload'
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    GOOGLE: `${API_BASE_URL}/api/auth/google`,
    PROFILE: `${API_BASE_URL}/api/auth/profile`,
    CHANGE_PASSWORD: `${API_BASE_URL}/api/auth/change-password`,
  },
  FILES: {
    GET_ALL: `${API_BASE_URL}/api/files`,
    UPLOAD: `${API_BASE_URL}/api/files/upload`,
    SAVE_FILE: `${API_BASE_URL}/api/files/save`, // New endpoint to save uploaded file metadata
    DELETE: (id) => `${API_BASE_URL}/api/files/${id}`,
    RENAME: (id) => `${API_BASE_URL}/api/files/rename/${id}`,
    DOWNLOAD: (id) => `${API_BASE_URL}/api/files/download/${id}`,
    CHECK_STORAGE: `${API_BASE_URL}/api/files/check-storage`,
  },
  CONTACT: {
    SEND: `${API_BASE_URL}/api/contact`,
  },
};

console.log("🌐 API Base URL:", API_BASE_URL);
console.log("☁️ Cloudinary Cloud:", CLOUDINARY_CONFIG.CLOUD_NAME);
