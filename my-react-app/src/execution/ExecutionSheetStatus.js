import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topBar } from '../TopBar';
import './ExecutionSheet.css';

export default function ExecutionSheetStatus() {
  const { id: executionId } = useParams();
  const navigate = useNavigate();
  const [operationCode, setOperationCode] = useState('');
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFetchStatus = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatusData(null);
    try {
      const res = await fetch(`/rest/execution/status/global/${executionId}/${operationCode}`);
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      console.log('Status Data:', data);
      setStatusData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {topBar(navigate)}
      <div className="execution-sheet-edit-center">
        <h2 className="execution-sheet-edit-title">Operation Status for Execution Sheet #{executionId}</h2>
        <form onSubmit={handleFetchStatus} className="execution-sheet-edit-form">
          <div className="execution-sheet-edit-group">
            <label className="execution-sheet-edit-label" htmlFor="operationCode">Operation Code:</label>
            <input
              id="operationCode"
              type="text"
              value={operationCode}
              onChange={e => setOperationCode(e.target.value)}
              required
              className="form-control execution-sheet-edit-input"
              placeholder="Enter operation code"
            />
          </div>
          <div className="execution-sheet-edit-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'View Status'}
            </button>
          </div>
        </form>
        {error && <div className="error-message execution-sheet-edit-error">{error}</div>}

        {statusData && (
          <div className="status-details">
            <div className="execution-sheet-edit-form" style={{ marginTop: '24px' }}>
              <h3 className="execution-sheet-edit-modal-title">
                Operation: {operationCode}
              </h3>
              <div className="execution-sheet-edit-group">
                <strong>Status:</strong> <span>{statusData.status || 'N/A'}</span>
              </div>
              <div className="execution-sheet-edit-group">
                <strong>Operator:</strong> <span>{statusData.operator_username || 'N/A'}</span>
              </div>
              <div className="execution-sheet-edit-group">
                <strong>Start Date:</strong> <span>{statusData.starting_date || 'N/A'}</span>
              </div>
              <div className="execution-sheet-edit-group">
                <strong>Finish Date:</strong> <span>{statusData.finishing_date || 'N/A'}</span>
              </div>
              <div className="execution-sheet-edit-group">
                <strong>Last Activity Date:</strong> <span>{statusData.last_activity_date || 'N/A'}</span>
              </div>
            </div>

            {statusData.activities && statusData.activities.length > 0 && (
              <div className="activities-section" style={{ marginTop: '24px', width: '100%', maxWidth: '800px' }}>
                <h4 className="execution-sheet-edit-modal-title" style={{ textAlign: 'center', marginBottom: '16px' }}>
                  Activities
                </h4>
                <div className="activities-grid">
                  {statusData.activities.map((act, idx) => (
                    <div key={act.activity_id || idx} className="activity-card">
                      <div><strong>ID:</strong> {act.activity_id}</div>
                      <div><strong>Type:</strong> {act.type}</div>
                      <div><strong>Status:</strong> {act.status}</div>
                      <div><strong>Started By:</strong> {act.started_by}</div>
                      <div><strong>Started At:</strong> {act.started_at}</div>
                      <div><strong>Finished At:</strong> {act.finished_at || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="execution-sheet-edit-actions" style={{ marginTop: '32px' }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>
    </>
  );
}
