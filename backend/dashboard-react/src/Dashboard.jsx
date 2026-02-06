// ...existing code...
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/dashboard.css";
import Chart from "chart.js/auto";

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
  const [notifications, setNotifications] = useState([]);
  const [currentPath, setCurrentPath] = useState(['move']);
  const [activities, setActivities] = useState([]);
  const [isMyFilesExpanded, setIsMyFilesExpanded] = useState(false);

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

useEffect(() => {
  // 🔐 Auth check
  const token = localStorage.getItem("token");
  if (!token) {
    navigate('/login');
    return;
  }

  fetchProfile();
  fetchFiles();

  return () => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
  };
}, []);


  const logout = () => {
    localStorage.clear();
    navigate('/login');
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

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/files/${file._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        showNotification('File deleted successfully!', 'success');
        await fetchFiles(); // Refresh the file list
      } else {
        showNotification('Failed to delete file');
      }
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
    let storageUsedGB = 0;
    let progressPercent = 0;

    if (userProfile && typeof userProfile.storageUsed === 'number') {
      storageUsedGB = (userProfile.storageUsed / (1024 * 1024 * 1024)).toFixed(2);
      const limitGB = userProfile.storageLimit ? (userProfile.storageLimit / (1024 * 1024 * 1024)).toFixed(2) : storageLimit;
      progressPercent = userProfile.storageLimit ? (userProfile.storageUsed / userProfile.storageLimit) * 100 : 0;
      return { used: `${storageUsedGB} GB`, limit: `${limitGB} GB`, percent: progressPercent };
    } else {
      // Fallback: calculate from files
      storageUsedGB = calculateStorageFromFiles();
      progressPercent = (storageUsedGB / storageLimit) * 100;
      return { used: `${storageUsedGB.toFixed(2)} MB`, limit: `${storageLimit * 1024} MB`, percent: Math.min(progressPercent, 100) };
    }
  };

  const storageInfo = getStorageInfo();

  // Show username from userProfile if available, else fallback to localStorage
  const userName = (userProfile && userProfile.name) || localStorage.getItem("userName") || "User";

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

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  return (
    <div className={`dashboard${isDarkMode ? ' dark' : ''}`}> 

      {/* Sidebar */}
      <aside className={`sidebar${isDarkMode ? ' dark' : ''}`}> 
        <div className="logo">CloudBox</div>
        <nav>
          <ul>
            <li className={activeSection === 'files' ? 'active' : ''} onClick={() => { setActiveSection('files'); setIsMyFilesExpanded(!isMyFilesExpanded); }}>
              Home {isMyFilesExpanded ? '▼' : '▶'}
            </li>
            {isMyFilesExpanded && (
              <ul className="sidebar-files-list">
                {loading ? (
                  <li>Loading...</li>
                ) : files.length === 0 ? (
                  <li>No files</li>
                ) : (
                  files.slice(0, 10).map((file, index) => (
                    <li key={index} onClick={() => window.open(file.url, '_blank')} className="sidebar-file-item">
                      {file.isImage ? (
                        <img src={file.url} alt={file.name} style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 2, marginRight: 5 }} />
                      ) : file.isVideo ? (
                        <video src={file.url} style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 2, marginRight: 5 }} controls={false} poster="https://img.icons8.com/ios-filled/50/000000/video-file.png" />
                      ) : (
                        <span style={{ fontSize: 16, marginRight: 5 }}>📄</span>
                      )}
                      <span className="sidebar-file-name">{file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}</span>
                    </li>
                  ))
                )}
                {files.length > 10 && (
                  <li className="view-all-sidebar" onClick={() => setActiveSection('files')}>View all ({files.length})</li>
                )}
              </ul>
            )}
            <li className={activeSection === 'trash' ? 'active' : ''} onClick={() => setActiveSection('trash')}>Trash</li>
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
            <button onClick={toggleTheme} className="theme-toggle">
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <div className="profile" style={{fontWeight:600, fontSize:16, color:'#4f46e5', display:'flex', alignItems:'center', gap:8}}>
              <span style={{fontSize:20, color:'#222'}}>👤</span> {userName}
            </div>
            <div className="notifications">
              🔔
              {notifications.length > 0 && <span className="notification-count">{notifications.length}</span>}
            </div>
            <button onClick={logout}>Logout</button>
          </div>
        </header>

        {/* Conditional Content Based on Active Section */}
        {activeSection === 'files' && (
          <section className={`files${isDarkMode ? ' dark' : ''}`}>
            {/* Breadcrumb Navigation */}
            <div className="breadcrumb">
              <span>Home</span>
            </div>

            <div className="files-header">
              <h2>Home</h2>
              <div className="view-controls">
                <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'active' : ''}>List</button>
                <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'active' : ''}>Grid</button>
              </div>
              <div className="sort-options">
                <label>Sort by:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="name">Name</option>
                  <option value="type">Type</option>
                  <option value="size">Size</option>
                  <option value="date">Date Modified</option>
                </select>
              </div>
            </div>

            {/* Storage Statistics Chart */}
            <div className="chart-container" style={{maxWidth: '300px', margin: '20px auto'}}>
              <canvas ref={chartRef}></canvas>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div className="upload-zone" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
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
                <div className="upload-progress-text">
                  {uploadStatus || `${uploadProgress}%`}
                </div>
              </div>
            )}
            {viewMode === 'list' ? (
              <table>
                <thead>
                  <tr>
                    <th><input type="checkbox" id="select-all-checkbox" name="select-all" aria-label="Select all files" /></th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Date Modified</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan="6">Loading files...</td>
                    </tr>
                  )}

                  {!loading &&
                    sortedFiles.map((file, index) => (
                      <tr key={index}>
                        <td><input type="checkbox" name={`select-file-${index}`} aria-label={`Select file ${file.name}`} /></td>
                        <td>
                          {file.isImage ? (
                            <img src={file.url} alt={file.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, marginRight: 8, verticalAlign: 'middle' }} />
                          ) : file.isVideo ? (
                            <video src={file.url} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, marginRight: 8, verticalAlign: 'middle' }} controls={false} poster="https://img.icons8.com/ios-filled/50/000000/video-file.png" />
                          ) : (
                            <span style={{ fontSize: 24, marginRight: 8 }}>📄</span>
                          )}
                          {file.name}
                        </td>
                        <td>{file.type}</td>
                        <td>{file.size}</td>
                        <td>{new Date(file.updatedAt).toLocaleDateString()}</td>
                        <td>
                          <button onClick={() => window.open(file.url, '_blank')}>Open</button>
                          <button onClick={() => handleDownload(file)}>Download</button>
                          <button onClick={() => handleShare(file)}>Share</button>
                          <button onClick={() => handleRename(file)}>Rename</button>
                          <button onClick={() => handleMove(file)}>Move</button>
                          <button onClick={() => handleCopy(file)}>Copy</button>
                          <button onClick={() => handleDelete(file)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <div className="grid-view">
                {loading && <p>Loading files...</p>}

                {!loading && files.length === 0 && (
                  <p>No files uploaded yet.</p>
                )}

                {!loading && files.length > 0 &&
                  sortedFiles.map((file, index) => (
                    <div key={index} className="file-item">
                      <input type="checkbox" name={`select-grid-file-${index}`} aria-label={`Select file ${file.name}`} />
                      {file.isImage ? (
                        <img src={file.url} alt={file.name} className="file-thumb" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
                      ) : file.isVideo ? (
                        <video src={file.url} className="file-thumb" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} controls poster="https://img.icons8.com/ios-filled/50/000000/video-file.png" />
                      ) : (
                        <div className="file-icon" style={{ fontSize: 40 }}>📄</div>
                      )}
                      <p>{file.name}</p>
                      <div className="file-actions">
                        <button onClick={() => window.open(file.url, '_blank')}>Open</button>
                        <button onClick={() => handleDownload(file)}>Download</button>
                        <button onClick={() => handleShare(file)}>Share</button>
                        <button onClick={() => handleDelete(file)}>Delete</button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        )}

        {/* TRASH SECTION */}
        {activeSection === 'trash' && (
          <section className={`files${isDarkMode ? ' dark' : ''}`}>
            <h2>Trash</h2>
            <p style={{color: '#6b7280', marginTop: '20px'}}>Trash feature coming soon. Deleted files will appear here.</p>
          </section>
        )}

        {/* SETTINGS SECTION */}
        {activeSection === 'settings' && (
          <section className={`files${isDarkMode ? ' dark' : ''}`}>
            <h2>Settings</h2>
            <div style={{marginTop: '20px', maxWidth: '600px'}}>
              <div style={{marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #e5e7eb'}}>
                <h3 style={{marginBottom: '10px'}}>Account Settings</h3>
                <p style={{fontSize: '14px', color: '#6b7280'}}>
                  Username: <strong>{userName}</strong>
                </p>
              </div>
              <div style={{marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #e5e7eb'}}>
                <h3 style={{marginBottom: '10px'}}>Storage Information</h3>
                <p style={{fontSize: '14px', color: '#6b7280'}}>
                  Used: {storageInfo.used} / {storageInfo.limit}
                </p>
                <div style={{marginTop: '10px', width: '100%', height: '10px', background: '#e5e7eb', borderRadius: '10px'}}>
                  <div style={{height: '100%', background: '#4f46e5', borderRadius: '10px', width: `${storageInfo.percent}%`}}></div>
                </div>
              </div>
              <div style={{marginBottom: '25px'}}>
                <h3 style={{marginBottom: '10px'}}>Theme</h3>
                <button onClick={toggleTheme} style={{padding: '8px 16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>
                  Switch to {isDarkMode ? 'Light' : 'Dark'} Mode
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
