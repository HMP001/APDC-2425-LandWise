import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startActivityRequest } from './api';
import { topBar } from '../TopBar';
import './ExecutionSheet.css';

export default function ExecutionSheetStart() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [polygonId, setPolygonId] = useState('');
  const [operationCode, setOperationCode] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [optionalFields, setOptionalFields] = useState({ observations: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setOptionalFields(fields => ({ ...fields, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await startActivityRequest({
        execution_id: id,
        polygon_id: polygonId,
        operation_code: operationCode,
        ...optionalFields.observations ? { observations: optionalFields.observations } : {}
      });
      setSuccess(true);
    } catch (e) {
      setError('Failed to start activity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    {topBar(navigate)}
    <div className="execution-sheet-action-container execution-sheet-edit-center">
      <h2 className="execution-sheet-edit-title">Start Activity for Execution Sheet #{id}</h2>
      <div className="execution-sheet-edit-form">
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
        {!showOptional && (
          <button className="btn btn-secondary execution-sheet-edit-btn" type="button" onClick={() => setShowOptional(true)} disabled={loading}>
            Fill Optional Info
          </button>
        )}
        {showOptional && (
          <div className="form-group execution-sheet-edit-group">
            <label className="execution-sheet-edit-label">Observations (optional):</label>
            <textarea
              name="observations"
              value={optionalFields.observations}
              onChange={handleFieldChange}
              className="form-control execution-sheet-edit-textarea"
              rows={3}
              disabled={loading}
            />
          </div>
        )}
        <div className="form-actions execution-sheet-edit-actions">
          <button className="btn btn-success execution-sheet-edit-btn" onClick={handleSubmit} disabled={loading || !polygonId || !operationCode}>
            {loading ? 'Starting...' : 'Start Activity'}
          </button>
          <button className="btn btn-secondary execution-sheet-edit-btn" onClick={() => navigate(-1)} disabled={loading}>Back</button>
        </div>
        {success && <div className="success-message execution-sheet-edit-success">Activity started successfully!</div>}
        {error && <div className="error-message execution-sheet-edit-error">{error}</div>}
      </div>
    </div>
    </>
  );
}
