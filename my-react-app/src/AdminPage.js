import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminPage.css';

export default function AdminPage() {
  const navigate = useNavigate();
  const [logoutUser, setLogoutUser] = useState('');
  const [logoutResult, setLogoutResult] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [actionResult, setActionResult] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [accountAction, setAccountAction] = useState('activate');
  const { role } = JSON.parse(sessionStorage.getItem('userInfo') || '{}');

  if (role !== 'SYSADMIN' && role !== 'SYSBO') {
    return <div className="admin-page"><h2>Access Denied</h2></div>;
  }

  const handleForceLogout = async (e) => {
    e.preventDefault();
    setLogoutResult('');
    try {
      const response = await fetch('/rest/admin/forcelogout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: logoutUser })
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

  return (
    <div className="admin-page">
      <h2>Admin Panel</h2>
      <form onSubmit={handleForceLogout}>
        <label htmlFor="logoutUser">Force Logout User:</label>
        <input
          id="logoutUser"
          type="text"
          value={logoutUser}
          onChange={e => setLogoutUser(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-danger">Force Logout</button>
      </form>
      {logoutResult && <p>{logoutResult}</p>}

      {/* Account management actions */}
      <form onSubmit={handleAccountAction} style={{ marginTop: '2rem' }}>
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
        <button type="submit" className="btn btn-primary" disabled={actionLoading}>
          {actionLoading ? 'Processing...' : 'Submit'}
        </button>
      </form>
      {actionResult && <p>{actionResult}</p>}

      {/* Filtered lists navigation */}
      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/list/filter?type=active')}>List Active Accounts</button>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/list/filter?type=inactive')}>List Not Active Accounts</button>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/list/filter?type=public')}>List Public Accounts</button>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/list/filter?type=private')}>List Private Accounts</button>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/list/filter?type=role')}>List Users by Role</button>
      </div>

      <button className="btn btn-secondary" style={{ marginTop: '2rem' }} onClick={() => navigate('/')}>Back to Home</button>
    </div>
  );
}
