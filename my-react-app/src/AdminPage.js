import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminPage.css';
import roles from './roles'; // Add this import

export default function AdminPage() {
  const navigate = useNavigate();
  const [logoutUser, setLogoutUser] = useState('');
  const [logoutResult, setLogoutResult] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [actionResult, setActionResult] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [accountAction, setAccountAction] = useState('activate');
  const [roleFilter, setRoleFilter] = useState(''); // New state for role filter
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const { role } = JSON.parse(sessionStorage.getItem('userInfo') || '{}');

  if (role !== 'SYSADMIN' && role !== 'SYSBO') {
    return <div className="admin-page"><h2>Access Denied</h2></div>;
  }

  const handleForceLogout = async (e) => {
    e.preventDefault();
    setLogoutResult('');
    try {
      const response = await fetch('/rest/utils/forceLogout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: logoutUser })
      });
      if (response.ok) {
        setLogoutResult('User logged out successfully.');
      } else {
        setLogoutResult('Failed to logout user.');
      }
    } catch {
      setLogoutResult('Error contacting backend.');
    }
  };

  // Account management handler
  const handleAccountAction = async (e) => {
    e.preventDefault();
    setActionResult('');
    setActionLoading(true);
    let endpoint = '';
    let body = { targetUsername: targetUser };
    switch (accountAction) {
      case 'activate':
        endpoint = '/rest/utils/changestate';
        body.account_state = 'ATIVADO';
        break;
      case 'deactivate':
        endpoint = '/rest/utils/changestate';
        body.account_state = 'INATIVO';
        break;
      case 'suspend':
        endpoint = '/rest/utils/changestate';
        body.account_state = 'SUSPENSO';
        break;
      case 'delete':
        endpoint = '/rest/utils/deleteuser';
        break;
      default:
        setActionResult('Invalid action.');
        setActionLoading(false);
        return;
    }
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        setActionResult('Action performed successfully.');
      } else {
        setActionResult('Failed to perform action.');
      }
    } catch {
      setActionResult('Error contacting backend.');
    }
    setActionLoading(false);
  };

  const handleViewProfile = (e) => {
    e.preventDefault();
    if (profileUsername) {
      setShowProfileModal(false);
      navigate(`/admin/profile/${profileUsername}`);
      setProfileUsername('');
    }
  };

  return (
    <div className="admin-page">
      <h2>Admin Panel</h2>
      <form onSubmit={handleForceLogout}>
        <div className="row-box row-box-flex">
          <label htmlFor="logoutUser">Force Logout User:</label>
          <input
            id="logoutUser"
            type="text"
            value={logoutUser}
            onChange={e => setLogoutUser(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-danger">Force Logout</button>
        </div>
      </form>
      {logoutResult && <p>{logoutResult}</p>}

      <div className="row-box" style={{ marginBottom: '1rem' }}>
        <button
          className="btn btn-info"
          type="button"
          onClick={() => setShowProfileModal(true)}
        >
          View Profile of Account
        </button>
      </div>
      {/* Popup Modal */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>View Profile</h3>
            <form onSubmit={handleViewProfile}>
              <label htmlFor="profileUsername">Username:</label>
              <input
                id="profileUsername"
                type="text"
                value={profileUsername}
                onChange={e => setProfileUsername(e.target.value)}
                required
                autoFocus
              />
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!profileUsername}
                >
                  Go
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowProfileModal(false); setProfileUsername(''); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account management actions */}
      <form onSubmit={handleAccountAction} className="account-action-form">
        <div className="row-box row-box-flex">
          <label htmlFor="targetUser">Username:</label>
          <input
            id="targetUser"
            type="text"
            value={targetUser}
            onChange={e => setTargetUser(e.target.value)}
            required
          />
          <label htmlFor="accountAction">Action:</label>
          <select
            id="accountAction"
            value={accountAction}
            onChange={e => setAccountAction(e.target.value)}
          >
            <option value="activate">Activate</option>
            <option value="deactivate">Deactivate</option>
            <option value="suspend">Suspend</option>
            <option value="delete">Delete</option>
          </select>
        </div>
        <div className="row-box">
          <button type="submit" className="btn btn-primary" disabled={actionLoading}>
            {actionLoading ? 'Processing...' : 'Submit'}
          </button>
        </div>
      </form>
      {actionResult && <p>{actionResult}</p>}

      {/* Filtered lists navigation */}
      <div className="row-box">
        <button className="btn btn-secondary" onClick={() => navigate('/admin/list/filter?state=active')}>
          List Active Accounts
        </button>
      </div>
      <div className="row-box">
        <button className="btn btn-secondary" onClick={() => navigate('/admin/list/filter?state=inactive')}>
          List Not Active Accounts
        </button>
      </div>
      <div className="row-box">
        <button className="btn btn-secondary" onClick={() => navigate('/admin/list/filter?state=suspended')}>
          List Suspended Accounts
        </button>
      </div>
      <div className="row-box">
        <button className="btn btn-secondary" onClick={() => navigate('/admin/list/filter?profile=public')}>
          List Public Accounts
        </button>
      </div>
      <div className="row-box">
        <button className="btn btn-secondary" onClick={() => navigate('/admin/list/filter?profile=private')}>
          List Private Accounts
        </button>
      </div>
      <div className="row-box row-box-flex">
        <div className="role-filter-row">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="">Select role</option>
            {Object.entries(roles)
              .filter(([key]) => key !== 'root' && key !== 'visitor')
              .map(([key, role]) => (
                <option key={key} value={role.value}>
                  {role.name}
                </option>
              ))}
          </select>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/admin/list/filter?role=${encodeURIComponent(roleFilter)}`)}
            disabled={!roleFilter}
          >
            List Users by Role
          </button>
        </div>
      </div>

      {/* Back to Home button remains outside of row-box */}
      <div className="back-home-row">
        <button className="btn btn-primary" onClick={() => navigate('/')}>Back to Home</button>
      </div>
    </div>
  );
}
