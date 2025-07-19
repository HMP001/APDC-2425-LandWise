import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { stopActivityRequest } from './api';
import { topBar } from '../TopBar';
import './ExecutionSheet.css';

export default function ExecutionSheetStop() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activityId, setActivityId] = useState('');
  const [polygonId, setPolygonId] = useState('');
  const [operationCode, setOperationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await stopActivityRequest({
        execution_id: id,
        activity_id: activityId,
        polygon_id: polygonId,
        operation_code: operationCode
      });
      setSuccess(true);
    } catch (e) {
      setError('Failed to stop activity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    {topBar(navigate)}
    <div className="execution-sheet-action-container execution-sheet-edit-center">
      <h2 className="execution-sheet-edit-title">Stop Activity for Execution Sheet #{id}</h2>
      <div className="execution-sheet-edit-form">
        <div className="form-group execution-sheet-edit-group">
          <label className="execution-sheet-edit-label">Activity ID:</label>
          <input
            type="text"
            value={activityId}
            onChange={e => setActivityId(e.target.value)}
            className="form-control execution-sheet-edit-input"
            placeholder="Enter activity ID"
            disabled={loading}
          />
        </div>
        <div className="form-group execution-sheet-edit-group">
          <label className="execution-sheet-edit-label">Polygon ID:</label>
          <input
            type="text"
            value={polygonId}
            onChange={e => setPolygonId(e.target.value)}
            className="form-control execution-sheet-edit-input"
            placeholder="Enter polygon ID"
            disabled={loading}
          />
        </div>
        <div className="form-group execution-sheet-edit-group">
          <label className="execution-sheet-edit-label">Operation Code:</label>
          <input
            type="text"
            value={operationCode}
            onChange={e => setOperationCode(e.target.value)}
            className="form-control execution-sheet-edit-input"
            placeholder="Enter operation code"
            disabled={loading}
          />
        </div>
        <div className="form-actions execution-sheet-edit-actions">
          <button className="btn btn-danger execution-sheet-edit-btn" onClick={handleSubmit} disabled={loading || !activityId || !polygonId || !operationCode}>
            {loading ? 'Stopping...' : 'Stop Activity'}
          </button>
          <button className="btn btn-secondary execution-sheet-edit-btn" onClick={() => navigate(-1)} disabled={loading}>Back</button>
        </div>
        {success && <div className="success-message execution-sheet-edit-success">Activity stopped successfully!</div>}
        {error && <div className="error-message execution-sheet-edit-error">{error}</div>}
      </div>
    </div>
    </>
  );
}
