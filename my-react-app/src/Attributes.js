import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { topBar } from './TopBar';
import CheckRequests from './CheckRequests';
import './AuthForm.css';
import './ProfileView.css';
import roles from './roles'; // Assuming roles.js exports the roles object

async function fetchAttributes(navigate, username) {
  const response = await fetch(`/rest/utils/user/${username}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  CheckRequests(response, navigate);
  const data = await response.json();
  // Normalize keys: remove 'user_' prefix except for 'username'
  const normalized = Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (key === "username") return [key, value];
      return [key.startsWith("user_") ? key.slice(5) : key, value];
    })
  );
  return normalized;
};

const attributesForms = ({
  attributes,
  changeData,
  handleSubmit,
  loading
}) => {
  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="form-label" htmlFor="username">Username:</label>
        <input
          className="form-input"
          id="username"
          type="text"
          name="username"
          value={attributes.username}
          onChange={changeData}
          autoComplete="username"
        />

        <label className="form-label" htmlFor="name">Name:</label>
        <input
          className="form-input"
          id="name"
          type="text"
          name="name"
          value={attributes.name}
          onChange={changeData}
          autoComplete="name"
        />

        <label className="form-label" htmlFor="email">Email:</label>
        <input
          className="form-input"
          id="email"
          type="email"
          name="email"
          value={attributes.email}
          onChange={changeData}
          autoComplete="email"
        />

        <label className="form-label" htmlFor="phone1">Phone Number:</label>
        <input
          className='form-input'
          id="phone1"
          type="tel"
          name="phone1"
          value={attributes.phone1}
          onChange={changeData}
          autoComplete="tel"
        />

        <label className="form-label" htmlFor="phone2">Secondary Phone Number:</label>
        <input
          className="form-input"
          id="phone2"
          type="tel"
          name="phone2"
          value={attributes.phone2}
          onChange={changeData}
          autoComplete="tel"
        />

        <label className="form-label" htmlFor="profile">Profile:</label>
        <select
          className="form-input"
          id="profile"
          name="profile"
          value={attributes.profile}
          onChange={changeData}
        >
          <option value="PUBLICO">Public</option>
          <option value="PRIVADO">Private</option>
        </select>

        <label className="form-label" htmlFor="nif">NIF:</label>
        <input
          className="form-input"
          id="nif"
          type="text"
          name="nif"
          value={attributes.nif}
          onChange={changeData}
          autoComplete="nif"
        />

        <label className="form-label" htmlFor="employer">Employer:</label>
        <input
          className="form-input"
          id="employer"
          type="text"
          name="employer"
          value={attributes.employer}
          onChange={changeData}
          autoComplete="employer"
        />

        <label className="form-label" htmlFor="job">Job:</label>
        <input
          className="form-input"
          id="job"
          type="text"
          name="job"
          value={attributes.job}
          onChange={changeData}
          autoComplete="job"
        />

        <label className="form-label" htmlFor="address">Address:</label>
        <input
          className="form-input"
          id="address"
          type="text"
          name="address"
          value={attributes.address}
          onChange={changeData}
          autoComplete="address"
        />

        <label className="form-label" htmlFor="postal_code">Postal Code:</label>
        <input
          className="form-input"
          id="postal_code"
          type="text"
          name="postal_code"
          value={attributes.postal_code}
          onChange={changeData}
          autoComplete="postal_code"
        />

        <label className="form-label" htmlFor="company_nif">Company NIF:</label>
        <input
          className="form-input"
          id="company_nif"
          type="text"
          name="company_nif"
          value={attributes.company_nif}
          onChange={changeData}
          autoComplete="company_nif"
        />

        <label className="form-label" htmlFor="photo_url">Photo URL (optional):</label>
        <input
          className="form-input"
          id="photo_url"
          type="text"
          name="photo_url"
          value={attributes.photo_url}
          onChange={changeData}
          autoComplete="photo_url"
        />
        <label className="form-label" htmlFor="profile_picture">Profile Picture (optional):</label>
        <input
          className="form-input"
          id="profile_picture"
          type="file"
          name="profile_picture"
          accept="image/*"
          onChange={changeData}
        />

        <label className="form-label" htmlFor="cc">CC:</label>
        <input
          className="form-input"
          id="cc"
          type="text"
          name="cc"
          value={attributes.cc}
          onChange={changeData}
          autoComplete="cc"
        />

        <label className="form-label" htmlFor="cc_issue_date">CC Issue Date:</label>
        <input
          className="form-input"
          id="cc_issue_date"
          type="date"
          name="cc_issue_date"
          value={attributes.cc_issue_date}
          onChange={changeData}
          autoComplete="cc_issue_date"
        />

        <label className="form-label" htmlFor="cc_issue_place">CC Issue Place:</label>
        <input
          className="form-input"
          id="cc_issue_place"
          type="text"
          name="cc_issue_place"
          value={attributes.cc_issue_place}
          onChange={changeData}
          autoComplete="cc_issue_place"
        />

        <label className="form-label" htmlFor="cc_validity">CC Validity:</label>
        <input
          className="form-input"
          id="cc_validity"
          type="date"
          name="cc_validity"
          value={attributes.cc_validity}
          onChange={changeData}
          autoComplete="cc_validity"
        />

        <label className="form-label" htmlFor="birth_date">Birth Date</label>
        <input
          className="form-input"
          id="birth_date"
          type="date"
          name="birth_date"
          value={attributes.birth_date}
          onChange={changeData}
          autoComplete="birth_date"
        />

        <label className="form-label" htmlFor="nationality">Nationality</label>
        <input
          className="form-input"
          id="nationality"
          type="text"
          name="nationality"
          value={attributes.nationality}
          onChange={changeData}
          autoComplete="nationality"
        />
        <label className="form-label" htmlFor="residence_country">Residence Country</label>
        <input
          className="form-input"
          id="residence_country"
          type="text"
          name="residence_country"
          value={attributes.residence_country}
          onChange={changeData}
          autoComplete="residence_country"
        />
      </div>
      <button
        className="btn btn-primary btn-large"
        type="submit"
        disabled={loading}
      >
        {loading ? (
          <>
            Submitting...
            <span className="spinner" />
          </>
        ) : (
          'Submit'
        )}
      </button>
    </form>
  );
};

const ProfileView = ({ attributes, onEdit, onChangePassword, onToggleProfile }) => (
  <div className="profile-view">
    <div className="profile-header">
      <img
        src={attributes.photo_url || "https://ui-avatars.com/api/?name=" + (attributes.name || attributes.username)}
        alt="Profile"
        className="profile-photo"
      />
      <div>
        <h2>{attributes.name || attributes.username}</h2>
        <p className="profile-username">@{attributes.username}</p>
        <p className="profile-role">{attributes.role}</p>
      </div>
    </div>
    <div className="profile-details">
      <div><strong>Email:</strong> {attributes.email}</div>
      <div><strong>Phone:</strong> {attributes.phone1}</div>
      {attributes.phone2 && <div><strong>Secondary Phone:</strong> {attributes.phone2}</div>}
      <div><strong>Profile:</strong> {attributes.profile}</div>
      <div><strong>Account State:</strong> {attributes.account_state}</div>
      <div><strong>NIF:</strong> {attributes.nif}</div>
      <div><strong>Employer:</strong> {attributes.employer}</div>
      <div><strong>Job:</strong> {attributes.job}</div>
      <div><strong>Address:</strong> {attributes.address}</div>
      <div><strong>Postal Code:</strong> {attributes.postal_code}</div>
      <div><strong>Company NIF:</strong> {attributes.company_nif}</div>
      <div><strong>CC:</strong> {attributes.cc}</div>
      <div><strong>CC Issue Date:</strong> {attributes.cc_issue_date}</div>
      <div><strong>CC Issue Place:</strong> {attributes.cc_issue_place}</div>
      <div><strong>CC Validity:</strong> {attributes.cc_validity}</div>
      <div><strong>Birth Date:</strong> {attributes.birth_date}</div>
      <div><strong>Nationality:</strong> {attributes.nationality}</div>
      <div><strong>Residence Country:</strong> {attributes.residence_country}</div>
    </div>
    <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
      <button className="btn btn-primary btn-large" onClick={onEdit}>
        Edit Attributes
      </button>
      {onChangePassword && (
        <button className="btn btn-warning btn-large" onClick={onChangePassword}>
          Change Password
        </button>
      )}
      {/* Toggle visibility button for RU role */}
      {onToggleProfile && (
        <button className="btn btn-secondary btn-large" onClick={onToggleProfile}>
          {attributes.profile === "PUBLICO" ? "Set Private" : "Set Public"}
        </button>
      )}
    </div>
  </div>
);

// Main Attributes component, supports both self and admin mode
export function Attributes() {
  const navigate = useNavigate();
  const [attributes, setAttributes] = useState([]);
  const [initialAttributes, setInitialAttributes] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const { user } = useParams(); // Use 'id' instead of 'entry'

  // If username is provided, use it as the username to fetch/edit, else use session user
  const sessionUser = JSON.parse(sessionStorage.getItem('userInfo') || {});
  const username = user || sessionUser.username;

  useEffect(() => {
    let isMounted = true;
    fetchAttributes(navigate, username)
      .then(attributes => {
        setAttributes(attributes);
        setInitialAttributes(attributes);
      })
      .catch(error => {
        console.error("Error fetching attributes:", error);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingUser(false);
        }
      });
    return () => {
      isMounted = false;
    }
  }, [navigate, username]);

  if (loadingUser) {
    return (
      <>
        {topBar(navigate)}
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading user...</p>
        </div>
      </>
    );
  }

  const changeData = (event) => {
    if (event.target.type === 'file') {
      setAttributes({ ...attributes, profile_picture: event.target.files[0] });
    } else {
      setAttributes({ ...attributes, [event.target.name]: event.target.value });
    }
    setSuccess(false);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    // Remove 'user_' prefix from keys except 'username'
    const stringAttributes = Object.fromEntries(
      Object.entries(attributes).map(([key, value]) => {
        if (key === "username") return [key, String(value)];
        // Don't include profile_picture in JSON
        if (key === "profile_picture") return null;
        return [key.startsWith("user_") ? key.slice(5) : key, String(value)];
      }).filter(Boolean)
    );

    try {
      const formData = new FormData();
      formData.append('targetUsername', username);
      formData.append('attributes', JSON.stringify(stringAttributes));
      if (attributes.profile_picture) {
        formData.append('profile_picture', attributes.profile_picture);
      }
      const response = await fetch('/rest/utils/changeattributes', {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        setInitialAttributes(attributes);
        setSuccess(true);
        setEditing(false);
        setAttributes({ ...attributes, profile_picture: null });
      } else {
        setError("Failed to update attributes. Please try again later.");
        setAttributes(initialAttributes);
        setLoading(false);
      }
    } catch (error) {
      setError("An error occurred while updating attributes.");
      setAttributes(initialAttributes);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Handler for toggling public/private profile
  const handleToggleProfile = async () => {
    const newProfile = attributes.profile === "PUBLICO" ? "PRIVADO" : "PUBLICO";
    setLoading(true);
    try {
      // Remove 'user_' prefix from keys except 'username'
      const attrNoPrefix = Object.fromEntries(
        Object.entries({ ...attributes, user_profile: newProfile }).map(([key, value]) => {
          if (key === "username") return [key, String(value)];
          return [key.startsWith("user_") ? key.slice(5) : key, String(value)];
        })
      );
      const response = await fetch('/rest/utils/changeattributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUsername: username,
          attributes: attrNoPrefix
        })
      });
      if (response.ok) {
        // Refresh attributes from backend to ensure consistency
        const updated = await fetchAttributes(navigate, username);
        setAttributes(updated);
        setInitialAttributes(updated);
        setSuccess(true);
      } else {
        setError("Failed to update profile visibility.");
      }
    } catch (error) {
      setError("An error occurred while updating profile visibility.");
    }
    setLoading(false);
  };

  return (
    <>
      {topBar(navigate)}
      <div className="AuthForm">
        <header className="AuthForm-header">
          {error && <p className="error">{error}</p>}
          <p>Profile</p>
          {!editing ? (
            <ProfileView
              attributes={attributes}
              onEdit={() => setEditing(true)}
              onChangePassword={!user ? () => navigate('/user/changePassword') : undefined}
              // Show toggle only for self and RU role
              onToggleProfile={
                !user && attributes.role === "RU"
                  ? handleToggleProfile
                  : undefined
              }
            />
          ) : (
            <>
              {attributesForms({
                attributes,
                changeData,
                handleSubmit,
                loading
              })}
              <button
                className="btn btn-secondary"
                type="button"
                style={{ marginTop: "1rem" }}
                onClick={() => {
                  setAttributes(initialAttributes);
                  setEditing(false);
                  setError('');
                  setSuccess(false);
                }}
              >
                Cancel
              </button>
              {success && <p className="success">Attributes updated successfully!</p>}
            </>
          )}
        </header>
      </div>
    </>
  );
}

export function ChangePassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { username } = JSON.parse(sessionStorage.getItem('userInfo') || {});

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch('/rest/utils/changepassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        })
      });
      CheckRequests(response, navigate);
      if (response.ok) {
        console.log("Password changed successfully");
        navigate('/settings');
      } else {
        console.error("Failed to change password:", response.statusText);
        setError("Failed to change password. Please try again later.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setError("An error occurred while changing the password.");
      setLoading(false);
    }
  };

  return (
    <>
      {topBar(navigate)}
      <div className="AuthForm">
        <header className="AuthForm-header">
          {error && <p className="error">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="form-label" htmlFor="username">Username:</label>
              <input
                className="form-input"
                id="username"
                type="text"
                name="username"
                value={username}
                readOnly
                disabled={true}
                autoComplete="username"
              />

              <label className="form-label" htmlFor="currentPassword">Current Password:</label>
              <input
                className="form-input"
                id="currentPassword"
                type="password"
                name="currentPassword"
                required
                autoComplete="current-password"
              />

              <label className="form-label" htmlFor="password">New Password:</label>
              <input
                className="form-input"
                id="password"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <label className="form-label" htmlFor="confirmation">Confirm Password:</label>
              <input
                className="form-input"
                id="confirmation"
                type="password"
                name="confirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <button className="btn btn-warning btn-large" type="submit">
              {loading ? (
                <>
                  Changing password...
                  <span className="spinner" />
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </form>
        </header>
      </div>
    </>
  );
}

export function ChangeRole() {
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [role, setRole] = useState('');
  const [changeUser, setChangeUser] = useState('')
  const [loading, setLoading] = useState(false);

  const { username } = JSON.parse(sessionStorage.getItem('userInfo') || {});

  const handleRoleChange = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch('/rest/utils/changerole', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, role })
      });
      CheckRequests(response, navigate);
      if (response.ok) {
        setSuccess(true);
        console.log("Role changed successfully");
        navigate('/settings');
      } else {
        console.error("Failed to change role:", response.statusText);
        setError("Failed to change role. Please try again later.");
        setLoading(false);
      }
    }
    catch (error) {
      console.error("Error changing role:", error);
      setError("An error occurred while changing the role.");
      setLoading(false);
    }
  };

  return (
    <>
      {topBar(navigate)}
      <div className="AuthForm">
        <header className="AuthForm-header">
          {error && <p className="error">{error}</p>}
          <h2>Change User Role</h2>
          <div className="form-grid">
            <form onSubmit={handleRoleChange}>
              <label className="form-label" htmlFor="username">Username:</label>
              <input
                className="form-input"
                id="username"
                type="text"
                name="username"
                value={changeUser}
                onChange={(e) => setChangeUser(e.target.value)}
                autoComplete="username"
              />

              <label className="form-label" htmlFor="role">New Role:</label>
              <select
                className="form-input"
                id="role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                {Object.entries(roles)
                  .filter(([key]) => key !== 'root' && key !== 'visitor')
                  .map(([key, role]) => (
                    <option key={key} value={role.value}>
                      {role.name}
                    </option>
                  ))}
              </select>
              {success && <p className="success">Role changed successfully!</p>}
              <button
                className="btn btn-primary btn-large"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    Changing role...
                    <span className="spinner" />
                  </>
                ) : (
                  'Change Role'
                )}
              </button>
            </form>
          </div>
        </header>
      </div>
    </>
  );
}