import './Home.css';
import './AdminPage.css';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CheckRequests from './CheckRequests';
import { useState } from 'react';
import { CreateExecutionSheet } from './ExecutionSheet';

async function Logout(token, navigate) {
  try {
    const response = await fetch('/rest/login/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      }
    });
    CheckRequests(response, token, navigate);
    if (response.ok) {
      console.log("Logout successful");
      logoutAndRedirect(navigate);
    } else if (response.status === 404) {
      console.error("User not found deleting token anyway, redirecting to home.");
      logoutAndRedirect(navigate);
    }
  } catch (error) {
    console.error("Logout error:", error);
    logoutAndRedirect(navigate);
  }
}

function UserMenu({ username, onProfile, onSettings, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="user-menu-container" ref={menuRef}>
      <span
        className="user-menu-trigger"
        onClick={() => setOpen(!open)}
        style={{ cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px' }}
        tabIndex={0}
      >
        {username}
        <span style={{ marginLeft: 6, fontSize: 14, color: '#888' }}>▼</span>
      </span>
      {open && (
        <div className="user-menu-dropdown">
          <button
            className="user-menu-btn user-menu-profile"
            onClick={() => { setOpen(false); onProfile(); }}
          >
            <span className="user-menu-icon" role="img" aria-label="profile">👤</span>
            See Profile
          </button>
          <button
            className="user-menu-btn user-menu-settings"
            onClick={() => { setOpen(false); onSettings(); }}
          >
            <span className="user-menu-icon" role="img" aria-label="settings">⚙️</span>
            Settings
          </button>
          <button
            className="user-menu-btn user-menu-logout"
            onClick={() => { setOpen(false); onLogout(); }}
          >
            <span className="user-menu-icon" role="img" aria-label="logout">🚪</span>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [worksheetModal, setWorksheetModal] = useState(null);
  const [execSheetModal, setExecSheetModal] = useState(null);
  const [execSheetLoading, setExecSheetLoading] = useState(false);
  const [execSheetError, setExecSheetError] = useState(null);

  const { username, photo, role, token } = JSON.parse(
    sessionStorage.getItem('userInfo') ||
    '{"username": null, "photo": null, "role": "VU", "token": null}'
  );

  // TopBar with user menu
  const TopBar = (
    <div className="home-topbar">
      <img src="/Logo.jpeg" alt="Logo" className="home-logo" />
      <div className="home-top-right">
        {role !== 'VU' && username ? (
          <>
            <UserMenu
              username={username}
              onProfile={() => navigate('/user/profile')}
              onSettings={() => navigate('/settings')}
              onLogout={() => Logout(token, navigate)}
            />
            {photo && (
              <div className="profile-picture-container">
                <img
                  src={photo}
                  alt="Profile"
                  className="profile-picture"
                  onClick={() => window.open(photo, '_blank')}
                  title="Click to view full size"
                />
              </div>
            )}
          </>
        ) : (
          <>
            <span className="visitor-span">Currently navigating as Visitor</span>
            <button className="btn btn-primary btn-small" onClick={() => navigate('/login')}>Login</button>
            <button className="btn btn-success btn-small" onClick={() => navigate('/register')}>Register</button>
          </>
        )}
      </div>
    </div>
  );

  // Special home for VU or RU
  if (role === 'VU' || role === 'RU') {
    return (
      <div
        className="home-root special-home"
        style={{
          backgroundImage: 'url(/background-home.jpg)',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
        }}
      >
        {TopBar}
        <div className="special-home-container">
          <div
            className="special-home-column event-sample"
            onClick={() => navigate('/event')}
            tabIndex={0}
            role="button"
            title="Go to Events"
          >
            <h2>Upcoming Events</h2>
            <div className="sample-scroll">
              {/* Dummy event data */}
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div className="event-card" key={i}>
                  <h4>Event {i}</h4>
                  <p>Date: 2024-07-{10 + i}</p>
                  <p>Location: Venue {i}</p>
                  <p>Description: This is a sample event description for event {i}.</p>
                </div>
              ))}
            </div>
            <div className="sample-overlay">Click to view all events</div>
          </div>
          <div
            className="special-home-column media-sample"
            onClick={() => navigate('/media')}
            tabIndex={0}
            role="button"
            title="Go to Media"
          >
            <h2>Social Media Feed</h2>
            <div className="sample-scroll">
              {/* Dummy media data */}
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div className="media-card" key={i}>
                  <div className="media-header">
                    <img src={`/dummy-profile-${1}.png`} alt="User" className="media-avatar" />
                    <span>User{i}</span>
                  </div>
                  <p>This is a sample post #{i} on the social feed.</p>
                  <img src={`/dummy-media-${1}.jpg`} alt="Media" className="media-img" />
                </div>
              ))}
            </div>
            <div className="sample-overlay">Click to view social feed</div>
          </div>
        </div>
      </div>
    );
  }

  // Sidebar buttons by role
  const userButtons = [
    { label: 'See Profile', onClick: () => navigate('/user/profile') },
    { label: 'Settings', onClick: () => navigate('/settings') },
    { label: 'Change Password', onClick: () => navigate('/user/changePassword') },
    { label: 'Change Role', onClick: () => navigate('/user/changeRole'), show: role === 'SYSADMIN' || role === 'SYSBO' },
    { label: 'Change State', onClick: () => navigate('/user/changeState'), show: role === 'SYSADMIN' || role === 'SYSBO' },
    { label: 'List Users', onClick: () => navigate('/user/listUsers'), show: role === 'SYSADMIN' || role === 'SYSBO' },
    { label: 'Force Logout', onClick: () => navigate('/admin/forcelogout'), show: role === 'SYSADMIN' || role === 'SYSBO' },
    { label: 'Admin Page', onClick: () => navigate('/admin'), show: role === 'SYSADMIN' || role === 'SYSBO' },
  ];

  const worksheetButtons = [
    { label: 'Create Worksheet', onClick: () => navigate('/worksheet/create'), show: role === 'SYSADMIN' || role === 'SYSBO' || role === 'SMBO' },
    { label: 'Upload Worksheet', onClick: () => navigate('/worksheet/upload'), show: role === 'SYSADMIN' || role === 'SYSBO' || role === 'SMBO' },
    { label: 'Edit Worksheet', onClick: () => setWorksheetModal('edit'), show: role === 'SYSADMIN' || role === 'SYSBO' || role === 'SMBO' },
    { label: 'View Worksheet', onClick: () => setWorksheetModal('view'), show: role === 'SYSADMIN' || role === 'SYSBO' || role === 'SMBO' },
    { label: 'List Worksheets', onClick: () => navigate('/worksheet/list'), show: role === 'SYSADMIN' || role === 'SYSBO' || role === 'SMBO' },
    { label: 'Generic View Worksheet', onClick: () => setWorksheetModal('generic-view'), show: role === 'SYSADMIN' || role === 'SYSBO' || role === 'SMBO' || role === 'SGVBO' || role === 'SDVBO' },
    { label: 'Generic List Worksheets', onClick: () => navigate('/worksheet/generic-list'), show: role === 'SYSADMIN' || role === 'SYSBO' || role === 'SMBO' || role === 'SGVBO' || role === 'SDVBO' },
  ];

  // Execution sheet buttons for roles with access
  const execSheetButtons = [
    { label: 'View Execution Sheet', onClick: () => setExecSheetModal('view'), show: role === 'SYSADMIN' || role === 'SYSBO' || role === 'SMBO' },
    { label: 'Create Execution Sheet', onClick: () => setExecSheetModal('create'), show: role === 'PRBO' },
    { label: 'Export Execution Sheet', onClick: () => setExecSheetModal('export'), show: role === 'SDVBO' },
    { label: 'Assign Operation to Operator', onClick: () => setExecSheetModal('assign'), show: role === 'PRBO' },
    { label: 'Start Activity', onClick: () => setExecSheetModal('start'), show: role === 'PO' },
    { label: 'Stop Activity', onClick: () => setExecSheetModal('stop'), show: role === 'PO' },
    { label: 'View Activity State', onClick: () => setExecSheetModal('viewact'), show: role === 'PO' || role === 'PRBO' },
    { label: 'Add Info to Activity', onClick: () => setExecSheetModal('addinfo'), show: role === 'OP' },
    { label: 'View Operation Status', onClick: () => setExecSheetModal('viewstatus'), show: role === 'PRBO' || role === 'SDVBO' },
    { label: 'Edit Operation', onClick: () => setExecSheetModal('editop'), show: role === 'PRBO' || role === 'SDVBO' },
  ];

  return (
    <div
      className="home-root"
      style={{
        backgroundImage: 'url(/background-home.jpg)',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
      }}
    >
      {TopBar}
      <div className="home-main">
        <div className="home-sidebar">
          <h3>User</h3>
          {userButtons.filter(btn => btn.show === undefined || btn.show).map(btn => (
            <button key={btn.label} className="btn btn-primary" onClick={btn.onClick}>{btn.label}</button>
          ))}
          {(role === 'SYSADMIN' || role === 'SYSBO' || role === 'SMBO') && (
            <>
              <h3>Worksheets</h3>
              {worksheetButtons.filter(btn => btn.show).map(btn => (
                <button key={btn.label} className="btn btn-info" onClick={btn.onClick}>{btn.label}</button>
              ))}
              <h3>Execution Sheets</h3>
              {execSheetButtons.filter(btn => btn.show).map(btn => (
                <button key={btn.label} className="btn btn-warning" onClick={btn.onClick}>{btn.label}</button>
              ))}
            </>
          )}
        </div>
        <div className="home-content">
          <h1>Welcome to the Home Page</h1>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img
              src="/Logo.jpeg"
              alt="Welcome"
              style={{ width: '300px', margin: '20px 0' }}
            />
            <p>This is the main content area.</p>
            <p>Work in Progress.</p>
          </div>
        </div>
        {worksheetModal && (
          <SelectWorksheet
            key={worksheetModal}
            mode={worksheetModal}
            onClose={() => setWorksheetModal(null)}
          />
        )}
        {execSheetModal && (
          <SelectExecutionSheet
            key={execSheetModal}
            mode={execSheetModal}
            onClose={() => { setExecSheetModal(null); setExecSheetError(null); }}
            loading={execSheetLoading}
            setLoading={setExecSheetLoading}
            error={execSheetError}
            setError={setExecSheetError}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  );
}

function logoutAndRedirect(navigate) {
  sessionStorage.removeItem('userInfo');
  navigate('/login');
}

function SelectWorksheet({ onClose, mode }) {
  const [id, setId] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  const handleSubmit = (event) => {
    event.preventDefault();
    if (id.trim() === '') {
      alert("Please enter a valid Worksheet ID.");
      return;
    }
    if (mode === 'view') {
      navigate(`/worksheet/view/${id}`);
    } else if (mode === 'edit') {
      navigate(`/worksheet/edit/${id}`);
    } else if (mode === 'generic-view') {
      navigate(`/worksheet/generic-view/${id}`);
    } else {
      console.error("Invalid mode specified:", mode);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Select Worksheet</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="worksheetId">Worksheet ID:</label>
          <input
            type="text"
            id="worksheetId"
            value={id}
            onChange={(e) => setId(e.target.value)}
            ref={inputRef}
            required
            autoFocus
            className="form-input"
          />
          <button type="submit" className="btn btn-primary btn-small">Go</button>
          <button type="button" className="btn btn-danger btn-small" onClick={onClose}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

// --- New component for execution sheet selection/creation ---
function SelectExecutionSheet({ onClose, mode, loading, setLoading, error, setError, navigate }) {
  const [id, setId] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (id.trim() === '') {
      alert("Please enter a valid Worksheet/Execution Sheet ID.");
      return;
    }
    if (mode === 'view') {
      navigate(`/executionsheet/${id}`);
    } else if (mode === 'create') {
      try {
        await CreateExecutionSheet(id, null, setError, setLoading, navigate);
      } catch (e) { }
    } else if (mode === 'export') {
      // Export logic (navigate or download)
      navigate(`/executionsheet/${id}?export=1`);
    } else if (mode === 'assign') {
      navigate(`/executionsheet/${id}/assign`);
    } else if (mode === 'start') {
      navigate(`/executionsheet/${id}/start`);
    } else if (mode === 'stop') {
      navigate(`/executionsheet/${id}/stop`);
    } else if (mode === 'viewact') {
      navigate(`/executionsheet/${id}/activity`);
    } else if (mode === 'addinfo') {
      navigate(`/executionsheet/${id}/addinfo`);
    } else if (mode === 'viewstatus') {
      navigate(`/executionsheet/${id}/status`);
    } else if (mode === 'editop') {
      navigate(`/executionsheet/${id}/editop`);
    } else {
      setError("Invalid mode specified.");
    }
  };

  // Button label mapping
  const labelMap = {
    view: 'View Execution Sheet',
    create: 'Create Execution Sheet',
    export: 'Export Execution Sheet',
    assign: 'Assign Operation to Operator',
    start: 'Start Activity',
    stop: 'Stop Activity',
    viewact: 'View Activity State',
    addinfo: 'Add Info to Activity',
    viewstatus: 'View Operation Status',
    editop: 'Edit Operation'
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{labelMap[mode] || 'Execution Sheet Action'}</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="execSheetId">Worksheet/Execution Sheet ID:</label>
          <input
            type="text"
            id="execSheetId"
            value={id}
            onChange={(e) => setId(e.target.value)}
            ref={inputRef}
            required
            autoFocus
            className="form-input"
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary btn-small" disabled={loading}>
            {loading ? 'Processing...' : labelMap[mode] || 'Go'}
          </button>
          <button type="button" className="btn btn-danger btn-small" onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </form>
        {error && <div className="error-message" style={{ marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  );
}

