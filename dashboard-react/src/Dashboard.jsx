// ...existing code...
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "./config";
import { useAuthTransition } from "./AuthTransitionContext";
import "./css/dashboard.css";
import Chart from "chart.js/auto";
import Switch from "./Switch";
import Checkbox from "./Checkbox";
import Hamster from "./css/Hamster";
import Uploadloader from "./css/Uploadloader";
import { getApiErrorMessage, readApiResponse } from "./http";

const formatDateTime = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }
  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const formatQueuedSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const mapApiFile = (file) => ({
  _id: file._id,
  name: file.fileName,
  type: file.fileName?.split('.').pop()?.toUpperCase() || "FILE",
  size: file.fileSize ? (file.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown',
  updatedAt: file.uploadedAt,
  deletedAt: file.trashedAt,
  url: file.fileURL,
  isFavorite: Boolean(file.isFavorite),
  isImage: /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.fileName),
  isVideo: /\.(mp4|webm|ogg|mov|avi)$/i.test(file.fileName)
});

function Dashboard() {
  const navigate = useNavigate();
  const { completeAuthTransition } = useAuthTransition();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const filePickerRef = useRef(null);
  const mobileTapStateRef = useRef({ fileId: null, timestamp: 0 });
  const pendingMobileOpenRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('Home');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterMode, setFilterMode] = useState('all');
  const [selectedFilterType, setSelectedFilterType] = useState('all');
  const [userProfile, setUserProfile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeSection, setActiveSection] = useState('files');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [currentPath, setCurrentPath] = useState(['move']);
  const [activities, setActivities] = useState([]);
  const [isMyFilesExpanded, setIsMyFilesExpanded] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [showProfileUpload, setShowProfileUpload] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [trashedFiles, setTrashedFiles] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [selectedFileDetails, setSelectedFileDetails] = useState(null);
  const [isUploadBoxExpanded, setIsUploadBoxExpanded] = useState(true);
  const [queuedUploadFiles, setQueuedUploadFiles] = useState([]);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 767 : false
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const fetchProfile = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(API_ENDPOINTS.AUTH.PROFILE, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const { data } = await readApiResponse(res);
      if (data.success) {
        setUserProfile(data.user);
      }
    } catch (err) {
      console.error("Error fetching profile", err);
    }
  };

  const fetchFiles = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(API_ENDPOINTS.FILES.GET_ALL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { data, rawText } = await readApiResponse(res);
      if (!res.ok) {
        throw new Error(getApiErrorMessage(res, data, rawText, "Failed to fetch files"));
      }
      const fileList = Array.isArray(data) ? data : Array.isArray(data?.files) ? data.files : [];
      const mappedFiles = fileList.map(mapApiFile);
      setFiles(mappedFiles);
      setLoading(false);

      // 📊 Count file types by actual extension
      const typeCounts = {};
      const colorMap = {
        PDF: '#10b981',
        ZIP: '#4f46e5',
        PNG: '#f59e0b',
        JPG: '#ef4444',
        JPEG: '#ef4444',
        MP4: '#8b5cf6',
        DOC: '#3b82f6',
        DOCX: '#3b82f6',
        XLS: '#06b6d4',
        XLSX: '#06b6d4',
        TXT: '#6b7280',
        GIF: '#ec4899'
      };

      const chartLabels = [];
      const chartData = [];
      const chartColors = [];

      mappedFiles.forEach((file) => {
        const ext = file.type;
        typeCounts[ext] = (typeCounts[ext] || 0) + 1;
      });

      // Get top file types
      Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .forEach(([ext, count]) => {
          chartLabels.push(ext);
          chartData.push(count);
          chartColors.push(colorMap[ext] || '#9ca3af');
        });

      // 🧹 Destroy old chart
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // 📊 Create chart only if canvas ref exists
      if (chartRef.current && chartLabels.length > 0) {
        chartInstance.current = new Chart(chartRef.current, {
          type: "doughnut",
          data: {
            labels: chartLabels,
            datasets: [
              {
                data: chartData,
                backgroundColor: chartColors,
                borderColor: '#fff',
                borderWidth: 2
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { 
                position: "bottom",
                labels: { padding: 15, font: { size: 12 } }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return context.label + ': ' + context.parsed + ' files';
                  }
                }
              }
            },
          },
        });
      }
    } catch (err) {
      console.error("Error fetching files", err);
      setLoading(false);
    }
  };

  const fetchTrashFiles = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(API_ENDPOINTS.FILES.GET_TRASH, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { data, rawText } = await readApiResponse(res);
      if (!res.ok) {
        throw new Error(getApiErrorMessage(res, data, rawText, "Failed to fetch trash"));
      }

      const trashList = Array.isArray(data) ? data : Array.isArray(data?.files) ? data.files : [];
      setTrashedFiles(trashList.map(mapApiFile));
    } catch (err) {
      console.error("Error fetching trash files", err);
      setTrashedFiles([]);
    }
  };

  // Show username from userProfile if available, else fallback to localStorage
  const userName = (userProfile && userProfile.name) || localStorage.getItem("userName") || "User";

useLayoutEffect(() => {
  document.body.classList.remove("auth-page");
}, []);

useEffect(() => {

  // 🔐 Auth check
  const token = localStorage.getItem("token");
  if (!token) {
    completeAuthTransition();
    navigate('/login');
    return;
  }

  Promise.allSettled([fetchProfile(), fetchFiles(), fetchTrashFiles()]).finally(() => {
    completeAuthTransition();
  });

  return () => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
  };
}, [userName, navigate, completeAuthTransition]);

useEffect(() => {
  setProfilePhoto(userProfile?.profilePhoto || null);
}, [userProfile?.profilePhoto]);

useEffect(() => {
  setFavorites(files.filter((file) => file.isFavorite));
}, [files]);

useEffect(() => {
  return () => {
    if (pendingMobileOpenRef.current) {
      window.clearTimeout(pendingMobileOpenRef.current);
      pendingMobileOpenRef.current = null;
    }
  };
}, []);


  const logout = () => {
    localStorage.removeItem("token");
    navigate('/intro');
  };

  const handleProfilePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification('Please upload an image file');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showNotification('Profile photo should be less than 3MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        showNotification("Session expired. Please log in again.");
        navigate("/login");
        return;
      }

      try {
        const response = await fetch(API_ENDPOINTS.AUTH.PROFILE_PHOTO, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ profilePhoto: reader.result })
        });

        const { data, rawText } = await readApiResponse(response);
        if (!response.ok || !data?.success) {
          throw new Error(getApiErrorMessage(response, data, rawText, "Failed to update profile photo"));
        }

        setProfilePhoto(data?.user?.profilePhoto || reader.result);
        setUserProfile((prev) => (prev ? { ...prev, profilePhoto: data?.user?.profilePhoto || reader.result } : prev));
        setShowProfileUpload(false);
        setIsHamburgerOpen(false);
        showNotification("Profile photo updated", "success");
      } catch (err) {
        console.error("Profile photo update error:", err);
        showNotification(err.message || "Failed to update profile photo");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfilePhotoDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer?.files?.[0];
    if (!droppedFile) return;
    handleProfilePhotoUpload({ target: { files: [droppedFile] } });
  };

  const handleRemoveProfilePhoto = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      showNotification("Session expired. Please log in again.");
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.PROFILE_PHOTO, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ profilePhoto: "" })
      });

      const { data, rawText } = await readApiResponse(response);
      if (!response.ok || !data?.success) {
        throw new Error(getApiErrorMessage(response, data, rawText, "Failed to remove profile photo"));
      }

      setProfilePhoto(null);
      setUserProfile((prev) => (prev ? { ...prev, profilePhoto: "" } : prev));
      setShowProfileUpload(false);
      setIsHamburgerOpen(false);
      showNotification("Profile photo removed", "success");
    } catch (err) {
      console.error("Profile photo remove error:", err);
      showNotification(err.message || "Failed to remove profile photo");
    }
  };

  const handleToggleFavorite = async (file) => {
    if (!file?._id) return;

    const token = localStorage.getItem("token");
    if (!token) {
      showNotification("Session expired. Please log in again.");
      navigate("/login");
      return;
    }

    const nextFavoriteState = !file.isFavorite;

    setFiles((previous) =>
      previous.map((item) =>
        item._id === file._id ? { ...item, isFavorite: nextFavoriteState } : item
      )
    );

    if (selectedFileDetails?._id === file._id) {
      setSelectedFileDetails((previous) =>
        previous ? { ...previous, isFavorite: nextFavoriteState } : previous
      );
    }

    try {
      const response = await fetch(API_ENDPOINTS.FILES.FAVORITE(file._id), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isFavorite: nextFavoriteState })
      });

      const { data, rawText } = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, rawText, "Failed to update favorite"));
      }

      showNotification(nextFavoriteState ? "Added to favorites" : "Removed from favorites", "success");
    } catch (err) {
      console.error("Favorite update error:", err);
      setFiles((previous) =>
        previous.map((item) =>
          item._id === file._id ? { ...item, isFavorite: !nextFavoriteState } : item
        )
      );
      if (selectedFileDetails?._id === file._id) {
        setSelectedFileDetails((previous) =>
          previous ? { ...previous, isFavorite: !nextFavoriteState } : previous
        );
      }
      showNotification(err.message || "Failed to update favorite");
    }
  };

  const openFileDetailsModal = (file) => {
    if (!file) return;
    setSelectedFileDetails(file);
  };

  const closeFileDetailsModal = () => {
    setSelectedFileDetails(null);
  };

  const queueSelectedFiles = (incomingFiles) => {
    const selected = Array.from(incomingFiles || []).filter(Boolean);
    if (selected.length === 0) return;

    setIsUploadBoxExpanded(true);

    setQueuedUploadFiles((previous) => {
      const seen = new Set(previous.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const uniqueToAdd = selected.filter((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return [...previous, ...uniqueToAdd];
    });
  };

  const removeQueuedFile = (indexToRemove) => {
    setQueuedUploadFiles((previous) => previous.filter((_, index) => index !== indexToRemove));
  };


  const handleFileUpload = async (files) => {
    const filesToUpload = Array.from(files || []).filter(Boolean);
    if (filesToUpload.length === 0) {
      return { successful: 0, failed: 0, failedFiles: [] };
    }

    const token = localStorage.getItem("token");

    if (!token) {
      showNotification("No authentication token found. Please log in again.");
      return {
        successful: 0,
        failed: filesToUpload.length,
        failedFiles: filesToUpload
      };
    }

    let uploaded = 0;
    let successful = 0;
    let failed = 0;
    const failedFiles = [];
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("Uploading...");

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const formData = new FormData();
        formData.append("file", file);

        try {
          const uploadRes = await fetch(API_ENDPOINTS.FILES.UPLOAD, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          let uploadData = {};
          let rawErrorText = "";
          try {
            uploadData = await uploadRes.json();
          } catch {
            try {
              rawErrorText = (await uploadRes.text()) || "";
            } catch {
              rawErrorText = "";
            }
          }

          if (!uploadRes.ok || !uploadData.success) {
            failed++;
            failedFiles.push(file);
            const errorMessage =
              uploadData.error ||
              uploadData.message ||
              rawErrorText ||
              "Upload failed";
            showNotification(`${file.name}: ${errorMessage}`);
            uploaded++;
            setUploadProgress(Math.round((uploaded / filesToUpload.length) * 100));
            continue;
          }

          successful++;
          showNotification(`${file.name} uploaded successfully.`, "success");
        } catch (uploadErr) {
          failed++;
          failedFiles.push(file);
          showNotification(`${file.name}: ${uploadErr.message}`);
        }

        uploaded++;
        setUploadProgress(Math.round((uploaded / filesToUpload.length) * 100));
      }

      await fetchFiles();
      await fetchProfile();

      let statusMsg = "";
      if (successful > 0 && failed === 0) {
        statusMsg = "Uploaded successfully.";
      } else if (successful > 0) {
        statusMsg = `Uploaded successfully (${successful}/${filesToUpload.length}).`;
      } else {
        statusMsg = "Upload failed.";
      }

      setUploadStatus(statusMsg);
      return { successful, failed, failedFiles };
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus("");
      }, 3500);
    }
  };

  const handleProceedUpload = async () => {
    if (isUploading || queuedUploadFiles.length === 0) return;

    const result = await handleFileUpload(queuedUploadFiles);
    const remaining = result?.failedFiles || [];
    setQueuedUploadFiles(remaining);
  };

  const showNotification = (message, type = 'error', force = false) => {
    if (!notificationsEnabled && !force) return; // Skip only non-forced notifications when disabled
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const getDownloadUrl = (rawUrl) => {
    if (typeof rawUrl !== "string") return "";
    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl) return "";

    if (!trimmedUrl.includes("res.cloudinary.com") || !trimmedUrl.includes("/upload/")) {
      return trimmedUrl;
    }

    const [prefix, suffix] = trimmedUrl.split("/upload/");
    if (!prefix || !suffix || suffix.startsWith("fl_attachment/")) {
      return trimmedUrl;
    }

    return `${prefix}/upload/fl_attachment/${suffix}`;
  };

  const triggerDownload = (url, fileName) => {
    const link = document.createElement("a");
    link.href = url;
    if (fileName) {
      link.download = fileName;
    }
    link.target = "_blank";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadViaApi = async (fileId, fileName) => {
    const token = localStorage.getItem("token");
    const response = await fetch(API_ENDPOINTS.FILES.DOWNLOAD(fileId), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("API download failed");
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    try {
      triggerDownload(objectUrl, fileName);
    } finally {
      window.URL.revokeObjectURL(objectUrl);
    }
  };

  const handleDownload = async (file) => {
    if (!file) {
      showNotification("File not found");
      return;
    }

    const directDownloadUrl = getDownloadUrl(file.url);
    if (directDownloadUrl) {
      try {
        triggerDownload(directDownloadUrl, file.name);
        showNotification("Download started.", "success");
        return;
      } catch (directDownloadError) {
        console.error("Direct download failed, falling back to API download:", directDownloadError);
      }
    }

    if (!file._id) {
      showNotification("Failed to download file");
      return;
    }

    try {
      await downloadViaApi(file._id, file.name);
      showNotification('File downloaded successfully!', 'success');
    } catch (err) {
      showNotification('Error downloading file');
    }
  };

  const handleRename = async (file) => {
    const newName = prompt('Enter new file name:', file.name);
    if (!newName || newName.trim() === '') return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.FILES.RENAME(file._id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newName }),
      });
      if (response.ok) {
        showNotification('File renamed successfully.', 'success');
        await fetchFiles(); // Refresh the file list
      } else {
        showNotification('Failed to rename file');
      }
    } catch (err) {
      showNotification('Error renaming file');
    }
  };

  const handleCopy = async (file) => {
    try {
      await navigator.clipboard.writeText(file.url);
      showNotification('File link copied to clipboard!', 'success');
    } catch (err) {
      showNotification('Failed to copy link');
    }
  };

  const handleShare = async (file) => {
    const shareData = {
      title: 'CloudBox File',
      text: `Check out this file: ${file.name}`,
      url: file.url
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showNotification('File shared successfully!', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') {
          showNotification('Error sharing file');
        }
      }
    } else {
      // Fallback: copy link to clipboard
      try {
        await navigator.clipboard.writeText(file.url);
        showNotification('File link copied! (Share not supported on this browser)', 'success');
      } catch (err) {
        showNotification('Failed to copy link');
      }
    }
  };

  const handleMove = (file) => {
    showNotification('Move feature coming soon!');
  };

  const handleDelete = async (file) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;

    if (selectedFileDetails && selectedFileDetails._id === file._id) {
      setSelectedFileDetails(null);
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.FILES.MOVE_TO_TRASH(file._id), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { data, rawText } = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, rawText, "Failed to move file to trash"));
      }

      const trashedFile = data?.file ? mapApiFile(data.file) : { ...file, deletedAt: new Date().toISOString() };

      setFiles((previous) => previous.filter((item) => item._id !== file._id));
      setTrashedFiles((previous) => [trashedFile, ...previous.filter((item) => item._id !== file._id)]);
      showNotification('File moved to trash.', 'success');
    } catch (err) {
      console.error("Move to trash error:", err);
      showNotification(err.message || 'Error moving file to trash');
    }
  };

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
      return next;
    });
  };

  const handleRestoreFromTrash = async (file) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.FILES.RESTORE_FROM_TRASH(file._id), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { data, rawText } = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, rawText, "Failed to restore file"));
      }

      const restoredFile = data?.file ? mapApiFile(data.file) : file;
      setTrashedFiles((previous) => previous.filter((item) => item._id !== file._id));
      setFiles((previous) => [restoredFile, ...previous.filter((item) => item._id !== file._id)]);
      showNotification('File restored from trash!', 'success');
    } catch (err) {
      console.error("Restore from trash error:", err);
      showNotification(err.message || 'Failed to restore file');
    }
  };

  const handlePermanentlyDelete = async (file) => {
    if (!confirm(`Permanently delete "${file.name}"? This cannot be undone.`)) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.FILES.DELETE_FROM_TRASH(file._id), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { data, rawText } = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, rawText, "Failed to permanently delete file"));
      }

      setTrashedFiles((previous) => previous.filter((item) => item._id !== file._id));
      showNotification('File deleted successfully.', 'success');
    } catch (err) {
      console.error("Permanent delete error:", err);
      showNotification(err.message || 'Failed to delete file');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      showNotification('Session expired. Please log in again.');
      navigate('/login');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const currentPass = (formData.get('currentPassword') || '').toString();
    const newPass = (formData.get('newPassword') || '').toString();
    const confirmPass = (formData.get('confirmPassword') || '').toString();

    if (!currentPass || !newPass || !confirmPass) {
      showNotification('Please fill all password fields');
      return;
    }
    if (newPass !== confirmPass) {
      showNotification('New passwords do not match');
      return;
    }
    if (newPass.length < 6) {
      showNotification('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: currentPass,
          newPassword: newPass
        })
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.ok && data.success) {
        showNotification('Password changed successfully!', 'success');
        setShowPasswordModal(false);
        e.currentTarget.reset();
        setShowCurrentPass(false);
        setShowNewPass(false);
        setShowConfirmPass(false);
      } else {
        showNotification(data.message || 'Failed to change password');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      showNotification('Error changing password');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted."
    );
    
    if (!confirmDelete) return;

    const token = localStorage.getItem("token");
    if (!token) {
      showNotification('Session expired. Please log in again.');
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.DELETE_ACCOUNT, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.ok && data.success) {
        showNotification('Account deleted successfully!', 'success');
        localStorage.clear();
        setTimeout(() => {
          navigate('/intro');
        }, 1500);
      } else {
        showNotification(data.message || 'Failed to delete account');
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      showNotification('Error deleting account');
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      showNotification('Session expired. Please log in again.', 'error', true);
      navigate('/login');
      return;
    }

    if (!contactEmail || !contactMessage) {
      showNotification('Please fill in both email and message', 'error', true);
      return;
    }
    try {
      const res = await fetch(API_ENDPOINTS.CONTACT.SEND, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: contactEmail, message: contactMessage }),
      });

      const { data, rawText } = await readApiResponse(res);
      
      if (res.ok) {
        showNotification(data.message || 'Message sent successfully!', 'success', true);
        setContactEmail('');
        setContactMessage('');
      } else if (res.status === 401 || res.status === 403) {
        showNotification('Session expired. Please log in again.', 'error', true);
        navigate('/login');
      } else {
        const errorMessage = getApiErrorMessage(res, data, rawText, 'Failed to send message');
        console.error('Contact form error:', errorMessage);
        showNotification(errorMessage, 'error', true);
      }
    } catch (err) {
      console.error('Contact form submission error:', err.message);
      showNotification('Error sending message: ' + err.message, 'error', true);
    }
  };

  const toggleFileSelection = (fileId) => {
    if (selectedFileIds.includes(fileId)) {
      setSelectedFileIds(selectedFileIds.filter(id => id !== fileId));
    } else {
      setSelectedFileIds([...selectedFileIds, fileId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedFileIds.length === sortedFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(sortedFiles.map(f => f._id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFileIds.length === 0) {
      showNotification('No files selected');
      return;
    }
    if (!confirm(`Move ${selectedFileIds.length} file(s) to trash?`)) return;

    const token = localStorage.getItem("token");
    let moved = 0;
    let failed = 0;
    const total = selectedFileIds.length;

    for (const fileId of selectedFileIds) {
      const file = files.find((item) => item._id === fileId);
      if (!file) {
        failed++;
        continue;
      }

      try {
        const response = await fetch(API_ENDPOINTS.FILES.MOVE_TO_TRASH(fileId), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          moved++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error("Error moving file to trash:", err);
        failed++;
      }
    }

    let statusMessage;
    if (moved > 0 && failed > 0) {
      statusMessage = `Moved ${moved}/${total} to trash | Failed: ${failed}`;
    } else if (moved === total) {
      statusMessage = `Moved all ${moved} file(s) to trash`;
    } else {
      statusMessage = `Failed to move ${failed} file(s) to trash`;
    }

    showNotification(statusMessage, moved > 0 ? "success" : "error");
    setSelectedFileIds([]);
    await fetchFiles();
    await fetchTrashFiles();
    await fetchProfile();
  };

  const handleBulkDownload = async () => {
    if (selectedFileIds.length === 0) {
      showNotification('No files selected');
      return;
    }
    const filesToDownload = files.filter(f => selectedFileIds.includes(f._id));
    if (filesToDownload.length === 0) {
      showNotification('No files found for selected items');
      return;
    }
    let downloaded = 0;
    let failed = 0;

    for (const file of filesToDownload) {
      let didDownload = false;

      const directDownloadUrl = getDownloadUrl(file.url);
      if (directDownloadUrl) {
        try {
          triggerDownload(directDownloadUrl, file.name);
          didDownload = true;
        } catch (directDownloadError) {
          console.error('Direct bulk download failed, falling back to API download:', directDownloadError);
        }
      }

      if (!didDownload && file._id) {
        try {
          await downloadViaApi(file._id, file.name);
          didDownload = true;
        } catch (apiDownloadError) {
          console.error('Error downloading file:', apiDownloadError);
        }
      }

      if (didDownload) {
        downloaded++;
      } else {
        failed++;
      }
    }

    if (downloaded > 0 && failed > 0) {
      showNotification(`Downloaded ${downloaded}/${filesToDownload.length} file(s). Failed: ${failed}`, 'success');
      return;
    }

    if (downloaded === filesToDownload.length) {
      showNotification(`${downloaded} file(s) downloaded!`, 'success');
      return;
    }

    if (failed > 0) {
      showNotification(`Failed to download ${failed} file(s)`);
      return;
    }
  };

  const handleBulkShare = async () => {
    if (selectedFileIds.length === 0) {
      showNotification('No files selected');
      return;
    }
    const filesToShare = files.filter(f => selectedFileIds.includes(f._id));
    const shareText = filesToShare.map(f => `${f.name}: ${f.url}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(shareText);
      showNotification(`${filesToShare.length} file link(s) copied!`, 'success');
    } catch (err) {
      showNotification('Failed to copy links');
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    queueSelectedFiles(files);
    e.target.value = "";
  };

  const headerFilterSourceFiles =
    activeSection === 'favorites'
      ? favorites
      : activeSection === 'trash'
        ? trashedFiles
        : files;

  const availableFileTypes = Array.from(
    new Set(headerFilterSourceFiles.map((file) => file.type).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (filterMode === 'all') {
      if (selectedFilterType !== 'all') {
        setSelectedFilterType('all');
      }
      return;
    }

    if (selectedFilterType !== 'all' && availableFileTypes.includes(selectedFilterType)) {
      return;
    }

    setSelectedFilterType(availableFileTypes[0] || 'all');
  }, [filterMode, selectedFilterType, availableFileTypes]);

  const applySearchAndFilter = (incomingFiles = []) => incomingFiles.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      filterMode === 'all' ||
      (selectedFilterType !== 'all' && file.type === selectedFilterType);
    return matchesSearch && matchesType;
  });

  const sortFileItems = (incomingFiles = []) => [...incomingFiles].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'type':
        return a.type.localeCompare(b.type);
      case 'size':
        const aSize = parseFloat(a.size) || 0;
        const bSize = parseFloat(b.size) || 0;
        return aSize - bSize;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const filteredFiles = applySearchAndFilter(files);
  const sortedFiles = sortFileItems(filteredFiles);
  const filteredFavorites = applySearchAndFilter(favorites);
  const sortedFavorites = sortFileItems(filteredFavorites);
  const filteredTrashedFiles = applySearchAndFilter(trashedFiles);
  const sortedTrashedFiles = sortFileItems(filteredTrashedFiles);

  // Calculate storage from files as fallback
  const calculateStorageFromFiles = () => {
    let total = 0;
    files.forEach(file => {
      const sizeMatch = file.size?.match(/[\d.]+/);
      if (sizeMatch) {
        total += parseFloat(sizeMatch[0]);
      }
    });
    return total;
  };

  const getStorageInfo = () => {
    const limitBytes = 1 * 1024 * 1024 * 1024; // Fixed at 1 GB
    let storageUsedBytes = 0;
    let progressPercent = 0;

    if (userProfile && typeof userProfile.storageUsed === 'number' && userProfile.storageUsed > 0) {
      // Use actual storage from profile
      storageUsedBytes = userProfile.storageUsed;
    } else {
      // Fallback: calculate from files
      storageUsedBytes = calculateStorageFromFiles() * 1024 * 1024; // Convert MB to bytes
    }

    progressPercent = (storageUsedBytes / limitBytes) * 100;
    const clampedPercent = Math.min(Math.max(progressPercent, 0), 100);
    const roundedPercent =
      storageUsedBytes > 0 ? Math.max(1, Math.round(clampedPercent)) : 0;
    const displayText = `${roundedPercent}% of 1 GB used`;

    return { 
      used: displayText, 
      limit: `1 GB`, 
      percent: clampedPercent,
      isFull: progressPercent >= 100
    };
  };

  const storageInfo = getStorageInfo();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetchTrashFiles();
    const intervalId = setInterval(() => {
      fetchTrashFiles();
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [userName]);

  // Add dark mode class on mount if needed
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      document.body.style.background = '#18181b';
      const dash = document.querySelector('.dashboard');
      if (dash) dash.style.background = '#18181b';
    } else {
      document.body.classList.remove('dark-mode');
      document.body.style.background = '#fff';
      const dash = document.querySelector('.dashboard');
      if (dash) dash.style.background = '#f5f7fb';
    }
  }, [isDarkMode]);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px)');

    const applyViewport = (matches) => {
      setIsMobileViewport(matches);
      if (!matches) {
        setIsMobileSidebarOpen(false);
      }
    };

    applyViewport(mobileQuery.matches);

    const handleViewportChange = (event) => {
      applyViewport(event.matches);
    };

    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener('change', handleViewportChange);
      return () => mobileQuery.removeEventListener('change', handleViewportChange);
    }

    mobileQuery.addListener(handleViewportChange);
    return () => mobileQuery.removeListener(handleViewportChange);
  }, []);

  // Close hamburger menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const hamburger = document.querySelector('.hamburger-menu');
      if (hamburger && !hamburger.contains(e.target) && isHamburgerOpen) {
        setIsHamburgerOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isHamburgerOpen]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedFileDetails(null);
        setIsMobileSidebarOpen(false);
        setIsHamburgerOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    queueSelectedFiles(files);
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    if (isMobileViewport) {
      setIsMobileSidebarOpen(false);
    }
  };

  const openFilePicker = () => {
    const picker = filePickerRef.current;
    if (picker) {
      picker.value = "";
      try {
        if (typeof picker.showPicker === 'function') {
          picker.showPicker();
        } else {
          picker.click();
        }
      } catch {
        picker.click();
      }
    }
    if (isMobileViewport) {
      setIsMobileSidebarOpen(false);
    }
  };

  const handleFileCardTap = (file) => {
    if (!file) return;

    if (!isMobileViewport) {
      openFileDetailsModal(file);
      return;
    }

    const now = Date.now();
    const targetId = file._id || file.url || file.name;
    const previousTap = mobileTapStateRef.current;
    const isDoubleTap =
      previousTap.fileId === targetId &&
      now - previousTap.timestamp <= 300;

    if (isDoubleTap) {
      if (pendingMobileOpenRef.current) {
        window.clearTimeout(pendingMobileOpenRef.current);
        pendingMobileOpenRef.current = null;
      }
      mobileTapStateRef.current = { fileId: null, timestamp: 0 };
      handleToggleFavorite(file);
      return;
    }

    mobileTapStateRef.current = { fileId: targetId, timestamp: now };

    if (pendingMobileOpenRef.current) {
      window.clearTimeout(pendingMobileOpenRef.current);
      pendingMobileOpenRef.current = null;
    }

    pendingMobileOpenRef.current = window.setTimeout(() => {
      openFileDetailsModal(file);
      pendingMobileOpenRef.current = null;
    }, 280);
  };

  const selectedIsFavorite = selectedFileDetails
    ? favorites.some((fav) => fav._id === selectedFileDetails._id)
    : false;
  const isLibrarySection = ['files', 'favorites', 'trash'].includes(activeSection);
  const showMobileHeaderControls = isMobileViewport && isLibrarySection;
  const showHeaderControls = !isMobileViewport || showMobileHeaderControls;
  const showHeaderSortFilter = !isMobileViewport ? activeSection === 'files' : isLibrarySection;
  const showMobileFilterRow = isMobileViewport && showHeaderSortFilter;

  return (
    <div className={`dashboard fade-in${isDarkMode ? ' dark' : ''}`}> 
      {isMobileViewport && isMobileSidebarOpen && (
        <button
          type="button"
          className="mobile-sidebar-backdrop"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${isDarkMode ? ' dark' : ''}${isMobileSidebarOpen ? ' mobile-open' : ''}`}> 
        <div className="logo" style={{display: 'flex', alignItems: 'center', gap: '0'}}>
          <span>CloudBox</span>
          <img src="/logo.png" alt="CloudBox" style={{width: '80px', height: '80px', objectFit: 'contain'}} />
        </div>
        <nav>
          <ul>
            <li className={activeSection === 'files' ? 'active' : ''} onClick={() => handleSectionChange('files')}>
              Home
            </li>
            <li className={activeSection === 'favorites' ? 'active' : ''} onClick={() => handleSectionChange('favorites')}>Favorites</li>
            <li className={activeSection === 'trash' ? 'active' : ''} onClick={() => handleSectionChange('trash')}>Trash</li>
            <li className={activeSection === 'contact' ? 'active' : ''} onClick={() => handleSectionChange('contact')}>Contact Us</li>
            <li className={activeSection === 'settings' ? 'active' : ''} onClick={() => handleSectionChange('settings')}>Settings</li>
          </ul>
        </nav>
        <div className="storage-usage">
          <p style={{color: storageInfo.isFull ? '#ef4444' : 'inherit'}}>
            {loading ? 'Loading...' : storageInfo.used}
          </p>
          <div className="progress-bar">
            <div className="progress" style={{ width: `${storageInfo.percent}%`, background: storageInfo.isFull ? '#ef4444' : '#3b82f6' }}></div>
          </div>
          {storageInfo.isFull && (
            <button
              onClick={() => showNotification('Upgrade plans: 📦 50GB Plan ($2.99/mo) | 💎 1TB Plan ($9.99/mo) | 🚀 Premium Plan ($19.99/mo)', 'success')}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '8px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                transition: '0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#dc2626'}
              onMouseLeave={(e) => e.target.style.background = '#ef4444'}
            >
              📦 Upgrade Storage
            </button>
          )}
        </div>
        <button
          className="upload-btn"
          onClick={openFilePicker}
        >
          + Upload
        </button>
      </aside>

      {/* Main Content */}
      <main className={`main-content${isDarkMode ? ' dark' : ''}`}> 
        {notifications.length > 0 && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 3000,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxWidth: '400px',
              width: '90%'
            }}
          >
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '14px 20px',
                  borderRadius: '16px',
                  border: `1px solid ${n.type === 'success' ? '#10b981' : '#ef4444'}`,
                  background: n.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  color: n.type === 'success' ? '#065f46' : '#991b1b',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  fontSize: '14px',
                  fontWeight: 500,
                  textAlign: 'center',
                  backdropFilter: 'blur(8px)'
                }}
              >
                {n.message}
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <header>
          <button
            type="button"
            className="mobile-sidebar-toggle"
            onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
            aria-label={isMobileSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <img src="/logo.png" alt="" aria-hidden="true" />
          </button>
          {showHeaderControls && (
            <>
              <div className="search-controls-stack">
                <div className="search-bar">
                  <label htmlFor="search-input" style={{display:'none'}}>Search files</label>
                  <input
                    id="search-input"
                    name="search"
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {showHeaderSortFilter && !isMobileViewport && (
                    <div className="header-filter header-filter-inline">
                      <label htmlFor="file-filter-mode-select">Filter:</label>
                      <select
                        id="file-filter-mode-select"
                        value={filterMode}
                        onChange={(e) => setFilterMode(e.target.value)}
                      >
                        <option value="all">All</option>
                        <option value="specific">Type</option>
                      </select>

                      {filterMode === 'specific' && (
                        <select
                          id="file-filter-type-select"
                          value={selectedFilterType}
                          onChange={(e) => setSelectedFilterType(e.target.value)}
                          disabled={availableFileTypes.length === 0}
                        >
                          {availableFileTypes.length === 0 ? (
                            <option value="all">No types</option>
                          ) : (
                            availableFileTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))
                          )}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {showMobileFilterRow && (
                  <div className="mobile-filter-row">
                    <label htmlFor="file-filter-mode-select-mobile">Filter:</label>
                    <select
                      id="file-filter-mode-select-mobile"
                      value={filterMode}
                      onChange={(e) => setFilterMode(e.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="specific">Type</option>
                    </select>

                    {filterMode === 'specific' && (
                      <select
                        id="file-filter-type-select-mobile"
                        value={selectedFilterType}
                        onChange={(e) => setSelectedFilterType(e.target.value)}
                        disabled={availableFileTypes.length === 0}
                      >
                        {availableFileTypes.length === 0 ? (
                          <option value="all">No types</option>
                        ) : (
                          availableFileTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))
                        )}
                      </select>
                    )}
                  </div>
                )}
              </div>
              <div className="header-right">
                <Switch
                  isDarkMode={isDarkMode}
                  onChange={toggleTheme}
                  toggleSize={isMobileViewport ? '8px' : undefined}
                />
                
                {/* Hamburger Menu */}
                <div className="hamburger-menu">
                  <button 
                    className="hamburger-btn"
                    onClick={() => setIsHamburgerOpen(!isHamburgerOpen)}
                    style={{
                      width: isMobileViewport ? '34px' : '44px',
                      height: isMobileViewport ? '34px' : '44px',
                      borderRadius: '50%',
                      border: isMobileViewport ? '1px solid #d1d5db' : '2px solid #e5e7eb',
                      background: profilePhoto ? 'transparent' : '#e5e7eb',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                      padding: 0,
                      flexShrink: 0
                    }}
                  >
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Profile" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block'}} />
                    ) : (
                      <span style={{fontSize: isMobileViewport ? '16px' : '22px'}}>👤</span>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {isHamburgerOpen && (
                    <div className="hamburger-dropdown" style={{
                      position: 'absolute',
                      top: isMobileViewport ? '52px' : '65px',
                      right: '0',
                      background: isDarkMode ? '#2a2a33' : 'white',
                      border: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      minWidth: '220px',
                      zIndex: 1000,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        padding: '12px 16px',
                        borderBottom: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`,
                        color: isDarkMode ? '#e5e5e5' : '#222'
                      }}>
                        <p style={{margin: '0 0 4px 0', fontWeight: 600}}>Welcome back!</p>
                        <p style={{margin: '0', fontSize: '13px', color: isDarkMode ? '#9ca3af' : '#6b7280'}}>{userName}</p>
                      </div>

                  <button
                    onClick={() => {
                      setShowProfileUpload(true);
                      setIsHamburgerOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: isDarkMode ? '#e5e5e5' : '#222',
                      fontSize: '14px',
                      borderBottom: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`,
                      transition: '0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = isDarkMode ? '#353545' : '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    Upload Profile Photo
                  </button>

                  <button
                    onClick={handleRemoveProfilePhoto}
                    disabled={!profilePhoto}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'transparent',
                      cursor: profilePhoto ? 'pointer' : 'not-allowed',
                      textAlign: 'left',
                      color: profilePhoto ? (isDarkMode ? '#e5e5e5' : '#222') : '#9ca3af',
                      fontSize: '14px',
                      borderBottom: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`,
                      transition: '0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (profilePhoto) e.target.style.background = isDarkMode ? '#353545' : '#f9fafb';
                    }}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    Remove Profile Photo
                  </button>

                  <button
                    onClick={() => {
                      setActiveSection('settings');
                      setIsHamburgerOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: isDarkMode ? '#e5e5e5' : '#222',
                      fontSize: '14px',
                      borderBottom: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`,
                      transition: '0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = isDarkMode ? '#353545' : '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    Account Settings
                  </button>

                  <button
                    onClick={() => {
                      setShowPasswordModal(true);
                      setIsHamburgerOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: isDarkMode ? '#e5e5e5' : '#222',
                      fontSize: '14px',
                      borderBottom: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`,
                      transition: '0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = isDarkMode ? '#353545' : '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    Change Password
                  </button>

                  <button
                    onClick={() => {
                      setActiveSection('contact');
                      setIsHamburgerOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: isDarkMode ? '#e5e5e5' : '#222',
                      fontSize: '14px',
                      borderBottom: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`,
                      transition: '0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = isDarkMode ? '#353545' : '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    Contact Support
                  </button>

                  <button
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: isDarkMode ? '#e5e5e5' : '#222',
                      fontSize: '14px',
                      borderBottom: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`,
                      transition: '0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => e.target.style.background = isDarkMode ? '#353545' : '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <span>Notifications</span>
                    <strong style={{color: notificationsEnabled ? '#10b981' : '#ef4444'}}>{notificationsEnabled ? 'ON' : 'OFF'}</strong>
                  </button>

                  <button
                    onClick={logout}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: '#dc2626',
                      fontSize: '14px',
                      transition: '0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = isDarkMode ? '#353545' : '#fee2e2'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    Logout
                  </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </header>

        {/* Profile Photo Upload Modal */}
        {showProfileUpload && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1999
          }} onClick={() => setShowProfileUpload(false)}>
            <div style={{
              background: isDarkMode ? '#2a2a33' : 'white',
              padding: '30px',
              borderRadius: '12px',
              zIndex: 2000,
              minWidth: '320px'
            }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{margin: '0 0 20px 0', color: isDarkMode ? '#e5e5e5' : '#222'}}>Upload Profile Photo</h3>
              <label style={{
                display: 'block',
                padding: '20px',
                border: `2px dashed ${isDarkMode ? '#3a3a47' : '#cbd5e1'}`,
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: '0.2s',
                color: isDarkMode ? '#9ca3af' : '#6b7280'
              }}
              onMouseEnter={(e) => e.target.style.background = isDarkMode ? '#353545' : '#f9fafb'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleProfilePhotoDrop}
              >
                Click to upload or drag and drop
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoUpload}
                  style={{display: 'none'}}
                />
              </label>
              <button
                onClick={() => setShowProfileUpload(false)}
                style={{
                  width: '100%',
                  marginTop: '15px',
                  padding: '10px',
                  background: '#e5e7eb',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#222'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1999
          }} onClick={() => setShowPasswordModal(false)}>
            <div style={{
              background: isDarkMode ? '#2a2a33' : 'white',
              padding: '30px',
              borderRadius: '12px',
              zIndex: 2000,
              minWidth: '380px'
            }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{margin: '0 0 20px 0', color: isDarkMode ? '#e5e5e5' : '#222'}}>Change Password</h3>
              <form onSubmit={handleChangePassword} style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '6px', fontSize: '13px', color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 500}}>Current Password</label>
                  <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                    <input 
                      type={showCurrentPass ? 'text' : 'password'} 
                      id="current-pass" 
                      name="currentPassword"
                      placeholder="Enter current password" 
                      style={{width: '100%', padding: '10px 35px 10px 10px', border: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`, borderRadius: '6px', background: isDarkMode ? '#1a1a23' : '#f9fafb', color: isDarkMode ? '#e5e5e5' : '#222', fontSize: '13px', boxSizing: 'border-box'}} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'none'
                      }}
                      title={showCurrentPass ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPass ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '6px', fontSize: '13px', color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 500}}>New Password</label>
                  <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                    <input 
                      type={showNewPass ? 'text' : 'password'} 
                      id="new-pass" 
                      name="newPassword"
                      placeholder="Enter new password (min 6 chars)" 
                      style={{width: '100%', padding: '10px 35px 10px 10px', border: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`, borderRadius: '6px', background: isDarkMode ? '#1a1a23' : '#f9fafb', color: isDarkMode ? '#e5e5e5' : '#222', fontSize: '13px', boxSizing: 'border-box'}} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'none'
                      }}
                      title={showNewPass ? 'Hide password' : 'Show password'}
                    >
                      {showNewPass ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '6px', fontSize: '13px', color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 500}}>Confirm Password</label>
                  <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                    <input 
                      type={showConfirmPass ? 'text' : 'password'} 
                      id="confirm-pass" 
                      name="confirmPassword"
                      placeholder="Confirm new password" 
                      style={{width: '100%', padding: '10px 35px 10px 10px', border: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`, borderRadius: '6px', background: isDarkMode ? '#1a1a23' : '#f9fafb', color: isDarkMode ? '#e5e5e5' : '#222', fontSize: '13px', boxSizing: 'border-box'}} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'none'
                      }}
                      title={showConfirmPass ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPass ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>
                <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                  <button type="submit" style={{flex: 1, padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500}}>
                    Change Password
                  </button>
                  <button type="button" onClick={() => setShowPasswordModal(false)} style={{flex: 1, padding: '10px', background: '#e5e7eb', color: '#222', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'}}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Conditional Content Based on Active Section */}
        {activeSection === 'files' && (
          <section className={`files${isDarkMode ? ' dark' : ''}`}>
            {/* Breadcrumb Navigation */}
            <div className="breadcrumb">
              <span>Home</span>
            </div>

            <div className="files-header">
              <h2>All Files</h2>
              <div className="sort-options">
                {/* Select Checkbox */}
                <div className="select-mode-toggle-wrap">
                  <label className="select-mode-toggle" htmlFor="select-mode-checkbox">
                    <input
                      id="select-mode-checkbox"
                      type="checkbox"
                      checked={selectMode}
                      onChange={() => {
                        setSelectMode(!selectMode);
                        setSelectedFileIds([]);
                      }}
                    />
                    <span className="select-mode-label">Select</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Bulk Action Bar */}
            {selectMode && (
              <div style={{
                background: isDarkMode ? '#1a1a23' : '#f0f4f8',
                padding: '12px 16px',
                borderRadius: '6px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`
              }}>
                <Checkbox 
                  checked={selectedFileIds.length === sortedFiles.length && sortedFiles.length > 0}
                  onChange={toggleSelectAll}
                  id="select-all"
                />
                <span style={{color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '14px', fontWeight: 500}}>
                  {selectedFileIds.length > 0 ? `${selectedFileIds.length} selected` : 'Select All'}
                </span>
                {selectedFileIds.length > 0 && (
                  <>
                    <div style={{flex: 1}}></div>
                    <button
                      onClick={handleBulkDownload}
                      title="Download selected"
                      style={{
                        padding: '6px 12px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500
                      }}
                    >
                      ⬇️ Download
                    </button>
                    <button
                      onClick={handleBulkShare}
                      title="Copy links of selected"
                      style={{
                        padding: '6px 12px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500
                      }}
                    >
                      ↗️ Share
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      title="Delete selected"
                      style={{
                        padding: '6px 12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500
                      }}
                    >
                       🗑️ Delete
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Drag & Drop Upload Zone */}
            <section className="upload-box-wrap">
              <div className="upload-box-topline">
                <h3 className="upload-box-heading">Upload Box</h3>
                <button
                  type="button"
                  className="upload-box-toggle-btn"
                  onClick={() => setIsUploadBoxExpanded((prev) => !prev)}
                >
                  {isUploadBoxExpanded ? "Collapse" : "Expand"}
                </button>
              </div>

              {isUploadBoxExpanded && (
                <>
                  <div
                    className="upload-zone"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={openFilePicker}
                    style={{ cursor: 'pointer' }}
                  >
                    <Hamster />
                    {isMobileViewport && (
                      <img src="/logo.png" alt="" className="mobile-upload-logo-corner" aria-hidden="true" />
                    )}
                    <p className="upload-box-subheading">Drag & drop files here or click to upload files</p>
                  </div>

                  {queuedUploadFiles.length > 0 && (
                    <div className="upload-queue-container">
                      <div className="upload-queue-header">
                        <h4>Listed files to upload</h4>
                        <span className="upload-queue-count">{queuedUploadFiles.length} file(s) selected</span>
                      </div>

                      <ul className="upload-queue-list">
                        {queuedUploadFiles.map((queuedFile, index) => (
                          <li
                            key={`${queuedFile.name}-${queuedFile.size}-${queuedFile.lastModified}-${index}`}
                            className="upload-queue-item"
                          >
                            <span className="upload-queue-name" title={queuedFile.name}>
                              {queuedFile.name}
                            </span>
                            <span className="upload-queue-size">{formatQueuedSize(queuedFile.size)}</span>
                            <button
                              type="button"
                              className="upload-queue-remove"
                              onClick={() => removeQueuedFile(index)}
                              aria-label={`Remove ${queuedFile.name}`}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>

                      <div className="upload-queue-footer">
                        <button
                          type="button"
                          className="upload-panel-btn primary"
                          onClick={handleProceedUpload}
                          disabled={isUploading || queuedUploadFiles.length === 0}
                        >
                          Proceed to Upload
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <label htmlFor="file-upload-input" style={{ display: 'none' }}>Upload file</label>
              <input
                id="file-upload-input"
                name="file-upload"
                type="file"
                multiple
                ref={filePickerRef}
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
            </section>

            {/* Files View */}
            {(isUploading || uploadStatus) && (
              <div className="upload-progress">
                {isUploading ? (
                  <Uploadloader progress={uploadProgress} status={uploadStatus} />
                ) : (
                  <div className="upload-progress-text" style={{color: '#222', fontWeight: 600, marginTop: '8px'}}>
                    {uploadStatus}
                  </div>
                )}
              </div>
            )}
            
            {/* Google Photos Style Grid */}
            {loading ? (
              <div style={{padding: '1px', textAlign: 'center', color: '#9ca3af'}}>
                <p>Loading files...</p>
              </div>
            ) : sortedFiles.length === 0 ? (
              <div style={{padding: '40px', textAlign: 'center', color: '#9ca3af'}}>
                <p>No files uploaded yet.</p>
              </div>
            ) : (
              (() => {
                // Group files by date
                const groupedByDate = {};
                sortedFiles.forEach(file => {
                  const date = new Date(file.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                  if (!groupedByDate[date]) {
                    groupedByDate[date] = [];
                  }
                  groupedByDate[date].push(file);
                });

                // Sort dates in descending order
                const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
                  new Date(b) - new Date(a)
                );

                return (
                  <div className="photos-container">
                    {sortedDates.map(date => (
                      <div key={date} className="date-section">
                        <h3 className="date-header">{date}</h3>
                        <div style={{position: 'relative'}}>
                          {selectMode ? (
                            // Select Mode: checkbox shown at top-right of each file card
                            <div className="grid-view">
                              {groupedByDate[date].map((file, fileIndex) => {
                                const isSelected = selectedFileIds.includes(file._id);
                                return (
                                  <div
                                    key={fileIndex}
                                    className="file-item"
                                    style={{
                                      position: 'relative',
                                      opacity: isSelected ? 0.85 : 1,
                                      boxShadow: isSelected ? '0 0 0 3px #3b82f6' : 'none',
                                      borderRadius: '8px',
                                      overflow: 'hidden'
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleFileSelection(file._id)}
                                      id={`file-${file._id}`}
                                      className="file-select-checkbox"
                                      aria-label={`Select ${file.name}`}
                                      style={{ position: 'absolute', top: '8px', right: '8px', left: 'auto', zIndex: 20 }}
                                    />
                                    <div style={{position: 'relative'}}>
                                      {file.isImage ? (
                                        <img src={file.url} alt={file.name} className="file-thumb" style={{cursor: 'default'}} />
                                      ) : file.isVideo ? (
                                        <video src={file.url} className="file-thumb" style={{cursor: 'default'}} />
                                      ) : (
                                        <div className="file-icon">{"\uD83D\uDCC4"}</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            // Normal Mode: Show standard grid view
                            <div className="grid-view">
                              {groupedByDate[date].map((file, index) => {
                                const isSelected = selectedFileIds.includes(file._id);
                                const isFavorited = favorites.some(fav => fav._id === file._id);
                                return (
                                  <div 
                                    key={index} 
                                    className="file-item"
                                    onClick={() => handleFileCardTap(file)}
                                    style={{
                                      position: 'relative',
                                      opacity: isSelected ? 0.8 : 1,
                                      border: isSelected ? '2px solid #3b82f6' : 'none',
                                      borderRadius: '8px',
                                      overflow: 'hidden',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <div style={{position: 'relative'}}>
                                      {file.isImage ? (
                                        <img src={file.url} alt={file.name} className="file-thumb" />
                                      ) : file.isVideo ? (
                                        <video src={file.url} className="file-thumb" muted />
                                      ) : (
                                        <div className="file-icon">📄</div>
                                      )}
                                      {!isMobileViewport && (
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            handleToggleFavorite(file);
                                          }}
                                          className={`favorite-toggle-btn${isFavorited ? ' active' : ''}`}
                                          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                                        >
                                          <svg className="favorite-heart-icon" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                          </svg>
                                        </button>
                                      )}
                                    </div></div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}

            {/* Footer */}
            <footer style={{
              marginTop: '60px',
              paddingTop: '40px',
              paddingBottom: '30px',
              borderTop: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`,
              color: isDarkMode ? '#9ca3af' : '#6b7280'
            }}>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '30px', marginBottom: '30px'}}>
                <div>
                  <h4 style={{color: isDarkMode ? '#e5e5e5' : '#222', marginBottom: '12px', fontSize: '14px', fontWeight: 600}}>Product</h4>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                    <li style={{marginBottom: '8px'}}><a href="#" style={{color: isDarkMode ? '#9ca3af' : '#6b7280', textDecoration: 'none', fontSize: '13px'}}>Features</a></li>
                    <li style={{marginBottom: '8px'}}><a href="#" style={{color: isDarkMode ? '#9ca3af' : '#6b7280', textDecoration: 'none', fontSize: '13px'}}>Pricing</a></li>
                    <li><a href="#" style={{color: isDarkMode ? '#9ca3af' : '#6b7280', textDecoration: 'none', fontSize: '13px'}}>Security</a></li>
                  </ul>
                </div>
                <div>
                  <h4 style={{color: isDarkMode ? '#e5e5e5' : '#222', marginBottom: '12px', fontSize: '14px', fontWeight: 600}}>Company</h4>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                    <li style={{marginBottom: '8px'}}><a href="#" style={{color: isDarkMode ? '#9ca3af' : '#6b7280', textDecoration: 'none', fontSize: '13px'}}>About</a></li>
                    <li style={{marginBottom: '8px'}}><a href="#" style={{color: isDarkMode ? '#9ca3af' : '#6b7280', textDecoration: 'none', fontSize: '13px'}}>Blog</a></li>
                    <li><a href="#" style={{color: isDarkMode ? '#9ca3af' : '#6b7280', textDecoration: 'none', fontSize: '13px'}}>Careers</a></li>
                  </ul>
                </div>
                <div>
                  <h4 style={{color: isDarkMode ? '#e5e5e5' : '#222', marginBottom: '12px', fontSize: '14px', fontWeight: 600}}>Resources</h4>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                    <li style={{marginBottom: '8px'}}><a href="#" style={{color: isDarkMode ? '#9ca3af' : '#6b7280', textDecoration: 'none', fontSize: '13px'}}>Documentation</a></li>
                    <li style={{marginBottom: '8px'}}><a href="#" style={{color: isDarkMode ? '#9ca3af' : '#6b7280', textDecoration: 'none', fontSize: '13px'}}>Support</a></li>
                    <li><a href="#" style={{color: isDarkMode ? '#9ca3af' : '#6b7280', textDecoration: 'none', fontSize: '13px'}}>API</a></li>
                  </ul>
                </div>
                <div>
                  <h4 style={{color: isDarkMode ? '#e5e5e5' : '#222', marginBottom: '12px', fontSize: '14px', fontWeight: 600}}>Legal</h4>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                    <li style={{marginBottom: '8px'}}><a href="#" style={{color: isDarkMode ? '#9ca3af' : '#6b7280', textDecoration: 'none', fontSize: '13px'}}>Terms</a></li>
                    <li style={{marginBottom: '8px'}}><a href="#" style={{color: isDarkMode ? '#9ca3af' : '#6b7280', textDecoration: 'none', fontSize: '13px'}}>Privacy</a></li>
                    <li><a href="#" style={{color: isDarkMode ? '#9ca3af' : '#6b7280', textDecoration: 'none', fontSize: '13px'}}>Cookies</a></li>
                  </ul>
                </div>
              </div>
              <div style={{borderTop: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`, paddingTop: '20px', textAlign: 'center'}}>
                <p style={{fontSize: '13px', margin: '0', color: isDarkMode ? '#9ca3af' : '#6b7280'}}>© 2026 CloudBox. All rights reserved.</p>
              </div>
            </footer>
          </section>
        )}

        {/* FAVORITES SECTION */}
        {activeSection === 'favorites' && (
          <section className={`files${isDarkMode ? ' dark' : ''}`}>
            <div className="breadcrumb">
              <span>Favorites</span>
            </div>
            <h2>Favorites</h2>
            {sortedFavorites.length === 0 ? (
              <div style={{padding: '40px', textAlign: 'center', color: '#9ca3af'}}>
                <p>No favorites yet. Double-tap a photo on mobile or click the heart icon on desktop.</p>
              </div>
            ) : (
              <div className="grid-view">
                {sortedFavorites.map((file, index) => {
                  const isSelected = selectedFileIds.includes(file._id);
                  return (
                    <div
                      key={index}
                      className="file-item"
                      onClick={() => handleFileCardTap(file)}
                      style={{
                        position: 'relative',
                        opacity: isSelected ? 0.8 : 1,
                        border: isSelected ? '2px solid #3b82f6' : 'none',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{position: 'relative'}}>
                        {file.isImage ? (
                          <img src={file.url} alt={file.name} className="file-thumb" />
                        ) : file.isVideo ? (
                          <video src={file.url} className="file-thumb" muted />
                        ) : (
                          <div className="file-icon">{"\uD83D\uDCC4"}</div>
                        )}
                        {!isMobileViewport && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleFavorite(file);
                            }}
                            className="favorite-toggle-btn active"
                            title="Remove from favorites"
                          >
                            <svg className="favorite-heart-icon" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TRASH SECTION */}
        {activeSection === 'trash' && (
          <section className={`files${isDarkMode ? ' dark' : ''}`}>
            <h2>Trash</h2>
            <p style={{color: '#6b7280', marginTop: '10px', fontSize: '14px'}}>Trashed files will be permanently deleted after 24 hours.</p>
            {sortedTrashedFiles.length === 0 ? (
              <p style={{color: '#6b7280', marginTop: '20px'}}>Trash is empty.</p>
            ) : (
              <div className="grid-view" style={{marginTop: '20px'}}>
                {sortedTrashedFiles.map((file) => {
                  const now = new Date().getTime();
                  const parsedDeletedAt = new Date(file.deletedAt || 0).getTime();
                  const deletedAtMs = Number.isFinite(parsedDeletedAt) ? parsedDeletedAt : now;
                  const age = now - deletedAtMs;
                  const hoursLeft = Math.max(
                    0,
                    Math.ceil((24 * 60 * 60 * 1000 - age) / (60 * 60 * 1000))
                  );
                  
                  return (
                    <div key={file._id} className="file-item" style={{position: 'relative'}}>
                      {file.isImage ? (
                        <img src={file.url} alt={file.name} style={{width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px'}} />
                      ) : file.isVideo ? (
                        <video src={file.url} style={{width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px'}} />
                      ) : (
                        <div style={{width: '100%', height: '200px', background: '#e5e7eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#6b7280'}}>{file.type}</div>
                      )}
                      <p style={{fontSize: '12px', color: '#6b7280', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis'}}>{file.name}</p>
                      <p style={{fontSize: '11px', color: '#f59e0b', marginTop: '4px'}}>⏱ Deletes in {hoursLeft}h</p>
                      <div style={{marginTop: '8px', display: 'flex', gap: '8px'}}>
                        <button onClick={() => handleRestoreFromTrash(file)} title="Restore" style={{padding: '6px 10px', fontSize: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>↩ Restore</button>
                        <button onClick={() => handlePermanentlyDelete(file)} title="Delete" style={{padding: '6px 10px', fontSize: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>🗑 Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* CONTACT SECTION */}
        {activeSection === 'contact' && (
          <section className={`files${isDarkMode ? ' dark' : ''}`}>
            <h2>Contact Us</h2>
            <p style={{color: '#6b7280', marginTop: '10px', fontSize: '14px'}}>Send us a message and we'll get back to you soon.</p>
            <div style={{marginTop: '20px', maxWidth: '500px'}}>
              <form onSubmit={handleContactSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', color: isDarkMode ? '#e5e5e5' : '#222', fontWeight: 500}}>Your Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      background: isDarkMode ? '#1a1a23' : '#f9fafb',
                      color: isDarkMode ? '#e5e5e5' : '#222',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', color: isDarkMode ? '#e5e5e5' : '#222', fontWeight: 500}}>Message</label>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Enter your message"
                    required
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      background: isDarkMode ? '#1a1a23' : '#f9fafb',
                      color: isDarkMode ? '#e5e5e5' : '#222',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#2563eb'}
                  onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
                >
                  Send Message
                </button>
              </form>
            </div>
          </section>
        )}

        {/* SETTINGS SECTION */}
        {activeSection === 'settings' && (
          <section className={`files${isDarkMode ? ' dark' : ''}`}>
            <h2>Settings</h2>
            <div style={{marginTop: '20px', maxWidth: '700px'}}>
              {/* Account Settings */}
              <div style={{marginBottom: '25px', paddingBottom: '15px', borderBottom: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`}}>
                <h3 style={{marginBottom: '10px', color: isDarkMode ? '#e5e5e5' : '#222'}}>Account Settings</h3>
                <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '8px'}}>
                  Username: <strong>{userName}</strong>
                </p>
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', marginTop: '8px'}}>
                  <button onClick={() => setShowPasswordModal(true)} style={{padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'}}>
                    Change Password
                  </button>
                  <p style={{fontSize: '13px', color: isDarkMode ? '#9ca3af' : '#6b7280', lineHeight: 1.5, margin: 0, maxWidth: '560px'}}>
                    Terms & Conditions: Deleting your account will permanently remove your account and all stored data, including uploaded files. This action cannot be undone.
                  </p>
                  <button onClick={handleDeleteAccount} style={{padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'}}>
                    Delete Account
                  </button>
                </div>
                </div>

            </div>
          </section>
        )}

        {selectedFileDetails && (
          <div className="file-details-overlay" onClick={closeFileDetailsModal}>
            <div
              className={`file-details-modal${isDarkMode ? ' dark' : ''}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="file-details-header">
                <h3>File Details</h3>
                <button type="button" onClick={closeFileDetailsModal} className="file-details-close">
                  X
                </button>
              </div>

              <div className="file-details-preview">
                {selectedFileDetails.isImage ? (
                  <img src={selectedFileDetails.url} alt={selectedFileDetails.name} />
                ) : selectedFileDetails.isVideo ? (
                  <video src={selectedFileDetails.url} controls />
                ) : (
                  <div className="file-details-fallback">{"\uD83D\uDCC4"}</div>
                )}
              </div>

              <div className="file-details-grid">
                <div className="file-details-item">
                  <span>Name</span>
                  <strong title={selectedFileDetails.name}>{selectedFileDetails.name || "Unknown"}</strong>
                </div>
                <div className="file-details-item">
                  <span>Size</span>
                  <strong>{selectedFileDetails.size || "Unknown"}</strong>
                </div>
                <div className="file-details-item">
                  <span>Type</span>
                  <strong>{selectedFileDetails.type || "Unknown"}</strong>
                </div>
                <div className="file-details-item">
                  <span>Uploaded</span>
                  <strong>{formatDateTime(selectedFileDetails.updatedAt)}</strong>
                </div>
                <div className="file-details-item">
                  <span>Favourite</span>
                  <strong>{selectedIsFavorite ? "Yes" : "No"}</strong>
                </div>
                <div className="file-details-item">
                  <span>File ID</span>
                  <strong>{selectedFileDetails._id || "N/A"}</strong>
                </div>
              </div>

              <div className="file-details-meta">
                <span>URL</span>
                <p>{selectedFileDetails.url || "No URL available"}</p>
              </div>

              <div className="file-details-actions-row">
                <button type="button" onClick={() => handleDownload(selectedFileDetails)}>
                  Download
                </button>
                <button type="button" onClick={() => handleShare(selectedFileDetails)}>
                  Share
                </button>
                <button type="button" onClick={() => handleRename(selectedFileDetails)}>
                  Rename
                </button>
                <button type="button" onClick={() => handleDelete(selectedFileDetails)} className="danger">
                  Delete
                </button>
                <button type="button" onClick={() => handleToggleFavorite(selectedFileDetails)}>
                  {selectedIsFavorite ? "Unfavourite" : "Favourite"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity Panel removed for clarity and to avoid fake data */}

      </main>
    </div>
  );
}

export default Dashboard;

