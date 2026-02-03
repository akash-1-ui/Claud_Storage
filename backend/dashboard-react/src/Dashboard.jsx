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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [notifications, setNotifications] = useState([]);
  const [currentPath, setCurrentPath] = useState(['Home']);
  const [activities, setActivities] = useState([]);

useEffect(() => {
  // 🔐 Auth check
  const token = localStorage.getItem("token");
  if (!token) {
    navigate('/login');
    return;
  }

  const fetchProfile = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/auth/profile", {
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
    try {
      const res = await fetch("http://localhost:5001/api/files", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      // Map data to match expected format, add isImage for thumbnails
      const mappedFiles = data.map(file => ({
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

      // 📊 Count file types
      const counts = { ZIP: 0, PDF: 0, PNG: 0, Others: 0 };

      mappedFiles.forEach((file) => {
        if (counts[file.type]) counts[file.type]++;
        else counts.Others++;
      });

      // 🧹 Destroy old chart
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // 📊 Create chart
      chartInstance.current = new Chart(chartRef.current, {
        type: "pie",
        data: {
          labels: ["ZIP", "PDF", "PNG", "Others"],
          datasets: [
            {
              data: [
                counts.ZIP,
                counts.PDF,
                counts.PNG,
                counts.Others,
              ],
              backgroundColor: [
                "#4f46e5",
                "#10b981",
                "#f59e0b",
                "#ef4444",
              ],
            },
          ],
        },
        options: {
          plugins: {
            legend: { position: "bottom" },
          },
        },
      });
    } catch (err) {
      console.error("Error fetching files", err);
      setLoading(false);
    }
  };

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
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch("http://localhost:5001/api/files/upload", {
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
    // After all uploads, fetch the latest files from the server
    await fetchFiles();
    setTimeout(() => setUploadProgress(0), 1000);
  };

  const showNotification = (message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
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
            <li className={activeSection === 'home' ? 'active' : ''} onClick={() => setActiveSection('home')}>Home</li>
            <li className={activeSection === 'files' ? 'active' : ''} onClick={() => setActiveSection('files')}>My Files</li>
            <li className={activeSection === 'trash' ? 'active' : ''} onClick={() => setActiveSection('trash')}>Trash</li>
            <li className={activeSection === 'settings' ? 'active' : ''} onClick={() => setActiveSection('settings')}>Settings</li>
          </ul>
        </nav>
        <div className="storage-usage">
          <p>
            Storage Used: {userProfile && typeof userProfile.storageUsed === 'number' && typeof userProfile.storageLimit === 'number'
              ? `${(userProfile.storageUsed / (1024 * 1024 * 1024)).toFixed(2)} GB / ${(userProfile.storageLimit / (1024 * 1024 * 1024)).toFixed(2)} GB`
              : files.length === 0 && !loading ? '0.00 GB / 5.00 GB' : 'Loading...'}
          </p>
          <div className="progress-bar">
            <div className="progress" style={{ width: userProfile && typeof userProfile.storageUsed === 'number' && typeof userProfile.storageLimit === 'number' ? `${(userProfile.storageUsed / userProfile.storageLimit) * 100}%` : files.length === 0 && !loading ? '0%' : '0%' }}></div>
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
            <input
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

        {/* Overview */}
        <section className="overview">
          <div className={`overview-card${isDarkMode ? ' dark' : ''}`}> 

            {/* Storage */}
            <div className="storage">
              <h2>Storage</h2>
              <p>Used: {userProfile ? `${(userProfile.storageUsed / (1024 * 1024 * 1024)).toFixed(2)} GB of ${(userProfile.storageLimit / (1024 * 1024 * 1024)).toFixed(2)} GB` : 'Loading...'}</p>
              <div className="progress-bar">
                <div className="progress" style={{ width: userProfile ? `${(userProfile.storageUsed / userProfile.storageLimit) * 100}%` : "0%" }}></div>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="file-types-chart">
              <h2>File Types</h2>
              <canvas ref={chartRef}></canvas>
            </div>

          </div>
        </section>

        {/* Files Section */}
        <section className={`files${isDarkMode ? ' dark' : ''}`}> 
          {/* Breadcrumb Navigation */}
          <div className="breadcrumb">
            <span>Home</span> / <span>{currentFolder}</span>
          </div>

          <div className="files-header">
            <h2>My Files</h2>
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

          {/* Drag & Drop Upload Zone */}
          <div className="upload-zone" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
            <p>Drag & drop files here or click to upload</p>
            <input
              id="file-upload-input"
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
          </div>

          {/* Files View */}
          {uploadProgress > 0 && (
            <div style={{ margin: '10px 0' }}>
              <div style={{ width: '100%', background: '#eee', borderRadius: 8, height: 10 }}>
                <div style={{ width: `${uploadProgress}%`, background: '#4f46e5', height: 10, borderRadius: 8, transition: 'width 0.3s' }}></div>
              </div>
              <div style={{ fontSize: 12, color: '#4f46e5', marginTop: 2 }}>{uploadProgress}%</div>
            </div>
          )}
          {viewMode === 'list' ? (
            <table>
              <thead>
                <tr>
                  <th><input type="checkbox" /></th>
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

                {!loading && files.length === 0 && (
                  <tr>
                    <td colSpan="6">
                      <div style={{textAlign:'center',padding:'30px 0',color:'#888'}}>
                        <div style={{fontSize:48,marginBottom:10}}>📁</div>
                        <div style={{fontWeight:600}}>No files yet</div>
                        <div style={{fontSize:14,marginTop:4}}>Start storing your data securely in the cloud!</div>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  sortedFiles.map((file, index) => (
                    <tr key={index}>
                      <td><input type="checkbox" /></td>
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
                        <button>Share</button>
                        <button onClick={() => handleRename(file)}>Rename</button>
                        <button>Move</button>
                        <button>Copy</button>
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
                <div style={{textAlign:'center',padding:'30px 0',color:'#888',width:'100%'}}>
                  <div style={{fontSize:64,marginBottom:10}}>📁</div>
                  <div style={{fontWeight:600}}>No files yet</div>
                  <div style={{fontSize:14,marginTop:4}}>Start storing your data securely in the cloud!</div>
                </div>
              )}

              {!loading &&
                sortedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <input type="checkbox" />
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
                      <button>Share</button>
                      <button onClick={() => handleDelete(file)}>Delete</button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* Recent Activity Panel removed for clarity and to avoid fake data */}

      </main>
    </div>
  );
}

export default Dashboard;
