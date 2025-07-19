import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startActivityRequest, stopActivityRequest } from './api';
import { topBar } from '../TopBar';
import CheckRequests from '../CheckRequests';
import './ExecutionSheet.css';

export default function ExecutionSheetAssignedList() {
  // Get execution ID from URL pathname
  const { id } = useParams();
  const navigate = useNavigate();
  const [operatorUsername, setOperatorUsername] = useState('');
  const [assignedData, setAssignedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  const fetchAssignedActivities = useCallback(async (opname) => {
    if (!opname || !id) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/rest/execution/getAssignedActivities/${id}/${opname}`);
      if (!response.ok) {
        throw new Error('Failed to fetch assigned activities');
      }
      CheckRequests(response, navigate);
      const data = await response.json();
      console.log('Fetched assigned activities:', data);
      setAssignedData(data);
      setSuccess('Successfully loaded assigned activities');
    } catch (err) {
      setError(err.message);
      setAssignedData(null);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  // Get user info from session storage
  useEffect(() => {
    const storedUserInfo = sessionStorage.getItem('userInfo');
    if (storedUserInfo) {
      const parsedUserInfo = JSON.parse(storedUserInfo);
      setUserInfo(parsedUserInfo);

      // Auto-fill operator username if user is 'PO' (operator)
      if (parsedUserInfo.role === 'PO' && parsedUserInfo.username) {
        setOperatorUsername(parsedUserInfo.username);
        fetchAssignedActivities(parsedUserInfo.username);
      }
    }
  }, [fetchAssignedActivities]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!operatorUsername.trim()) {
      setError('Please enter an operator username');
      return;
    }
    fetchAssignedActivities(operatorUsername.trim());
  };

  const handleStartActivity = async (polygonId, operationCode) => {
    try {
      setLoading(true);
      setError('');

      const payload = {
        execution_id: id,
        polygon_id: polygonId,
        operation_code: operationCode
      };

      await startActivityRequest(payload);
      setSuccess(`Activity started successfully for ${operationCode}`);

      // Refresh the data
      fetchAssignedActivities(operatorUsername);
    } catch (err) {
      setError(`Failed to start activity: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopActivity = async (activityId, polygonId, operationCode) => {
    try {
      setLoading(true);
      setError('');

      const payload = {
        execution_id: id,
        polygon_id: polygonId,
        operation_code: operationCode,
        activity_id: activityId
      };

      await stopActivityRequest(payload);
      setSuccess(`Activity ${activityId} stopped successfully`);

      // Refresh the data
      fetchAssignedActivities(operatorUsername);
    } catch (err) {
      setError(`Failed to stop activity: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'executado':
      case 'completed':
        return 'status-completed';
      case 'em_execucao':
      case 'ongoing':
        return 'status-ongoing';
      case 'assigned':
      case 'atribuido':
        return 'status-assigned';
      case 'nao_iniciado':
      case 'unassigned':
      default:
        return 'status-unassigned';
    }
  };

  const getStatusDisplayText = (status) => {
    switch (status?.toLowerCase()) {
      case 'em_execucao':
        return 'Em execução';
      case 'atribuido':
        return 'Atribuído';
      case 'executado':
        return 'Executado';
      case 'nao_iniciado':
        return 'Não iniciado';
      default:
        return status || 'N/A';
    }
  };

  return (
    <>
      {topBar(navigate)}
      <div className="execution-sheet-edit-center">
        <div className="execution-sheet-edit-form">
          <h2 className="execution-sheet-edit-title">Assigned Activities</h2>

          {/* Show execution info */}
          {id && (
            <div className="execution-sheet-edit-group">
              <div className="execution-sheet-edit-value">
                <strong>Execution ID:</strong> {id}
              </div>
            </div>
          )}

          {/* Check if user is logged in */}
          {!userInfo && (
            <div className="execution-sheet-edit-error">
              Please log in to view assigned activities.
            </div>
          )}

          {/* Operator Username Input */}
          {userInfo && userInfo.role !== 'PO' && (
            <form onSubmit={handleSubmit}>
              <div className="execution-sheet-edit-group">
                <label className="execution-sheet-edit-label">Operator Username:</label>
                <input
                  type="text"
                  className="execution-sheet-edit-input"
                  value={operatorUsername}
                  onChange={(e) => setOperatorUsername(e.target.value)}
                  placeholder="Enter operator username"
                  required
                />
              </div>
              <div className="execution-sheet-edit-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Loading...' : 'Load Activities'}
                </button>
              </div>
            </form>
          )}

          {/* Show current user info for operators */}
          {userInfo && userInfo.role === 'PO' && (
            <div className="execution-sheet-edit-group">
              <div className="execution-sheet-edit-value">
                <strong>Operator:</strong> {userInfo.username}
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && <div className="execution-sheet-edit-error">{error}</div>}
          {success && <div className="execution-sheet-edit-success">{success}</div>}

          {/* Loading Spinner */}
          {loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading assigned activities...</p>
            </div>
          )}

          {/* Assigned Activities Display */}
          {assignedData && !loading && userInfo && (
            <div className="assigned-activities-container" style={{ width: '100%', maxWidth: '1200px' }}>
              <h3>Activities for {operatorUsername}</h3>

              {/* Operations Grid */}
              <div className="polygons-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
                {assignedData && assignedData.map((operation) => (
                  <div key={`${operation.polygon_id}-${operation.operation_code}`} className="polygon-card" style={{ minHeight: 'auto', cursor: 'default' }}>
                    <div className="polygon-header">
                      <h4>Polygon {operation.polygon_id}</h4>
                      <span className="completion-badge">
                        {operation.operation_code}
                      </span>
                    </div>

                    <div className="polygon-operations">
                      <div className="operation-item">
                        <div className="operation-info">
                          <span className="operation-id">{operation.operation_code}</span>
                          <span className={`status-badge ${getStatusBadgeClass(operation.status)}`}>
                            {getStatusDisplayText(operation.status)}
                          </span>
                        </div>

                        <div className="operation-dates" style={{ marginBottom: '15px' }}>
                          <small>
                            <strong>Start:</strong> {operation.starting_date ? new Date(operation.starting_date).toLocaleString() : 'Not set'}<br />
                            <strong>End:</strong> {operation.finishing_date ? new Date(operation.finishing_date).toLocaleDateString() : 'Not set'}<br />
                            <strong>Last Activity:</strong> {operation.last_activity_date ? new Date(operation.last_activity_date).toLocaleDateString() : 'Not set'}
                          </small>
                        </div>

                        {/* Start Activity Button for Operation (if not completed) */}
                        {operation.status !== 'executado' && (
                          <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                            <button
                              className="btn btn-success"
                              onClick={() => handleStartActivity(operation.polygon_id, operation.operation_code)}
                              disabled={loading}
                              style={{ width: '100%' }}
                            >
                              Start Activity
                            </button>
                          </div>
                        )}

                        {operation.activities && operation.activities.length > 0 && (
                          <div className="activities-list">
                            <strong style={{ display: 'block', marginBottom: '10px' }}>Activities:</strong>
                            {operation.activities.map((activity, activityIndex) => (
                              <div
                                key={activity.activity_id || activityIndex}
                                className="activity-item"
                                style={{
                                  margin: '8px 0',
                                  padding: '12px',
                                  background: '#fff',
                                  borderRadius: '6px',
                                  border: '1px solid #e9ecef',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                  cursor: 'default'
                                }}
                              >
                                <div className="activity-header">
                                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                    <span className="activity-id-badge" style={{ marginRight: '8px' }}>
                                      #{activity.activity_id || `temp-${activityIndex}`}
                                    </span>
                                    <span className={`activity-status status-badge ${getStatusBadgeClass(activity.status)}`}>
                                      {getStatusDisplayText(activity.status)}
                                    </span>
                                  </div>
                                </div>

                                <div className="activity-info" style={{ marginBottom: '10px' }}>
                                  <small style={{ display: 'block', lineHeight: '1.4', color: '#6c757d' }}>
                                    <strong>Start:</strong> {activity.start_time ? new Date(activity.start_time).toLocaleString() : 'Not set'}<br />
                                    <strong>End:</strong> {activity.end_time ? new Date(activity.end_time).toLocaleString() : 'Not set'}
                                  </small>
                                </div>

                                {/* Individual Stop Button per Activity (only if running) */}
                                {activity.activity_id && activity.status === 'em_execucao' && (
                                  <div className="activity-actions" style={{ textAlign: 'center' }}>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleStopActivity(activity.activity_id, operation.polygon_id, operation.operation_code)}
                                      disabled={loading}
                                      style={{ width: '100%' }}
                                    >
                                      Stop Activity
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* No activities message */}
              {(!assignedData || assignedData.length === 0) && (
                <div className="activities-placeholder">
                  <p>No assigned activities found for this operator.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
