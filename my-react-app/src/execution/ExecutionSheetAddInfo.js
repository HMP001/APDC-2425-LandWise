import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topBar } from '../TopBar';
import { addInfoRequest } from './api';
import './ExecutionSheet.css';

export default function ExecutionSheetAddInfo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [operatorName, setOperatorName] = useState('');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [mediaFields, setMediaFields] = useState({ photo: null, gps: '', observations: '' });
  const [success, setSuccess] = useState(false);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/rest/execution/getConcludedActivities/${id}/${operatorName}`);
      if (!res.ok) throw new Error('Failed to fetch activities.');
      const acts = await res.json();
      setActivities(acts);
    } catch (e) {
      setError('Failed to fetch activities.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="execution-sheet-container">
        <div className="loading-spinner">Loading activities...</div>
      </div>
    );
  }

  const handleMediaChange = (e) => {
    const { name, value, files } = e.target;
    setMediaFields(fields => ({ ...fields, [name]: files ? files[0] : value }));
  };

  const handleAddMedia = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Send all info as multipart to addInfo endpoint
      const formData = new FormData();
      formData.append('execution_id', id);
      formData.append('activity_id', selectedActivity.activity_id);
      formData.append('observations', mediaFields.observations);
      if (mediaFields.photo) {
        formData.append('photo', mediaFields.photo);
      }
      if (mediaFields.gps) {
        formData.append('tracks', mediaFields.gps);
      }
      await addInfoRequest(formData);
      setSuccess(true);
      setMediaFields({ photo: null, gps: '', observations: '' });
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
          disabled={loading}
        />
        <button className="btn btn-primary execution-sheet-edit-btn" onClick={fetchActivities} disabled={loading || !operatorName}>
          {loading ? 'Loading...' : 'Fetch Activities'}
        </button>
        {error && <div className="error-message execution-sheet-edit-error">{error}</div>}
      </div>
      {activities.length > 0 && !selectedActivity && (
        <div className="execution-sheet-edit-form execution-sheet-addinfo-list">
          <h3 className="execution-sheet-edit-modal-title">Concluded Activities</h3>
          <ul style={{ width: '100%', padding: 0 }}>
            {activities.map(act => (
              <li key={act.activity_id} style={{ listStyle: 'none', marginBottom: 18, background: '#f8f9fa', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div><strong>Activity:</strong> {act.type}</div>
                <div><strong>Status:</strong> {act.status}</div>
                <div><strong>Started By:</strong> {act.started_by}</div>
                <div><strong>Started At:</strong> {act.started_at}</div>
                <div><strong>Finished At:</strong> {act.finished_at}</div>
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
            <label className="execution-sheet-edit-label">Photo:</label>
            <input
              type="file"
              name="photo"
              accept="image/*"
              className="form-control execution-sheet-edit-input"
              onChange={handleMediaChange}
              disabled={loading}
            />
          </div>
          <div className="form-group execution-sheet-edit-group">
            <label className="execution-sheet-edit-label">GPS Track:</label>
            <input
              type="text"
              name="gps"
              value={mediaFields.gps}
              onChange={handleMediaChange}
              className="form-control execution-sheet-edit-input"
              placeholder="Paste GPS track data or file URL"
              disabled={loading}
            />
          </div>
          <div className="form-group execution-sheet-edit-group">
            <label className="execution-sheet-edit-label">Observations:</label>
            <textarea
              name="observations"
              value={mediaFields.observations}
              onChange={handleMediaChange}
              className="form-control execution-sheet-edit-textarea"
              rows={3}
              disabled={loading}
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
