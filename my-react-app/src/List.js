import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { topBar } from './TopBar';
import CheckRequests from './CheckRequests';
import './List.css';

export default function ListUsers() {
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [availableRoles, setAvailableRoles] = useState([]);

  // Filtering logic for admin/list/filter and utils/listLogged
  const params = new URLSearchParams(location.search);
  const filterType = location.pathname.startsWith('/admin/list/filter') ? params.get('type')
    : location.pathname.startsWith('/utils/listLogged') ? 'logged'
      : null;

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      setLoading(true);
      setError('');
      let url = '';
      let fetchOptions = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      };

      if (!filterType) {
        // General list for everyone
        url = '/rest/utils/list';
      } else if (filterType === 'role' && roleFilter) {
        url = `/rest/admin/list/filter?type=role&role=${encodeURIComponent(roleFilter)}`;
      } else if (filterType === 'active') {
        url = '/rest/admin/list/filter?type=active';
      } else if (filterType === 'inactive') {
        url = '/rest/admin/list/filter?type=inactive';
      } else if (filterType === 'public') {
        url = '/rest/admin/list/filter?type=public';
      } else if (filterType === 'private') {
        url = '/rest/admin/list/filter?type=private';
      } else if (filterType === 'logged') {
        url = '/rest/utils/listLogged';
      } else if (filterType === 'role') {
        // For role filter, fetch all roles for dropdown
        url = '/rest/admin/list/filter?type=role';
      } else {
        url = '/rest/utils/list';
      }

      try {
        const request = await fetch(url, fetchOptions);
        CheckRequests(request, navigate);
        const data = await request.json();
        // Normalize user keys: remove 'user_' prefix except for 'username'
        const normalizeUser = (user) =>
          Object.fromEntries(
            Object.entries(user).map(([key, value]) => {
              if (key === "username") return [key, value];
              return [key.startsWith("user_") ? key.slice(5) : key, value];
            })
          );
        if (!filterType) {
          // General list: collect available roles for filter
          if (isMounted) {
            const normalizedUsers = Object.values(data).map(normalizeUser);
            setUsers(normalizedUsers);
            const roles = Array.from(new Set(normalizedUsers.map(u => u.role).filter(Boolean)));
            setAvailableRoles(roles);
          }
        } else if (filterType === 'role' && !roleFilter) {
          // Only fetch available roles for dropdown
          if (isMounted) {
            const normalizedUsers = Object.values(data).map(normalizeUser);
            const roles = Array.from(new Set(normalizedUsers.map(u => u.role).filter(Boolean)));
            setAvailableRoles(roles);
            setUsers([]); // No users shown until role is selected
          }
        } else {
          // Filtered admin list or logged users
          if (isMounted) setUsers(Object.values(data).map(normalizeUser));
        }
      } catch (err) {
        if (isMounted) setError('Error fetching users. Please try again later.');
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUsers();

    return () => { isMounted = false; };
    // eslint-disable-next-line
  }, [navigate, filterType, roleFilter]);

  // Helper function to get user initials for avatar
  const getUserInitials = (user) => {
    const name = user.name || user.username || user.id || '';
    return name.toString().substring(0, 2).toUpperCase() || '?';
  };

  if (loading) {
    return (
      <>
        {topBar(navigate)}
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {topBar(navigate)}
        <div className="error-container">
          <p>{error}</p>
        </div>
      </>
    );
  }

  return (
    <>
      {topBar(navigate)}
      <div className="user-list-container">
        <h1 className="user-list-header">
          {filterType === 'active' && 'Active Accounts'}
          {filterType === 'inactive' && 'Not Active Accounts'}
          {filterType === 'public' && 'Public Accounts'}
          {filterType === 'private' && 'Private Accounts'}
          {filterType === 'role' && 'Users by Role'}
          {filterType === 'logged' && 'Logged Users'}
          {!filterType && 'Registered Users'}
        </h1>

        {filterType === 'role' && (
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="roleFilter">Select Role: </label>
            <select
              id="roleFilter"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="">-- Choose Role --</option>
              {availableRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        )}

        {users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No users found</h3>
            <p>There are currently no users in the system.</p>
          </div>
        ) : (
          <ul className="users-grid">
            {users.map((user, userIndex) => {
              // Determine if card should be clickable
              let isClickable = false;
              const { role: userRole } = user;
              const sessionUser = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
              const myRole = sessionUser.role;

              // SYSADMIN: can click any card
              if (myRole === 'SYSADMIN') {
                isClickable = true;
              }
              // SYSBO: can click users with role in back office below theirs
              else if (myRole === 'SYSBO') {
                // Define back office roles below SYSBO
                const backOfficeBelow = ['SGVBO', 'SDVBO', 'SMBO', 'PRBO'];
                if (backOfficeBelow.includes(userRole)) {
                  isClickable = true;
                }
              }

              const handleCardClick = () => {
                if (isClickable && user.username) {
                  navigate(`/admin/profile/${user.username}`);
                }
              };

              return (
                <li
                  key={user.id || user.username || userIndex}
                  className={`user-card${isClickable ? ' clickable' : ''}`}
                  onClick={isClickable ? handleCardClick : undefined}
                  style={isClickable ? { cursor: 'pointer' } : undefined}
                >
                  <div className="user-avatar">
                    {getUserInitials(user)}
                  </div>
                  <div className="user-info">
                    {sortFields(user).map(([key, value]) => (
                      <div key={key} className="user-field">
                        <span className="field-label">{FIELD_LABELS[key] || key}:</span>
                        <span
                          className={
                            key === 'pwd' ? 'field-value password-field' : 'field-value'
                          }
                          title={key === 'pwd' && typeof value === 'string' ? value : undefined}
                        >
                          {key === 'creation_time' && typeof value === 'object' && value !== null
                            ? formatTimestamp(value)
                            : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

function formatTimestamp(ts) {
  if (ts && typeof ts === 'object' && 'seconds' in ts) {
    const date = new Date(ts.seconds * 1000);
    return date.toLocaleString();
  }
  return JSON.stringify(ts);
};

// User-friendly field labels
const FIELD_LABELS = {
  id: "ID",
  username: "Username",
  name: "Name",
  email: "Email",
  pwd: "Password",
  role: "Role",
  account_state: "Account State",
  profile: "Profile",
  phone1: "Phone",
  phone2: "Secondary Phone",
  nif: "NIF",
  employer: "Employer",
  job: "Job",
  address: "Address",
  postal_code: "Postal Code",
  company_nif: "Company NIF",
  photo_url: "Photo URL",
  cc: "CC",
  cc_issue_date: "CC Issue Date",
  cc_issue_place: "CC Issue Place",
  cc_validity: "CC Validity",
  birth_date: "Birth Date",
  nationality: "Nationality",
  residence_country: "Residence Country",
  creation_time: "Creation Time"
};

const FIELD_ORDER = [
  'id', 'username', 'name', 'email', "pwd", 'role', 'account_state'
];

function sortFields(user) {
  const entries = Object.entries(user);
  // Sort by FIELD_ORDER, then the rest alphabetically
  return entries.sort(([a], [b]) => {
    const ia = FIELD_ORDER.indexOf(a);
    const ib = FIELD_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
};