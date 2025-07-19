import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assignOperationRequest } from './api';
import { topBar } from '../TopBar';
import './ExecutionSheet.css';

export default function ExecutionAssignOperator() {
  const { id: executionId } = useParams();
  const navigate = useNavigate();
  const [polygonId, setPolygonId] = useState('');
  const [operationCode, setOperationCode] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleAssign = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const payload = {
        execution_id: executionId,
        operator_username: operatorName,
        polygon_operations: [
          {
            polygon_id: polygonId,
            operation_code: operationCode
          }
        ]
      };
      await assignOperationRequest(payload);
      setSuccess(true);
    } catch (err) {
      setError('Failed to assign operator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {topBar(navigate)}
      <div className="execution-sheet-edit-center">
        <h2 className="execution-sheet-edit-title">Assign Operator to Polygon Operation</h2>
        <form onSubmit={handleAssign} className="execution-sheet-edit-form">
          <div className="execution-sheet-edit-group">
            <label className="execution-sheet-edit-label" htmlFor="polygonId">Polygon ID:</label>
            <input
              id="polygonId"
              type="text"
              value={polygonId}
              onChange={e => setPolygonId(e.target.value)}
              className="form-control execution-sheet-edit-input"
              required
              disabled={loading}
              placeholder="Enter polygon ID"
            />
          </div>
          <div className="execution-sheet-edit-group">
            <label className="execution-sheet-edit-label" htmlFor="operationCode">Operation Code:</label>
            <input
              id="operationCode"
              type="text"
              value={operationCode}
              onChange={e => setOperationCode(e.target.value)}
              className="form-control execution-sheet-edit-input"
              required
              disabled={loading}
              placeholder="Enter operation code"
            />
          </div>
          <div className="execution-sheet-edit-group">
            <label className="execution-sheet-edit-label" htmlFor="operatorName">Operator Name:</label>
            <input
              id="operatorName"
              type="text"
              value={operatorName}
              onChange={e => setOperatorName(e.target.value)}
              className="form-control execution-sheet-edit-input"
              required
              disabled={loading}
              placeholder="Enter operator username"
            />
          </div>
          <div className="execution-sheet-edit-actions">
            <button className="btn btn-primary" type="submit" disabled={loading || !polygonId || !operationCode || !operatorName}>
              {loading ? 'Assigning...' : 'Assign Operator'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => navigate(-1)} disabled={loading}>
              Cancel
            </button>
          </div>
          {error && <div className="error-message execution-sheet-edit-error">{error}</div>}
          {success && <div className="success-message execution-sheet-edit-success">Operator assigned successfully!</div>}
        </form>
        {success && (
          <div className="execution-sheet-edit-success" style={{ marginTop: 32 }}>
            <h3>Operator assigned successfully!</h3>
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>Back</button>
          </div>
        )}
      </div>
    </>
  );
}
