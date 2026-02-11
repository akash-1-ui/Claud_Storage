// ...existing code...
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/dashboard.css";
import Chart from "chart.js/auto";
import Switch from "./Switch";

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
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const fetchProfile = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/api/auth/profile", {
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
      const res = await fetch("http://localhost:5000/api/files", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      // Map data to match expected format, add isImage for thumbnails
      const mappedFiles = data.map(file => ({
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
  if (savedPhoto) {
    setProfilePhoto(savedPhoto);
  }
  
  // Load favorites
  const savedFavorites = localStorage.getItem(`favorites_${userName}`);
  if (savedFavorites && favorites.length === 0) {
    setFavorites(JSON.parse(savedFavorites));
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
    localStorage.clear();
    navigate('/login');
  };

  const handleProfilePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const userName = (userProfile && userProfile.name) || localStorage.getItem("userName") || "User";
        setProfilePhoto(reader.result);
        localStorage.setItem(`profilePhoto_${userName}`, reader.result);
        showNotification('Profile photo updated!', 'success');
        setShowProfileUpload(false);
      };
      reader.readAsDataURL(file);
    }
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
    let uploaded = 0;
    setUploadProgress(0);
    setUploadStatus('Uploading...');
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch("http://localhost:5000/api/files/upload", {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        if (res.ok) {
          showNotification(`Upload successful!`, 'success');
          // No need to update local state here, will refresh from server after all uploads
        } else {
          showNotification(`Failed to upload ${file.name}`);
        }
      } catch (err) {
        showNotification(`Error uploading ${file.name}`);
      }
      uploaded++;
      setUploadProgress(Math.round(((uploaded) / files.length) * 100));
    }
    // After all uploads, fetch the latest files and profile from the server
    await fetchFiles();
    await fetchProfile();
    setUploadStatus('Upload complete!');
    setTimeout(() => {
      setUploadProgress(0);
      setUploadStatus('');
    }, 2000);
  };

  const showNotification = (message, type = 'error') => {
    if (!notificationsEnabled) return; // Skip if notifications are disabled
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const handleDownload = async (file) => {
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
      const response = await fetch(`http://localhost:5000/api/files/rename/${file._id}`, {
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
      await fetch(`http://localhost:5000/api/files/${file._id}`, {
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

  const handle2FA = () => {
    setTwoFactorEnabled(!twoFactorEnabled);
    showNotification(twoFactorEnabled ? '2FA disabled' : '2FA enabled. Check your email for setup instructions.', 'success');
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    const currentPass = document.getElementById('current-pass')?.value || '';
    const newPass = document.getElementById('new-pass')?.value || '';
    const confirmPass = document.getElementById('confirm-pass')?.value || '';

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
    showNotification('Password changed successfully!', 'success');
    setShowPasswordModal(false);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactEmail || !contactMessage) {
      showNotification('Please fill in both email and message');
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/contact", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: contactEmail, message: contactMessage }),
      });
      if (res.ok) {
        showNotification('Message sent successfully!', 'success');
        setContactEmail('');
        setContactMessage('');
      } else {
        showNotification('Failed to send message');
      }
    } catch (err) {
      showNotification('Error sending message');
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
    const storageLimit = 5; // 5 GB
    const storageLimitBytes = storageLimit * 1024 * 1024 * 1024;
    let storageUsedBytes = 0;
    let progressPercent = 0;

    if (userProfile && typeof userProfile.storageUsed === 'number' && userProfile.storageUsed > 0) {
      // Use actual storage from profile
      storageUsedBytes = userProfile.storageUsed;
    } else {
      // Fallback: calculate from files
      storageUsedBytes = calculateStorageFromFiles() * 1024 * 1024; // Convert MB to bytes
    }

    const limitBytes = (userProfile && userProfile.storageLimit) || storageLimitBytes;
    const usedGB = storageUsedBytes / (1024 * 1024 * 1024);
    const limitGB = limitBytes / (1024 * 1024 * 1024);
    progressPercent = (storageUsedBytes / limitBytes) * 100;

    if (usedGB < 1) {
      const usedMB = (storageUsedBytes / (1024 * 1024)).toFixed(2);
      return { used: `${usedMB} MB`, limit: `${limitGB.toFixed(2)} GB`, percent: Math.min(progressPercent, 100) };
    } else {
      return { used: `${usedGB.toFixed(2)} GB`, limit: `${limitGB.toFixed(2)} GB`, percent: Math.min(progressPercent, 100) };
    }
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
        <div className="logo" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
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
          <p>
            Storage Used: {loading ? 'Loading...' : `${storageInfo.used} / ${storageInfo.limit}`}
          </p>
          <div className="progress-bar">
            <div className="progress" style={{ width: `${storageInfo.percent}%` }}></div>
          </div>
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
                    onClick={() => setShowProfileUpload(!showProfileUpload)}
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
                    Update Profile Photo
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
                  <input type="password" id="current-pass" placeholder="Enter current password" style={{width: '100%', padding: '10px', border: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`, borderRadius: '6px', background: isDarkMode ? '#1a1a23' : '#f9fafb', color: isDarkMode ? '#e5e5e5' : '#222', fontSize: '13px', boxSizing: 'border-box'}} />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '6px', fontSize: '13px', color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 500}}>New Password</label>
                  <input type="password" id="new-pass" placeholder="Enter new password (min 6 chars)" style={{width: '100%', padding: '10px', border: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`, borderRadius: '6px', background: isDarkMode ? '#1a1a23' : '#f9fafb', color: isDarkMode ? '#e5e5e5' : '#222', fontSize: '13px', boxSizing: 'border-box'}} />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '6px', fontSize: '13px', color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 500}}>Confirm Password</label>
                  <input type="password" id="confirm-pass" placeholder="Confirm new password" style={{width: '100%', padding: '10px', border: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`, borderRadius: '6px', background: isDarkMode ? '#1a1a23' : '#f9fafb', color: isDarkMode ? '#e5e5e5' : '#222', fontSize: '13px', boxSizing: 'border-box'}} />
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
                <label>Sort by:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="date">Date Modified</option>
                  <option value="name">Name</option>
                  <option value="type">Type</option>
                  <option value="size">Size</option>
                </select>
              </div>
            </div>

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
                        <div className="grid-view">
                          {groupedByDate[date].map((file, index) => {
                            const isFavorited = favorites.some(fav => fav._id === file._id);
                            return (
                              <div key={index} className="file-item">
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
              <div className="photos-container">
                <div className="date-section">
                  <div className="grid-view">
                    {favorites.map((file, index) => {
                      const isFavorited = favorites.some(fav => fav._id === file._id);
                      return (
                        <div key={index} className="file-item">
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
                </div>
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

              {/* Two-Factor Authentication */}
              <div style={{marginBottom: '25px', paddingBottom: '15px', borderBottom: `1px solid ${isDarkMode ? '#3a3a47' : '#e5e7eb'}`}}>
                <h3 style={{marginBottom: '10px', color: isDarkMode ? '#e5e5e5' : '#222'}}>Two-Factor Authentication</h3>
                <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '12px'}}>Add an extra layer of security to your account.</p>
                <button onClick={handle2FA} style={{padding: '8px 16px', background: twoFactorEnabled ? '#ef4444' : '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'}}>
                  {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </button>
                <p style={{fontSize: '12px', color: '#9ca3af', marginTop: '8px'}}>Status: <strong style={{color: twoFactorEnabled ? '#10b981' : '#ef4444'}}>{twoFactorEnabled ? 'Enabled' : 'Disabled'}</strong></p>
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
