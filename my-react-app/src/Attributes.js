import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { topBar } from './TopBar';
import CheckRequests from './CheckRequests';
import './AuthForm.css';

async function fetchAttributes(token, navigate) {
  const response = await fetch('/api/user', {
    headers: {
      'Authorization': token
    }
  });
  CheckRequests(response, token, navigate);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.map(userToAttributes);
};

function userToAttributes(user) {
  return Object.entries(user).map(([key, value]) => {
    let type = "text";
    let autoComplete = key;

    switch (key.toLowerCase()) {
      case 'email':
        type = 'email';
        autoComplete = 'email';
        break;
      case 'password':
        type = 'password';
        autoComplete = 'new-password';
        break;
      case 'username':
        type = 'text';
        autoComplete = 'username';
        break;
      case 'telephone':
        type = 'tel';
        autoComplete = 'tel';
        break;
      default:
        type = 'text';
        autoComplete = key;
        break;
    }

    return {
      label: key.charAt(0).toUpperCase() + key.slice(1),
      name: key,
      type: type,
      value: value || '',
      autoComplete: autoComplete
    };
  });

};

const attributesForms = ({
  attributes,
  changeData,
  handleSubmit
}) => {
  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        {attributes.map((attribute, index) => (
          <div key={index}>
            <label className="form-label" htmlFor={`attribute-${index}`}>{attribute.label}:</label>
            <input
              className="form-input"
              id={`attribute-${index}`}
              type={attribute.type}
              name={attribute.name}
              value={attribute.value}
              onChange={changeData}
              required={false}
              autoComplete={attribute.autoComplete}
            />
          </div>
        ))}
      </div>
      <button className="btn btn-primary btn-large" type="submit">Submit</button>
    </form>
  );
};

export function Attributes() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');
  const [attributes, setAttributes] = useState([]);
  const [initialAttributes, setInitialAttributes] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }
    fetchAttributes(token, navigate)
      .then(attributes => {
        setAttributes(attributes);
        setInitialAttributes(attributes);
      })
      .catch(error => {
        console.error("Error fetching attributes:", error);
      });
  }, [token, navigate]);

  if (!token) {
    return <p>Error: No authentication token found. Redirecting to log in.</p>;
  }

  const username = JSON.parse(token).username; // Parse token if stored as JSON string

  const changeData = (event) => {
    const { name, value } = event.target;
    setAttributes(prev =>
      prev.map(attr =>
        attr.name === name ? { ...attr, value } : attr
      )
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    const data = {};
    attributes.forEach(attr => {
      data[attr.name] = attr.value;
    });

    try {
      const response = await fetch('/rest/utils/changeattributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          targetUsername: username,
          data
        })
      });

      if (response.ok) {
        setInitialAttributes(attributes);
        setSuccess(true);
      } else {
        setError("Failed to update attributes. Please try again later.");
        setAttributes(initialAttributes);
      }
    } catch (error) {
      setError("An error occurred while updating attributes.");
      setAttributes(initialAttributes);
    }
  };

  return (
    <>
      {topBar(navigate)}
      <div className="AuthForm">
        {success && <p className="success">Attributes updated successfully!</p>}
        <header className="AuthForm-header">
          {error && <p className="error">{error}</p>}
          <p>Edit your account</p>
          {attributesForms({
            attributes,
            changeData,
            handleSubmit
          })}
        </header>
      </div>
    </>
  );
}

export function ChangePassword() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
  }, [token, navigate]);

  if (!token) {
    return <p>Error: No authentication token found. Redirecting to log in.</p>;
  }

  const username = JSON.parse(token).username; // Parse token as JSON

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch('/rest/utils/changepassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          username: JSON.parse(token).username,
          password
        })
      });
      CheckRequests(response, token, navigate);
      if (response.ok) {
        console.log("Password changed successfully");
        navigate('/settings');
      } else {
        console.error("Failed to change password:", response.statusText);
        setError("Failed to change password. Please try again later.");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setError("An error occurred while changing the password.");
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
            <button className="btn btn-warning btn-large" type="submit">Change Password</button>
          </form>
        </header>
      </div>
    </>
  );
}

export function ChangeState() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  const [changeUser, setChangeUser] = useState('');
  const [accountState, setAccountState] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
  }, [token, navigate]);

  if (!token) {
    return <p>Error: No authentication token found. Redirecting to log in.</p>;
  }

  const userRole = JSON.parse(token).role;
  if (userRole !== 'admin' && userRole !== 'backoffice') {
    return <p>You do not have permission to change account state.</p>;
  }

  const handleStateChange = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!changeUser || !accountState) {
      setError("Please fill in both fields.");
      return;
    }

    try {
      const response = await fetch('/rest/utils/changestate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          targetUsername: changeUser,
          account_state: accountState
        }),
      });

      CheckRequests(response, token, navigate);

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        console.log('Account state changed successfully');
      } else {
        setError(result.message || 'Failed to change account state.');
      }
    } catch (err) {
      console.error("Error:", err);
      setError('An error occurred while changing the account state.');
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
              onChange={(e) => setChangeUser(e.target.value)}
            />

            <label className="form-label" htmlFor="accountState">New State:</label>
            <select
              className="form-input"
              id="accountState"
              name="accountState"
              value={accountState}
              onChange={(e) => setAccountState(e.target.value)}
            >
              <option value="">Select state</option>
              <option value="activated">ACTIVATED</option>
              <option value="desactivated">DESACTIVATED</option>
            </select>

            <button className="btn btn-secondary btn-large" type="submit">Change State</button>
          </form>
        </header>
      </div>
    </>
  );
}

export function ChangeRole() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [role, setRole] = useState('');
  const [changeUser, setChangeUser] = useState('')

  useEffect(() => {
    if (!token) {
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
  }, [token, navigate]);

  if (!token) {
    return <p>Error: No authentication token found. Redirecting to log in.</p>;
  }

  const username = JSON.parse(token).username; // Parse token as JSON

  const handleRoleChange = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess(false);

    try {
      const response = await fetch('/rest/utils/changerole', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ token, username, role })
      });
      CheckRequests(response, token, navigate);
      if (response.ok) {
        setSuccess(true);
        console.log("Role changed successfully");
        navigate('/settings');
      } else {
        console.error("Failed to change role:", response.statusText);
        setError("Failed to change role. Please try again later.");
      }
    }
    catch (error) {
      console.error("Error changing role:", error);
      setError("An error occurred while changing the role.");
    }
  };

  // Implement role change logic here
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
                <option value="">Select a role</option>
                <option value="admin">Admin</option>
                <option value="sbo">System Back Office</option>
                <option value="enduser">End User</option>
              </select>
              {success && <p className="success">Role changed successfully!</p>}
              <button className="btn btn-info btn-large" type="submit">Change Role</button>
            </form>
          </div>
        </header>
      </div>
    </>
  );
}