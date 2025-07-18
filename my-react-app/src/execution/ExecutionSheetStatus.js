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
      <div className="execution-sheet-container" style={{ maxWidth: 600, margin: '40px auto' }}>
        <h2 style={{ marginBottom: 24, color: '#2c3e50', fontWeight: 600 }}>Operation Status for Execution Sheet #{executionId}</h2>
        <form onSubmit={handleFetchStatus} style={{ marginBottom: 24, background: '#f8f9fa', padding: 20, borderRadius: 8 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontWeight: 500, color: '#2c3e50' }}>
              Operation Code:
              <input
                type="text"
                value={operationCode}
                onChange={e => setOperationCode(e.target.value)}
                required
                className="form-control"
                style={{ marginLeft: 8, maxWidth: 120, display: 'inline-block' }}
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ minWidth: 120 }}>
              {loading ? 'Loading...' : 'View Status'}
            </button>
          </div>
        </form>
        {error && <div className="error-message">{error}</div>}
        {statusData && (
          <div className="status-details" style={{ marginTop: 24, background: '#f8f9fa', padding: 20, borderRadius: 8 }}>
            <h3 style={{ color: '#007bff', marginBottom: 12 }}>
              Operation: {operationCode}
            </h3>
            <div style={{ marginBottom: 8 }}><strong>Entity ID:</strong> {statusData.operation_id || statusData.id || 'N/A'}</div>
            <div style={{ marginBottom: 8 }}><strong>Status:</strong> {statusData.status || 'N/A'}</div>
            <div style={{ marginBottom: 8 }}><strong>Operator:</strong> {statusData.operator_username || 'N/A'}</div>
            <div style={{ marginBottom: 8 }}><strong>Start Date:</strong> {statusData.starting_date || 'N/A'}</div>
            <div style={{ marginBottom: 8 }}><strong>Finish Date:</strong> {statusData.finishing_date || 'N/A'}</div>
            <div style={{ marginBottom: 8 }}><strong>Last Activity Date:</strong> {statusData.last_activity_date || 'N/A'}</div>
            {statusData.activities && statusData.activities.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ color: '#2c3e50', marginBottom: 8 }}>Activities</h4>
                <ul style={{ paddingLeft: 0 }}>
                  {statusData.activities.map((act, idx) => (
                    <li key={act.activity_id || idx} style={{ marginBottom: 16, background: 'white', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 12, listStyle: 'none', borderLeft: '4px solid #007bff' }}>
                      <div><strong>ID:</strong> {act.activity_id}</div>
                      <div><strong>Type:</strong> {act.type}</div>
                      <div><strong>Status:</strong> {act.status}</div>
                      <div><strong>Started By:</strong> {act.started_by}</div>
                      <div><strong>Started At:</strong> {act.started_at}</div>
                      <div><strong>Finished At:</strong> {act.finished_at || 'N/A'}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: 32 }}>Back</button>
      </div>
    </>
  );
}
