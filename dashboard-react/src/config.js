const DEFAULT_API_BASE_URL = "https://claud-storage.onrender.com";
const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL)
  .trim()
  .replace(/\/+$/, "");

// Set VITE_API_BASE_URL in Vercel if backend URL changes.
export const API_BASE_URL = configuredApiBaseUrl;

// Cloudinary Configuration for direct uploads (no backend needed)
export const CLOUDINARY_CONFIG = {
  CLOUD_NAME: "dzgccprpv",
  UPLOAD_PRESET: "course_uploads", // Unsigned preset for direct uploads
  API_URL: "https://api.cloudinary.com/v1_1/dzgccprpv/image/upload",
};

const buildApiUrl = (path) => `${API_BASE_URL}${path}`;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: buildApiUrl("/api/auth/login"),
    REGISTER: buildApiUrl("/api/auth/register"),
    PROFILE: buildApiUrl("/api/auth/profile"),
    PROFILE_PHOTO: buildApiUrl("/api/auth/profile-photo"),
    CHANGE_PASSWORD: buildApiUrl("/api/auth/change-password"),
    DELETE_ACCOUNT: buildApiUrl("/api/auth/delete-account"),
  },
  FILES: {
    GET_ALL: buildApiUrl("/api/files"),
    GET_TRASH: buildApiUrl("/api/files/trash"),
    UPLOAD: buildApiUrl("/api/files/upload"),
    SAVE_FILE: buildApiUrl("/api/files/save"), // New endpoint to save uploaded file metadata
    DELETE: (id) => buildApiUrl(`/api/files/${id}`),
    MOVE_TO_TRASH: (id) => buildApiUrl(`/api/files/trash/${id}`),
    RESTORE_FROM_TRASH: (id) => buildApiUrl(`/api/files/restore/${id}`),
    DELETE_FROM_TRASH: (id) => buildApiUrl(`/api/files/trash/${id}`),
    FAVORITE: (id) => buildApiUrl(`/api/files/favorite/${id}`),
    RENAME: (id) => buildApiUrl(`/api/files/rename/${id}`),
    DOWNLOAD: (id) => buildApiUrl(`/api/files/download/${id}`),
    CHECK_STORAGE: buildApiUrl("/api/files/check-storage"),
  },
  CONTACT: {
    SEND: buildApiUrl("/api/contact"),
  },
};

console.log("API Base URL:", API_BASE_URL);
console.log("Cloudinary Cloud:", CLOUDINARY_CONFIG.CLOUD_NAME);
