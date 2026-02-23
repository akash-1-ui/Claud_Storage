// ...existing code...
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "./config";
import "./css/dashboard.css";
import Chart from "chart.js/auto";
import Switch from "./Switch";
import Checkbox from "./Checkbox";
import NeonCheckbox from "./columnbox";

function Dashboard() {
  const navigate = useNavigate();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('Home');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [userProfile, setUserProfile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
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

  const fetchProfile = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(API_ENDPOINTS.AUTH.PROFILE, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
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

      const data = await res.json();
      const fileList = Array.isArray(data) ? data : Array.isArray(data?.files) ? data.files : [];
      // Map data to match expected format, add isImage for thumbnails
      const mappedFiles = fileList.map(file => ({
        _id: file._id,
        name: file.fileName,
        type: file.fileName.split('.').pop().toUpperCase(),
        size: file.fileSize ? (file.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown',
        updatedAt: file.uploadedAt,
        url: file.fileURL,
        isImage: /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.fileName),
        isVideo: /\.(mp4|webm|ogg|mov|avi)$/i.test(file.fileName)
      }));
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

  // Show username from userProfile if available, else fallback to localStorage
  const userName = (userProfile && userProfile.name) || localStorage.getItem("userName") || "User";

useEffect(() => {
  // 🔐 Auth check
  const token = localStorage.getItem("token");
  if (!token) {
    navigate('/login');
    return;
  }

  // Load profile photo from localStorage (user-specific)
  const savedPhoto = localStorage.getItem(`profilePhoto_${userName}`);
  setProfilePhoto(savedPhoto || null);
  
  // Load favorites (persist across sessions until user explicitly removes)
  const savedFavorites = localStorage.getItem(`favorites_${userName}`);
  if (savedFavorites) {
    try {
      setFavorites(JSON.parse(savedFavorites));
    } catch {
      setFavorites([]);
    }
  } else {
    setFavorites([]);
  }

  fetchProfile();
  fetchFiles();

  return () => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
  };
}, [userName]);


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
    reader.onloadend = () => {
      const userName = (userProfile && userProfile.name) || localStorage.getItem("userName") || "User";
      setProfilePhoto(reader.result);
      localStorage.setItem(`profilePhoto_${userName}`, reader.result);
      setShowProfileUpload(false);
      setIsHamburgerOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const handleProfilePhotoDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer?.files?.[0];
    if (!droppedFile) return;
    handleProfilePhotoUpload({ target: { files: [droppedFile] } });
  };

  const handleRemoveProfilePhoto = () => {
    const userName = (userProfile && userProfile.name) || localStorage.getItem("userName") || "User";
    localStorage.removeItem(`profilePhoto_${userName}`);
    setProfilePhoto(null);
    setShowProfileUpload(false);
    setIsHamburgerOpen(false);
  };

  const handleToggleFavorite = (file) => {
    const isFavorited = favorites.some(fav => fav._id === file._id);
    let newFavorites;
    if (isFavorited) {
      newFavorites = favorites.filter(fav => fav._id !== file._id);
    } else {
      newFavorites = [...favorites, file];
    }
    setFavorites(newFavorites);
    const userName = (userProfile && userProfile.name) || localStorage.getItem("userName") || "User";
    localStorage.setItem(`favorites_${userName}`, JSON.stringify(newFavorites));
    showNotification(isFavorited ? 'Removed from favorites' : 'Added to favorites', 'success');
  };


  const handleFileUpload = async (files) => {
    const token = localStorage.getItem("token");
    const userName = localStorage.getItem('userName') || 'user';
    
    if (!token) {
      showNotification('❌ No authentication token found. Please log in again.');
      return;
    }

    console.log("🚀 Starting Cloudinary upload. Files:", files.length);

    let uploaded = 0;
    let successful = 0;
    let failed = 0;
    setUploadProgress(0);
    setUploadStatus('Uploading...');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n📤 [${i + 1}/${files.length}] Uploading: ${file.name} (${(file.size / 1048576).toFixed(2)}MB)`);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'course_uploads');

      try {
        // Determine upload endpoint based on file type
        let uploadUrl = 'https://api.cloudinary.com/v1_1/dzgccprpv/image/upload';
        if (file.type.startsWith('video/')) {
          uploadUrl = 'https://api.cloudinary.com/v1_1/dzgccprpv/video/upload';
        } else if (file.type === 'application/pdf' || file.type.startsWith('application/')) {
          uploadUrl = 'https://api.cloudinary.com/v1_1/dzgccprpv/raw/upload';
        }

        console.log(`📨 Uploading to: ${uploadUrl}`);
        console.log(`📋 Sending: ${file.name} with preset cloudbox_unsigned`);

        const cloudRes = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        const cloudData = await cloudRes.json();
        console.log(`📊 Response status: ${cloudRes.status} ${cloudRes.statusText}`);
        console.log(`📊 Response data:`, cloudData);
        
        if (!cloudRes.ok) {
          console.error(`❌ Cloudinary error (${cloudRes.status}):`, JSON.stringify(cloudData, null, 2));
          failed++;
          const errorMsg = cloudData.error?.message || cloudData.message || `HTTP ${cloudRes.status}`;
          showNotification(`❌ ${file.name}: ${errorMsg}`);
          continue;
        }

        if (!cloudData.secure_url) {
          console.error(`❌ No secure_url in response:`, cloudData);
          failed++;
          showNotification(`❌ ${file.name}: Response missing file URL`);
          continue;
        }

        console.log(`✅ Cloudinary upload OK: ${cloudData.secure_url}`);
        console.log(`💾 Saving to database...`);
        
        try {
          const saveRes = await fetch(API_ENDPOINTS.FILES.SAVE_FILE, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              fileName: file.name,
              fileURL: cloudData.secure_url,
              fileSize: file.size,
              cloudinaryPublicId: cloudData.public_id || 'unknown'
            }),
          });

          const saveData = await saveRes.json();
          
          if (!saveRes.ok) {
            console.error(`❌ Database save failed (${saveRes.status}):`, saveData);
            failed++;
            showNotification(`⚠️ ${file.name} uploaded but save failed: ${saveData.message}`);
            continue;
          }

          successful++;
          console.log(`✅ Saved successfully`);
          showNotification(`✅ ${file.name} uploaded!`, 'success');

        } catch (saveErr) {
          console.error(`❌ Save exception:`, saveErr.message);
          failed++;
          showNotification(`❌ ${file.name}: ${saveErr.message}`);
        }

      } catch (uploadErr) {
        console.error(`❌ Upload exception:`, uploadErr);
        failed++;
        showNotification(`❌ ${file.name}: ${uploadErr.message}`);
      }
      
      uploaded++;
      setUploadProgress(Math.round((uploaded / files.length) * 100));
    }

    console.log(`\n📊 Complete - Success: ${successful}, Failed: ${failed}, Total: ${files.length}`);

    // Refresh files
    await fetchFiles();
    await fetchProfile();
    
    // Show status
    let statusMsg = '';
    if (successful > 0 && failed === 0) {
      statusMsg = `✅ ${successful} uploaded`;
    } else if (successful > 0) {
      statusMsg = `⚠️ ${successful}/${files.length} uploaded`;
    } else {
      statusMsg = `❌ ${failed} failed`;
    }
    
    setUploadStatus(statusMsg);
    setTimeout(() => {
      setUploadProgress(0);
      setUploadStatus('');
    }, 3500);
  };

  const showNotification = (message, type = 'error', force = false) => {
    if (!notificationsEnabled && !force) return; // Skip only non-forced notifications when disabled
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const handleDownload = async (file) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.FILES.DOWNLOAD(file._id), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification('File downloaded successfully!', 'success');
      } else {
        showNotification('Failed to download file');
      }
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
        showNotification('File renamed successfully!', 'success');
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

    const fileName = (userProfile && userProfile.name) || localStorage.getItem("userName") || "User";
    const trashedKey = `trashed_${fileName}`;
    const existingTrash = JSON.parse(localStorage.getItem(trashedKey) || '[]');
    
    // Add file to trash with timestamp
    const trashedItem = {
      ...file,
      deletedAt: new Date().getTime()
    };
    existingTrash.push(trashedItem);
    localStorage.setItem(trashedKey, JSON.stringify(existingTrash));
    
    // Update local trash state
    setTrashedFiles(existingTrash);
    
    // Remove from files
    setFiles(files.filter(f => f._id !== file._id));
    showNotification('File moved to trash!', 'success');
    
    // Also attempt to delete from backend
    try {
      const token = localStorage.getItem("token");
      await fetch(API_ENDPOINTS.FILES.DELETE(file._id), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      showNotification('Error deleting file');
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

  const handleRestoreFromTrash = (file) => {
    const fileName = (userProfile && userProfile.name) || localStorage.getItem("userName") || "User";
    const trashedKey = `trashed_${fileName}`;
    
    // Remove from trash
    const updated = trashedFiles.filter(f => f._id !== file._id);
    setTrashedFiles(updated);
    localStorage.setItem(trashedKey, JSON.stringify(updated));
    
    // Add back to files
    const restoredFile = {
      ...file,
      _id: file._id,
      name: file.name,
      type: file.type,
      size: file.size,
      updatedAt: file.updatedAt,
      url: file.url,
      isImage: file.isImage,
      isVideo: file.isVideo
    };
    setFiles([...files, restoredFile]);
    showNotification('File restored from trash!', 'success');
  };

  const handlePermanentlyDelete = (file) => {
    if (!confirm(`Permanently delete "${file.name}"? This cannot be undone.`)) return;
    
    const fileName = (userProfile && userProfile.name) || localStorage.getItem("userName") || "User";
    const trashedKey = `trashed_${fileName}`;
    
    const updated = trashedFiles.filter(f => f._id !== file._id);
    setTrashedFiles(updated);
    localStorage.setItem(trashedKey, JSON.stringify(updated));
    showNotification('File permanently deleted!', 'success');
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
      
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      
      if (res.ok) {
        showNotification(data.message || 'Message sent successfully!', 'success', true);
        setContactEmail('');
        setContactMessage('');
      } else if (res.status === 401 || res.status === 403) {
        showNotification('Session expired. Please log in again.', 'error', true);
        navigate('/login');
      } else {
        console.error('Contact form error:', data.message || JSON.stringify(data));
        showNotification(data.message || 'Failed to send message', 'error', true);
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

  const toggleRowSelection = (rowFileIds) => {
    const allInRowSelected = rowFileIds.every(id => selectedFileIds.includes(id));
    if (allInRowSelected) {
      // Deselect all in row
      setSelectedFileIds(selectedFileIds.filter(id => !rowFileIds.includes(id)));
    } else {
      // Select all in row
      const newSelected = new Set(selectedFileIds);
      rowFileIds.forEach(id => newSelected.add(id));
      setSelectedFileIds([...newSelected]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFileIds.length === 0) {
      showNotification('No files selected');
      return;
    }
    if (!confirm(`Delete ${selectedFileIds.length} file(s)?`)) return;

    const token = localStorage.getItem("token");
    let deleted = 0;
    let failed = 0;
    const total = selectedFileIds.length;
    
    for (const fileId of selectedFileIds) {
      const file = files.find(f => f._id === fileId);
      if (!file) {
        failed++;
        continue;
      }
      try {
        const res = await fetch(`http://localhost:5000/api/files/${fileId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          deleted++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error('Error deleting file:', err);
        failed++;
      }
    }
    
    // Enhanced message with success/fail details
    let successMessage;
    if (deleted > 0 && failed > 0) {
      successMessage = `✓ Deleted ${deleted}/${total} successfully | ✗ Failed: ${failed}`;
    } else if (deleted === total) {
      successMessage = `✓ Successfully deleted all ${deleted} file(s)!`;
    } else {
      successMessage = `✗ Failed to delete ${failed} file(s)`;
    }
    
    showNotification(successMessage, deleted > 0 ? 'success' : 'error');
    setSelectedFileIds([]);
    await fetchFiles();
    await fetchProfile();
  };

  const handleBulkDownload = async () => {
    if (selectedFileIds.length === 0) {
      showNotification('No files selected');
      return;
    }
    const filesToDownload = files.filter(f => selectedFileIds.includes(f._id));
    for (const file of filesToDownload) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:5000/api/files/download/${file._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } catch (err) {
        console.error('Error downloading file:', err);
      }
    }
    showNotification(`${filesToDownload.length} file(s) downloaded!`, 'success');
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
    const files = Array.from(e.target.files);
    handleFileUpload(files);
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'type':
        return a.type.localeCompare(b.type);
      case 'size':
        const aSize = parseFloat(a.size) || 0;
        const bSize = parseFloat(b.size) || 0;
        return aSize - bSize;
      case 'date':
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      default:
        return 0;
    }
  });

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
    // Use 1GB per user from userProfile, fallback to 1GB if not available
    const limitBytes = (userProfile && userProfile.storageLimit) || (1 * 1024 * 1024 * 1024);
    let storageUsedBytes = 0;
    let progressPercent = 0;

    if (userProfile && typeof userProfile.storageUsed === 'number' && userProfile.storageUsed > 0) {
      // Use actual storage from profile
      storageUsedBytes = userProfile.storageUsed;
    } else {
      // Fallback: calculate from files
      storageUsedBytes = calculateStorageFromFiles() * 1024 * 1024; // Convert MB to bytes
    }

    const usedGB = storageUsedBytes / (1024 * 1024 * 1024);
    const limitGB = limitBytes / (1024 * 1024 * 1024);
    progressPercent = (storageUsedBytes / limitBytes) * 100;

    let displayText = '';
    if (progressPercent >= 100) {
      displayText = 'Storage Full';
    } else if (usedGB < 1) {
      const usedMB = (storageUsedBytes / (1024 * 1024)).toFixed(2);
      displayText = `${usedMB} MB / 1 GB`;
    } else {
      displayText = `${usedGB.toFixed(2)} GB / 1 GB`;
    }

    return { 
      used: displayText, 
      limit: `1 GB`, 
      percent: Math.min(progressPercent, 100),
      isFull: progressPercent >= 100
    };
  };

  const storageInfo = getStorageInfo();

  // Load trash on mount
  useEffect(() => {
    const fileName = (userProfile && userProfile.name) || localStorage.getItem("userName") || "User";
    const trashedKey = `trashed_${fileName}`;
    const saved = JSON.parse(localStorage.getItem(trashedKey) || '[]');
    
    // Remove items older than 24 hours
    const now = new Date().getTime();
    const filtered = saved.filter(item => {
      const age = now - item.deletedAt;
      return age < 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    });
    
    // Update if any items were removed
    if (filtered.length !== saved.length) {
      localStorage.setItem(trashedKey, JSON.stringify(filtered));
    }
    
    setTrashedFiles(filtered);
  }, [userProfile]);

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

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  return (
    <div className={`dashboard${isDarkMode ? ' dark' : ''}`}> 

      {/* Sidebar */}
      <aside className={`sidebar${isDarkMode ? ' dark' : ''}`}> 
        <div className="logo" style={{display: 'flex', alignItems: 'center', gap: '0'}}>
          <span>CloudBox</span>
          <img src="/src/assets/LOGO.png" alt="CloudBox" style={{width: '80px', height: '80px', objectFit: 'contain'}} />
        </div>
        <nav>
          <ul>
            <li className={activeSection === 'files' ? 'active' : ''} onClick={() => setActiveSection('files')}>
              Home
            </li>
            <li className={activeSection === 'favorites' ? 'active' : ''} onClick={() => setActiveSection('favorites')}>Favorites</li>
            <li className={activeSection === 'trash' ? 'active' : ''} onClick={() => setActiveSection('trash')}>Trash</li>
            <li className={activeSection === 'contact' ? 'active' : ''} onClick={() => setActiveSection('contact')}>Contact</li>
            <li className={activeSection === 'settings' ? 'active' : ''} onClick={() => setActiveSection('settings')}>Settings</li>
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
          onClick={() => document.getElementById('file-upload-input').click()}
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
              top: '18px',
              right: '18px',
              zIndex: 3000,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxWidth: '340px'
            }}
          >
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${n.type === 'success' ? '#10b981' : '#ef4444'}`,
                  background: n.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  color: n.type === 'success' ? '#065f46' : '#991b1b',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                {n.message}
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <header>
          <div className="search-bar">
            <label htmlFor="search-input" style={{display:'none'}}>Search files</label>
            <input
              id="search-input"
              name="search"
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="header-right">
            {/* Cloud Icon for mobile */}
            <span 
              className="cloud-icon"
              title="Upload files"
              onClick={() => document.getElementById('file-upload-input').click()}
            >
              ☁️
            </span>

            {/* Mobile Upload Button */}
            <button
              className="mobile-upload-btn"
              onClick={() => document.getElementById('file-upload-input').click()}
              title="Upload files"
            >
              ☁️ Upload
            </button>

            <Switch isDarkMode={isDarkMode} onChange={toggleTheme} />
            
            {/* Hamburger Menu */}
            <div className="hamburger-menu">
              <button 
                className="hamburger-btn"
                onClick={() => setIsHamburgerOpen(!isHamburgerOpen)}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: '2px solid #e5e7eb',
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
                  <span style={{fontSize: '24px'}}>👤</span>
                )}
              </button>

              {/* Dropdown Menu */}
              {isHamburgerOpen && (
                <div className="hamburger-dropdown" style={{
                  position: 'absolute',
                  top: '65px',
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
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', margin: '0 12px'}}>
                  <Checkbox 
                    checked={selectMode}
                    onChange={() => {
                      setSelectMode(!selectMode);
                      setSelectedFileIds([]);
                    }}
                    id="select-mode-checkbox"
                  />
                  <label htmlFor="select-mode-checkbox" style={{fontSize: '14px', fontWeight: 500, color: selectMode ? '#3b82f6' : '#374151', cursor: 'pointer', userSelect: 'none'}}>Select</label>
                </div>
                <label>Sort by:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="date">Date Modified</option>
                  <option value="name">Name</option>
                  <option value="type">Type</option>
                  <option value="size">Size</option>
                </select>
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
            <div 
              className="upload-zone" 
              onDrop={handleDrop} 
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('file-upload-input').click()}
              style={{cursor: 'pointer'}}
            >
              <p>Drag & drop files here or click to upload</p>
              <label htmlFor="file-upload-input" style={{display:'none'}}>Upload file</label>
              <input
                id="file-upload-input"
                name="file-upload"
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
            </div>

            {/* Files View */}
            {(uploadProgress > 0 || uploadStatus) && (
              <div className="upload-progress">
                <div className="upload-progress-bar">
                  <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <div className="upload-progress-text" style={{color: '#222', fontWeight: 600, marginTop: '8px'}}>
                  {uploadStatus || `${uploadProgress}%`}
                </div>
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
                            // Select Mode: Show grid with row-based checkboxes
                            (() => {
                              const files = groupedByDate[date];
                              const rows = [];
                              for (let i = 0; i < files.length; i += 4) {
                                rows.push(files.slice(i, i + 4));
                              }
                              
                              return (
                                <div style={{position: 'relative'}}>
                                  {rows.map((rowFiles, rowIndex) => {
                                    const rowFileIds = rowFiles.map(f => f._id);
                                    const selectedInRow = rowFileIds.filter(id => selectedFileIds.includes(id)).length;
                                    const allSelectedInRow = selectedInRow === rowFiles.length;
                                    const someSelectedInRow = selectedInRow > 0 && selectedInRow < rowFiles.length;
                                    
                                    return (
                                      <div
                                        key={rowIndex}
                                        style={{
                                          display: 'flex',
                                          marginBottom: '16px',
                                          gap: '16px',
                                          alignItems: 'center',
                                          position: 'relative'
                                        }}
                                      >
                                        {/* Row Group Checkbox - Show for all rows */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                minWidth: '30px',
                                                flexShrink: 0
                                            }}
                                        >
                                            <NeonCheckbox
                                                checked={selectedInRow > 0}
                                                onChange={() => toggleRowSelection(rowFileIds)}
                                            />
                                        </div>

                                        {/* Grid of files - max 4 per row */}
                                        <div style={{display: 'grid', gridTemplateColumns: `repeat(${Math.min(rowFiles.length, 4)}, 1fr)`, gap: '12px', width: `calc(25% * ${Math.min(rowFiles.length, 4)})`}}>
                                          {rowFiles.map((file, fileIndex) => {
                                            const isSelected = selectedFileIds.includes(file._id);
                                            return (
                                              <div 
                                                key={fileIndex} 
                                                className="file-item"
                                                style={{
                                                  position: 'relative',
                                                  opacity: isSelected ? 0.8 : 1,
                                                  boxShadow: isSelected ? '0 0 0 3px #3b82f6' : 'none',
                                                  borderRadius: '8px',
                                                  overflow: 'hidden'
                                                }}
                                              >
                                                <div style={{position: 'absolute', top: '12px', right: '12px', zIndex: 20}}>
                                                  <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleFileSelection(file._id)}
                                                    id={`file-${file._id}`}
                                                    className="file-select-checkbox"
                                                    aria-label={`Select ${file.name}`}
                                                  />
                                                </div>
                                                <div style={{position: 'relative'}}>
                                                  {file.isImage ? (
                                                    <img src={file.url} alt={file.name} className="file-thumb" style={{cursor: 'default'}} />
                                                  ) : file.isVideo ? (
                                                    <video src={file.url} className="file-thumb" style={{cursor: 'default'}} />
                                                  ) : (
                                                    <div className="file-icon">📄</div>
                                                  )}
                                                </div>
                                                <div className="file-info">
                                                  <p title={file.name}>{file.name}</p>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()
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
                                    style={{
                                      position: 'relative',
                                      opacity: isSelected ? 0.8 : 1,
                                      border: isSelected ? '2px solid #3b82f6' : 'none',
                                      borderRadius: '8px',
                                      overflow: 'hidden'
                                    }}
                                  >
                                    <div style={{position: 'relative'}}>
                                      {file.isImage ? (
                                        <img src={file.url} alt={file.name} className="file-thumb" onClick={() => window.open(file.url, '_blank')} style={{cursor: 'pointer'}} />
                                      ) : file.isVideo ? (
                                        <video src={file.url} className="file-thumb" style={{cursor: 'pointer'}} onClick={() => window.open(file.url, '_blank')} />
                                      ) : (
                                        <div className="file-icon">📄</div>
                                      )}
                                      <button
                                        onClick={() => handleToggleFavorite(file)}
                                        style={{
                                          position: 'absolute',
                                          top: '8px',
                                          right: '8px',
                                          background: 'rgba(255,255,255,0.9)',
                                          border: 'none',
                                          borderRadius: '50%',
                                          width: '32px',
                                          height: '32px',
                                          fontSize: '18px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          transition: 'all 0.2s ease',
                                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                        }}
                                        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                                      >
                                        {isFavorited ? '❤️' : '🤍'}
                                      </button>
                                    </div>
                                    <div className="file-info">
                                      <p title={file.name}>{file.name}</p>
                                    </div>
                                    <div className="file-actions">
                                      <button onClick={() => handleDownload(file)} title="Download">⬇</button>
                                      <button onClick={() => handleShare(file)} title="Share">↗</button>
                                      <button onClick={() => handleRename(file)} title="Rename">✏</button>
                                      <button onClick={() => handleDelete(file)} title="Delete">🗑</button>
                                    </div>
                                  </div>
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
            {favorites.length === 0 ? (
              <div style={{padding: '40px', textAlign: 'center', color: '#9ca3af'}}>
                <p>No favorites yet. Click the heart icon on files to add them here.</p>
              </div>
            ) : (
              <div className="grid-view">
                {favorites.map((file, index) => {
                  const isSelected = selectedFileIds.includes(file._id);
                  return (
                    <div 
                      key={index} 
                      className="file-item"
                      style={{
                        position: 'relative',
                        opacity: isSelected ? 0.8 : 1,
                        border: isSelected ? '2px solid #3b82f6' : 'none',
                        borderRadius: '8px',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{position: 'relative'}}>
                        {file.isImage ? (
                          <img src={file.url} alt={file.name} className="file-thumb" onClick={() => window.open(file.url, '_blank')} style={{cursor: 'pointer'}} />
                        ) : file.isVideo ? (
                          <video src={file.url} className="file-thumb" style={{cursor: 'pointer'}} onClick={() => window.open(file.url, '_blank')} />
                        ) : (
                          <div className="file-icon">📄</div>
                        )}
                        <button
                          onClick={() => handleToggleFavorite(file)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(255,255,255,0.9)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            fontSize: '18px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                          title="Remove from favorites"
                        >
                          ❤️
                        </button>
                      </div>
                      <div className="file-info">
                        <p title={file.name}>{file.name}</p>
                      </div>
                      <div className="file-actions">
                        <button onClick={() => handleDownload(file)} title="Download">⬇</button>
                        <button onClick={() => handleShare(file)} title="Share">↗</button>
                        <button onClick={() => handleRename(file)} title="Rename">✏</button>
                        <button onClick={() => handleDelete(file)} title="Delete">🗑</button>
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
            {trashedFiles.length === 0 ? (
              <p style={{color: '#6b7280', marginTop: '20px'}}>Trash is empty.</p>
            ) : (
              <div className="grid-view" style={{marginTop: '20px'}}>
                {trashedFiles.map((file) => {
                  const now = new Date().getTime();
                  const age = now - file.deletedAt;
                  const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - age) / (60 * 60 * 1000));
                  
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
                <button onClick={() => setShowPasswordModal(true)} style={{padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', marginTop: '8px'}}>
                  Change Password
                </button>
              </div>

            </div>
          </section>
        )}

        {/* Recent Activity Panel removed for clarity and to avoid fake data */}

      </main>
    </div>
  );
}

export default Dashboard;

