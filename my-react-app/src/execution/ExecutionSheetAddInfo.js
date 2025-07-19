import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topBar } from '../TopBar';
import { addInfoRequest } from './api';
import CheckRequests from '../CheckRequests';
import './ExecutionSheet.css';

export default function ExecutionSheetAddInfo() {
  // Get user info from sessionStorage
  let userInfo = null;
  try {
    userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
  } catch (e) {
    userInfo = null;
  }
  const { id } = useParams();
  const navigate = useNavigate();
  const [operatorName, setOperatorName] = useState(userInfo && userInfo.role === 'PO' ? userInfo.username : '');
  // Auto-fetch activities if role is PO
  useEffect(() => {
    if (userInfo && userInfo.role === 'PO' && operatorName) {
      fetchActivities();
    }
    // eslint-disable-next-line
  }, [operatorName]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [mediaFields, setMediaFields] = useState({ photos: [], gps: '', observations: '' });
  const [success, setSuccess] = useState(false);

  // Helper functions for photo management
  const handlePhotoAdd = (e) => {
    const files = Array.from(e.target.files || []);
    setMediaFields(fields => ({
      ...fields,
      photos: [...fields.photos, ...files]
    }));
    // Clear the input so the same file can be added again if needed
    e.target.value = '';
  };

  const handlePhotoRemove = (index) => {
    setMediaFields(fields => ({
      ...fields,
      photos: fields.photos.filter((_, i) => i !== index)
    }));
  };

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/rest/execution/getConcludedActivities/${id}/${operatorName}`);
      CheckRequests(res, navigate);
      if (!res.ok) throw new Error('Failed to fetch activities.');
      const acts = await res.json();
      console.log('Fetched activities:', acts);
      setActivities(acts);
    } catch (e) {
      setError('Failed to fetch activities.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        {topBar(navigate)}
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading activities...</p>
        </div>
      </>
    );
  }

  const handleMediaChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'photos') {
      setMediaFields(fields => ({ ...fields, photos: files ? Array.from(files) : [] }));
    } else {
      setMediaFields(fields => ({ ...fields, [name]: value }));
    }
  };

  const handleAddMedia = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Backend expects 'data' as JSON string and 'photos' as file(s)
      const formData = new FormData();
      const dataObj = {
        execution_id: id,
        activity_id: selectedActivity.activity_id,
        observations: mediaFields.observations,
        tracks: mediaFields.gps ? [mediaFields.gps] : []
      };
      formData.append('data', JSON.stringify(dataObj));
      if (mediaFields.photos && mediaFields.photos.length > 0) {
        mediaFields.photos.forEach((file, idx) => {
          console.log('Uploading photo:', {
            name: file.name,
            type: file.type,
            size: file.size
          });
          formData.append('photos', file);
        });
      }
      await addInfoRequest(formData);
      setSuccess(true);
      setMediaFields({ photos: [], gps: '', observations: '' });
      setSelectedActivity(null);
    } catch (e) {
      setError('Failed to add media/info.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {topBar(navigate)}
      <div className="execution-sheet-action-container execution-sheet-edit-center">
        <h2 className="execution-sheet-edit-title">Add Info to Activity for Execution Sheet #{id}</h2>
        <div className="execution-sheet-edit-modal execution-sheet-addinfo-modal">
          <label className="execution-sheet-edit-label">Operator Name:</label>
          <input
            type="text"
            value={operatorName}
            onChange={e => setOperatorName(e.target.value)}
            className="form-control execution-sheet-edit-input"
            placeholder="Enter operator name"
            disabled={loading || (userInfo && userInfo.role === 'PO')}
          />
          {!(userInfo && userInfo.role === 'PO') && (
            <button className="btn btn-primary execution-sheet-edit-btn" onClick={fetchActivities} disabled={loading || !operatorName}>
              {loading ? 'Loading...' : 'Fetch Activities'}
            </button>
          )}
          {error && <div className="error-message execution-sheet-edit-error">{error}</div>}
        </div>
        {activities.length > 0 && !selectedActivity && (
          <div className="execution-sheet-edit-form execution-sheet-addinfo-list">
            <h3 className="execution-sheet-edit-modal-title">Concluded Activities</h3>
            <ul style={{ width: '100%', padding: 0 }}>
              {activities.map((act, idx) => (
                <li key={act.activity_id || idx} style={{ listStyle: 'none', marginBottom: 18, background: '#f8f9fa', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div><strong>Activity:</strong> {act.activity_id}</div>
                  <div><strong>Status:</strong> {act.status}</div>
                  <div><strong>Started By:</strong> {act.operator_username}</div>
                  <div><strong>Started At:</strong> {act.start_time ? new Date(act.start_time).toLocaleString() : act.started_at ? new Date(act.started_at).toLocaleString() : ''}</div>
                  <div><strong>Finished At:</strong> {act.end_time ? new Date(act.end_time).toLocaleString() : act.finished_at ? new Date(act.finished_at).toLocaleString() : ''}</div>
                  <div><strong>Observations:</strong> {act.observations}</div>
                  <button className="btn btn-success execution-sheet-edit-btn" style={{ marginTop: 10 }} onClick={() => setSelectedActivity(act)}>
                    Add Media/Info
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {selectedActivity && (
          <div className="execution-sheet-edit-form execution-sheet-addinfo-form">
            <h3 className="execution-sheet-edit-modal-title">Add Media/Info to Activity</h3>
            <div className="form-group execution-sheet-edit-group">
              <label className="execution-sheet-edit-label">Photos:</label>
              <input
                type="file"
                name="photos"
                accept="image/*"
                multiple
                className="form-control execution-sheet-edit-input"
                onChange={handlePhotoAdd}
                disabled={loading}
              />
              {/* Photo previews */}
              {mediaFields.photos.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {mediaFields.photos.map((file, index) => (
                    <div key={index} style={{ position: 'relative', border: '1px solid #ddd', borderRadius: 4, padding: 4 }}>
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }}
                      />
                      <button
                        type="button"
                        onClick={() => handlePhotoRemove(index)}
                        style={{
                          position: 'absolute',
                          top: -5,
                          right: -5,
                          background: 'red',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group execution-sheet-edit-group">
              <label className="execution-sheet-edit-label">GPS Tracks:</label>
              <input
                type="text"
                name="gps"
                value={mediaFields.gps}
                placeholder="Enter GPS track data"
                className="form-control execution-sheet-edit-input"
                onChange={handleMediaChange}
                disabled={loading}
              />
            </div>
            <div className="form-group execution-sheet-edit-group">
              <label className="execution-sheet-edit-label">Observations:</label>
              <textarea
                name="observations"
                value={mediaFields.observations}
                placeholder="Enter observations"
                className="form-control execution-sheet-edit-input"
                onChange={handleMediaChange}
                disabled={loading}
                rows="3"
              />
            </div>
            <div className="form-actions execution-sheet-edit-actions">
              <button className="btn btn-success execution-sheet-edit-btn" onClick={handleAddMedia} disabled={loading}>
                {loading ? 'Saving...' : 'Add Info'}
              </button>
              <button className="btn btn-secondary execution-sheet-edit-btn" onClick={() => setSelectedActivity(null)} disabled={loading}>Back</button>
            </div>
            {success && <div className="success-message execution-sheet-edit-success">Info added successfully!</div>}
            {error && <div className="error-message execution-sheet-edit-error">{error}</div>}
          </div>
        )}
        <button className="btn btn-secondary execution-sheet-edit-btn" style={{ marginTop: 32 }} onClick={() => navigate(-1)} disabled={loading}>Back</button>
      </div>
    </>
  );
}
