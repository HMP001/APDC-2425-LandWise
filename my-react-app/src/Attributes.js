import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { topBar } from './TopBar';
import CheckRequests from './CheckRequests';
import './AuthForm.css';
import roles from './roles'; // Assuming roles.js exports the roles object

async function fetchAttributes(navigate, username) {
  const response = await fetch(`/rest/utils/user/${username}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  CheckRequests(response, navigate);
  const data = await response.json();
  return data;
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
          name="user_name"
          value={attributes.user_name}
          onChange={changeData}
          autoComplete="name"
        />

        <label className="form-label" htmlFor="email">Email:</label>
        <input
          className="form-input"
          id="email"
          type="email"
          name="user_email"
          value={attributes.user_email}
          onChange={changeData}
          autoComplete="email"
        />

        <label className="form-label" htmlFor="telephone1">Phone Number:</label>
        <input
          className='form-input'
          id="telephone1"
          type="tel"
          name="user_phone1"
          value={attributes.user_phone1}
          onChange={changeData}
          autoComplete="tel"
        />

        <label className="form-label" htmlFor="telephone2">Secondary Phone Number:</label>
        <input
          className="form-input"
          id="telephone2"
          type="tel"
          name="user_phone2"
          value={attributes.user_phone2}
          onChange={changeData}
          autoComplete="tel"
        />

        <label className="form-label" htmlFor="profile">Profile:</label>
        <select
          className="form-input"
          id="profile"
          name="user_profile"
          value={attributes.user_profile}
          onChange={changeData}
        >
          <option value="PUBLICO">Public</option>
          <option value="PRIVADO">Private</option>
        </select>

        <label className="form-label" htmlFor="role">Role:</label>
        <select
          className="form-input"
          id="role"
          name="user_role"
          value={attributes.user_role}
          onChange={changeData}
        >
          {Object.entries(roles)
            .filter(([key]) => key !== 'root' && key !== 'visitor')
            .map(([key, role]) => (
              <option key={key} value={role.value}>
                {role.name}
              </option>
            ))}
        </select>

        <label className="form-label" htmlFor="account_state">Account State:</label>
        <select
          className="form-input"
          id="account_state"
          name="user_account_state"
          value={attributes.user_account_state}
          onChange={changeData}
        >
          <option value="ATIVADO">Activated</option>
          <option value="INATIVO">Deactivated</option>
        </select>


        <label className="form-label" htmlFor="nif">NIF:</label>
        <input
          className="form-input"
          id="nif"
          type="text"
          name="user_nif"
          value={attributes.user_nif}
          onChange={changeData}
          autoComplete="nif"
        />

        <label className="form-label" htmlFor="employer">Employer:</label>
        <input
          className="form-input"
          id="employer"
          type="text"
          name="user_employer"
          value={attributes.user_employer}
          onChange={changeData}
          autoComplete="employer"
        />

        <label className="form-label" htmlFor="job">Job:</label>
        <input
          className="form-input"
          id="job"
          type="text"
          name="user_job"
          value={attributes.user_job}
          onChange={changeData}
          autoComplete="job"
        />

        <label className="form-label" htmlFor="address">Address:</label>
        <input
          className="form-input"
          id="address"
          type="text"
          name="user_address"
          value={attributes.user_address}
          onChange={changeData}
          autoComplete="address"
        />

        <label className="form-label" htmlFor="postal_code">Postal Code:</label>
        <input
          className="form-input"
          id="postal_code"
          type="text"
          name="user_postal_code"
          value={attributes.user_postal_code}
          onChange={changeData}
          autoComplete="postal_code"
        />

        <label className="form-label" htmlFor="company_nif">Company NIF:</label>
        <input
          className="form-input"
          id="company_nif"
          type="text"
          name="user_company_nif"
          value={attributes.user_company_nif}
          onChange={changeData}
          autoComplete="company_nif"
        />

        <label className="form-label" htmlFor="photo_url">Photo URL:</label>
        <input
          className="form-input"
          id="photo_url"
          type="text"
          name="user_photo_url"
          value={attributes.user_photo_url}
          onChange={changeData}
          autoComplete="photo_url"
        />

        <label className="form-label" htmlFor="cc">CC:</label>
        <input
          className="form-input"
          id="cc"
          type="text"
          name="user_cc"
          value={attributes.user_cc}
          onChange={changeData}
          autoComplete="cc"
        />

        <label className="form-label" htmlFor="cc_issue_date">CC Issue Date:</label>
        <input
          className="form-input"
          id="cc_issue_date"
          type="date"
          name="user_cc_issue_date"
          value={attributes.user_cc_issue_date}
          onChange={changeData}
          autoComplete="cc_issue_date"
        />

        <label className="form-label" htmlFor="cc_issue_place">CC Issue Place:</label>
        <input
          className="form-input"
          id="cc_issue_place"
          type="text"
          name="user_cc_issue_place"
          value={attributes.user_cc_issue_place}
          onChange={changeData}
          autoComplete="cc_issue_place"
        />

        <label className="form-label" htmlFor="cc_validity">CC Validity:</label>
        <input
          className="form-input"
          id="cc_validity"
          type="date"
          name="user_cc_validity"
          value={attributes.user_cc_validity}
          onChange={changeData}
          autoComplete="cc_validity"
        />

        <label className="form-label" htmlFor="birth_date">Birth Date</label>
        <input
          className="form-input"
          id="birth_date"
          type="date"
          name="user_birth_date"
          value={attributes.user_birth_date}
          onChange={changeData}
          autoComplete="birth_date"
        />

        <label className="form-label" htmlFor="nationality">Nationality</label>
        <input
          className="form-input"
          id="nationality"
          type="text"
          name="user_nationality"
          value={attributes.user_nationality}
          onChange={changeData}
          autoComplete="nationality"
        />
        <label className="form-label" htmlFor="residence_country">Residence Country</label>
        <input
          className="form-input"
          id="residence_country"
          type="text"
          name="user_residence_country"
          value={attributes.user_residence_country}
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
            <span className="spinner"/>
          </>
        ) : (
        'Submit'
        )}
      </button>
    </form>
  );
};

export function Attributes() {
  const navigate = useNavigate();
  const [attributes, setAttributes] = useState([]);
  const [initialAttributes, setInitialAttributes] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(false);

  const { username } = JSON.parse(sessionStorage.getItem('userInfo') || {});
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
      isMounted = false; // Cleanup to prevent state updates if unmounted
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
    setAttributes({ ...attributes, [event.target.name]: event.target.value });
    setSuccess(false);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    const stringAttributes = Object.fromEntries(
      Object.entries(attributes).map(([key, value]) => [key, String(value)])
    );

    try {
      const response = await fetch('/rest/utils/changeattributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUsername: username,
          attributes: stringAttributes
        })
      });

      if (response.ok) {
        setInitialAttributes(attributes);
        setSuccess(true);
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

  return (
    <>
      {topBar(navigate)}
      <div className="AuthForm">
        <header className="AuthForm-header">
          
          {error && <p className="error">{error}</p>}
          <p>Edit your account</p>
          {attributesForms({
            attributes,
            changeData,
            handleSubmit,
            loading
          })}
          {success && <p className="success">Attributes updated successfully!</p>}
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
                  <span className="spinner"/>
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

export function ChangeState() {
  const navigate = useNavigate();

  const [changeUser, setChangeUser] = useState('');
  const [accountState, setAccountState] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { role } = JSON.parse(sessionStorage.getItem('userInfo') || {});
  if (role !== 'SYSADMIN' && role !== 'SYSBO') {
    return <p>You do not have permission to change account state.</p>;
  }

  const handleStateChange = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch('/rest/utils/changestate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUsername: changeUser,
          account_state: accountState
        }),
      });

      CheckRequests(response, navigate);

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        console.log('Account state changed successfully');
      } else {
        setError(result.message || 'Failed to change account state.');
        setLoading(false);
      }
    } catch (err) {
      console.error("Error:", err);
      setError('An error occurred while changing the account state.');
      setLoading(false);
    }
  };

  return (
    <>
      {topBar(navigate)}
      <div className="AuthForm">
        {success && <p className="success">Account state updated successfully!</p>}
        <header className="AuthForm-header">
          {error && <p className="error">{error}</p>}
          <h2>Change Account State</h2>
          <form onSubmit={handleStateChange} className="form-grid">
            <label className="form-label" htmlFor="changeUser">Target Username:</label>
            <input
              className="form-input"
              id="changeUser"
              type="text"
              name="changeUser"
              value={changeUser}
              required
              onChange={(e) => setChangeUser(e.target.value)}
            />

            <label className="form-label" htmlFor="accountState">New State:</label>
            <select
              className="form-input"
              id="accountState"
              name="accountState"
              value={accountState}
              required
              onChange={(e) => setAccountState(e.target.value)}
            >
              <option value="">Select state</option>
              <option value="ATIVADO">ACTIVATED</option>
              <option value="INATIVO">DEACTIVATED</option>
            </select>

            <button 
              className="btn btn-primary btn-large" 
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  Changing state...
                  <span className="spinner"/>
                </>
              ) : (
              'Change State'
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
                    <span className="spinner"/>
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