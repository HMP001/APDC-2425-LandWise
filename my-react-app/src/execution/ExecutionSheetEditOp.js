import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { editOperationRequest } from './api';
import { topBar } from '../TopBar';
import './ExecutionSheet.css';

export default function ExecutionSheetEditOp() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(true);
  const [operationCode, setOperationCode] = useState('');
  const [operation, setOperation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [editFields, setEditFields] = useState({ observations: '', expected_start: '', expected_end: '' });
  const [originalFields, setOriginalFields] = useState(null);

  // Fetch operation from backend
  const fetchOperation = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/rest/execution/getOperation/${id}/${code}`);
      if (!res.ok) throw new Error('Failed to fetch operation.');
      const op = await res.json();
      setOperation(op);
      setEditFields({
        observations: op.observations || '',
        expected_start: op.expected_start || '',
        expected_end: op.expected_end || '',
      });
      setOriginalFields({
        observations: op.observations || '',
        expected_start: op.expected_start || '',
        expected_end: op.expected_end || '',
      });
      setShowModal(false);
    } catch (e) {
      setError('Failed to fetch operation.');
    } finally {
      setLoading(false);
    }
  };

    if (loading) {
    return (
      <div className="execution-sheet-container">
        <div className="loading-spinner">Loading operation...</div>
      </div>
    );
  }

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setEditFields(fields => ({ ...fields, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Call backend to save changes
      await editOperationRequest(id, {
        operation_code: operation.operation_code,
        observations: editFields.observations,
        expected_start: editFields.expected_start,
        expected_end: editFields.expected_end,
      });
      setSuccess(true);
      setOriginalFields({ ...editFields });
    } catch (e) {
      setError('Failed to save changes.');
      setEditFields({ ...originalFields });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    {topBar(navigate)}
    <div className="execution-sheet-action-container execution-sheet-edit-center">
      <h2 className="execution-sheet-edit-title">Edit Operation for Execution Sheet #{id}</h2>
      {showModal && (
        <div className="modal execution-sheet-modal execution-sheet-edit-modal">
          <h3 className="execution-sheet-edit-modal-title">Enter Operation Code</h3>
          <input
            type="text"
            value={operationCode}
            onChange={e => setOperationCode(e.target.value)}
            placeholder="Operation Code"
            className="form-control execution-sheet-edit-input"
            disabled={loading}
          />
          <button className="btn btn-primary execution-sheet-edit-btn" onClick={() => fetchOperation(operationCode)} disabled={loading || !operationCode}>
            {loading ? 'Loading...' : 'Fetch Operation'}
          </button>
          {error && <div className="error-message execution-sheet-edit-error">{error}</div>}
        </div>
      )}
      {!showModal && operation && (
        <div className="edit-operation-form execution-sheet-form execution-sheet-edit-form">
          <div className="form-group execution-sheet-edit-group">
            <label className="execution-sheet-edit-label"><strong>Operation Code:</strong></label>
            <div className="execution-sheet-edit-value">{operation.operation_code}</div>
          </div>
          <div className="form-group execution-sheet-edit-group">
            <label className="execution-sheet-edit-label">Observations:</label>
            <textarea
              name="observations"
              value={editFields.observations}
              onChange={handleFieldChange}
              className="form-control execution-sheet-edit-textarea"
              rows={3}
              disabled={loading}
            />
          </div>
          <div className="form-group execution-sheet-edit-group">
            <label className="execution-sheet-edit-label">Expected Start:</label>
            <input
              type="date"
              name="expected_start"
              value={editFields.expected_start}
              onChange={handleFieldChange}
              className="form-control execution-sheet-edit-input"
              disabled={loading}
            />
          </div>
          <div className="form-group execution-sheet-edit-group">
            <label className="execution-sheet-edit-label">Expected End:</label>
            <input
              type="date"
              name="expected_end"
              value={editFields.expected_end}
              onChange={handleFieldChange}
              className="form-control execution-sheet-edit-input"
              disabled={loading}
            />
          </div>
          <div className="form-actions execution-sheet-edit-actions">
            <button className="btn btn-success execution-sheet-edit-btn" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button className="btn btn-secondary execution-sheet-edit-btn" onClick={() => navigate(-1)} disabled={loading}>Back</button>
          </div>
          {success && <div className="success-message execution-sheet-edit-success">Changes saved successfully!</div>}
          {error && <div className="error-message execution-sheet-edit-error">{error}</div>}
        </div>
      )}
    </div>
    </>
  );
}
