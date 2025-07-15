import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './ExecutionSheet.css';
import CheckRequests from './CheckRequests';
import { topBar } from './TopBar';

/**
 * ExecutionSheet Component - UI for viewing and managing execution sheets
 */
const ExecutionSheet = ({ executionSheetData, onSave, onClose, isEditable = false }) => {
  const [executionSheet, setExecutionSheet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchPolygonKey, setSearchPolygonKey] = useState('');
  const [assignmentState, setAssignmentState] = useState({}); // { [polygonId_operationId]: { username, loading, error, assignedTo } }

  // Add state for operation edits and errors in the summary table
  const [operationEdits, setOperationEdits] = useState({});
  const [operationEditErrors, setOperationEditErrors] = useState({});

  // Initialize execution sheet data
  useEffect(() => {
    if (executionSheetData) {
      setExecutionSheet(executionSheetData);
      setIsLoading(false);
    } else {
      // Create a sample execution sheet for demonstration
      const sampleData = createSampleExecutionSheet();
      setExecutionSheet(sampleData);
      setIsLoading(false);
    }
  }, [executionSheetData]);

  // Create sample data for demonstration
  const createSampleExecutionSheet = () => {
    return {
      id: 1,
      starting_date: "2025-07-01",
      finishing_date: "2025-07-15",
      last_activity_date: "2025-07-05",
      observations: "Weather conditions have been favorable for field operations. All equipment is functioning properly.",
      operations: [
        {
          operation_code: "PLOWING",
          area_ha_executed: 25.5,
          area_perc: 85,
          starting_date: "2025-07-01",
          finishing_date: "2025-07-03",
          observations: "Completed plowing with good soil conditions"
        },
        {
          operation_code: "SEEDING",
          area_ha_executed: 18.2,
          area_perc: 60,
          starting_date: "2025-07-04",
          finishing_date: null,
          observations: "Seeding in progress, weather permitting"
        }
      ],
      polygons_operations: [
        {
          polygon_id: 101,
          operations: [
            {
              operation_code: "PLOWING",
              status: "completed",
              starting_date: "2025-07-01",
              finishing_date: "2025-07-02",
              last_activity_date: "2025-07-02",
              observations: "Plowing completed successfully",
              tracks: [
                {
                  type: "LineString",
                  coordinates: [[10.5, 45.2], [10.6, 45.3], [10.7, 45.4]]
                }
              ],
              assigned_to: "alice",
              activities: [
                {
                  activity_id: "act-101-plowing",
                  type: "plowing",
                  status: "completed",
                  started_by: "alice",
                  started_at: "2025-07-01",
                  finished_at: "2025-07-02"
                }
              ]
            },
            {
              operation_code: "SEEDING",
              status: "ongoing",
              starting_date: "2025-07-04",
              finishing_date: null,
              observations: "Seeding 60% complete",
              tracks: [],
              assigned_to: "bob",
              activities: [
                {
                  activity_id: "act-101-seeding",
                  type: "seeding",
                  status: "ongoing",
                  started_by: "bob",
                  started_at: "2025-07-04",
                  finished_at: null
                }
              ]
            }
          ]
        },
        {
          polygon_id: 102,
          operations: [
            {
              operation_code: "PLOWING",
              status: "unassigned",
              starting_date: null,
              finishing_date: null,
              last_activity_date: null,
              observations: "Scheduled for next week",
              tracks: [],
              assigned_to: "",
              activities: []
            },
            {
              operation_code: "SEEDING",
              status: "unassigned",
              starting_date: null,
              finishing_date: null,
              last_activity_date: null,
              observations: "",
              tracks: [],
              assigned_to: "",
              activities: []
            }
          ]
        }
      ]
    };
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'ongoing': return '#ffc107';
      case 'assigned': return '#17a2b8';
      case 'unassigned': return '#6c757d';
      default: return '#6c757d';
    }
  };

  // Calculate completion percentage for polygon operations
  const getPolygonCompletionPercentage = (polygonOps) => {
    if (!polygonOps.operations.length) return 0;
    const completedOps = polygonOps.operations.filter(op => op.status === 'completed').length;
    return Math.round((completedOps / polygonOps.operations.length) * 100);
  };

  // When entering edit mode, snapshot original values for summary table
  useEffect(() => {
    if (editMode && executionSheet) {
      const edits = {};
      executionSheet.operations.forEach((op, idx) => {
        edits[idx] = { ...op };
      });
      setOperationEdits(edits);
      setOperationEditErrors({});
    }
  }, [editMode, executionSheet]);

  // Handle field change in summary table (Operations tab)
  const handleSummaryOperationFieldChange = (idx, field, value) => {
    setOperationEdits(prev => ({
      ...prev,
      [idx]: { ...prev[idx], [field]: value }
    }));
  };

  // Handle save operation
  const handleSave = async () => {
    let hasError = false;
    const errors = {};
    // Only for summary table (executionSheet.operations) - removed area and percentage fields
    for (const idx in operationEdits) {
      const edited = operationEdits[idx];
      const original = executionSheet.operations[idx];
      // Check if any field changed - removed 'area_ha_executed', 'area_perc'
      const fields = ['observations', 'starting_date', 'finishing_date'];
      let changed = false;
      for (const field of fields) {
        if (edited[field] !== original[field]) {
          changed = true;
          break;
        }
      }
      if (changed) {
        try {
          const res = await fetch('/rest/execution/editOperation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              worksheet_id: executionSheet.id,
              operation_code: edited.operation_code,
              observations: edited.observations,
              starting_date: edited.starting_date,
              finishing_date: edited.finishing_date
            })
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            errors[idx] = err.error || 'Failed to edit operation';
            hasError = true;
          } else {
            // Update the main state if successful
            setExecutionSheet(prev => {
              const updated = { ...prev };
              updated.operations[idx] = { ...edited };
              return updated;
            });
          }
        } catch (e) {
          errors[idx] = e.message || 'Failed to edit operation';
          hasError = true;
        }
      }
    }
    setOperationEditErrors(errors);
    if (!hasError && onSave) {
      onSave(executionSheet);
    }
    setEditMode(false);
  };

  // Assignment handler (dummy mode support)
  const handleAssignOperator = async (polygonId, operationCode) => {
    const key = `${polygonId}_${operationCode}`;
    const username = assignmentState[key]?.username?.trim();
    if (!username) return;
    setAssignmentState(prev => ({
      ...prev,
      [key]: { ...prev[key], loading: true, error: null }
    }));

    // If using dummy, just update local state
    if (!executionSheetData) {
      setTimeout(() => {
        setExecutionSheet(prevSheet => {
          const updatedSheet = { ...prevSheet };
          const polygonOps = updatedSheet.polygons_operations.find(po => po.polygon_id === polygonId);
          if (polygonOps) {
            const operation = polygonOps.operations.find(op => op.operation_code === operationCode);
            if (operation) {
              operation.assigned_to = username;
              operation.status = "assigned";
            }
          }
          return updatedSheet;
        });
        setAssignmentState(prev => ({
          ...prev,
          [key]: { ...prev[key], loading: false, error: null, assignedTo: username }
        }));
      }, 500);
      return;
    }

    try {
      const res = await fetch('/rest/execution/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worksheet_id: executionSheet.id,
          polygon_id: polygonId,
          operation_code: operationCode,
          assigned_to: username
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to assign operator');
      }
      setAssignmentState(prev => ({
        ...prev,
        [key]: { ...prev[key], loading: false, error: null, assignedTo: username }
      }));
      // Optionally update executionSheet state to reflect assignment
    } catch (e) {
      setAssignmentState(prev => ({
        ...prev,
        [key]: { ...prev[key], loading: false, error: e.message, assignedTo: undefined }
      }));
    }
  };

  // Start activity handler (dummy mode support)
  const handleStartActivity = (polygonId, operationCode, username) => {
    if (!username) return;
    if (!executionSheetData) {
      setExecutionSheet(prevSheet => {
        const updatedSheet = { ...prevSheet };
        const polygonOps = updatedSheet.polygons_operations.find(po => po.polygon_id === polygonId);
        if (polygonOps) {
          const operation = polygonOps.operations.find(op => op.operation_code === operationCode);
          if (operation) {
            const newActivity = {
              activity_id: `act-${polygonId}-${operationCode}`,
              type: operationCode.toLowerCase(),
              status: "ongoing",
              started_by: username,
              started_at: new Date().toISOString().split('T')[0],
              finished_at: null
            };
            operation.activities = operation.activities || [];
            operation.activities.push(newActivity);
            operation.status = "ongoing";
            operation.starting_date = newActivity.started_at;
            operation.assigned_to = username;
          }
        }
        return updatedSheet;
      });
    }
    // For real backend, you would POST to an endpoint
  };

  // Handle operation status update
  const handleStatusUpdate = (polygonId, operationCode, newStatus) => {
    const updatedSheet = { ...executionSheet };
    const polygonOps = updatedSheet.polygons_operations.find(po => po.polygon_id === polygonId);
    if (polygonOps) {
      const operation = polygonOps.operations.find(op => op.operation_code === operationCode);
      if (operation) {
        operation.status = newStatus;
        operation.last_activity_date = new Date().toISOString().split('T')[0];
        setExecutionSheet(updatedSheet);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="execution-sheet-container">
        <div className="loading-spinner">Loading execution sheet...</div>
      </div>
    );
  }

  if (!executionSheet) {
    return (
      <div className="execution-sheet-container">
        <div className="error-message">No execution sheet data available</div>
      </div>
    );
  }

  return (
    <div className="execution-sheet-container">
      {/* Header */}
      <div className="execution-sheet-header">
        <div className="header-title">
          <h2>Execution Sheet #{executionSheet.id}</h2>
          <div className="header-dates">
            <span>Started: {executionSheet.starting_date}</span>
            {executionSheet.finishing_date && (
              <span>Finished: {executionSheet.finishing_date}</span>
            )}
            <span>Last Activity: {executionSheet.last_activity_date}</span>
          </div>
        </div>
        <div className="header-actions">
          {isEditable && (
            <button
              className={`btn ${editMode ? 'btn-success' : 'btn-primary'}`}
              onClick={editMode ? handleSave : () => setEditMode(true)}
            >
              {editMode ? 'Save Changes' : 'Edit'}
            </button>
          )}
          {onClose && (
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="execution-sheet-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'operations' ? 'active' : ''}`}
          onClick={() => setActiveTab('operations')}
        >
          Operations
        </button>
        <button
          className={`tab ${activeTab === 'polygons' ? 'active' : ''}`}
          onClick={() => setActiveTab('polygons')}
        >
          Polygon Operations
        </button>
        <button
          className={`tab ${activeTab === 'tracking' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracking')}
        >
          GPS Tracking
        </button>
      </div>

      {/* Content Area */}
      <div className="execution-sheet-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="summary-cards">
              <div className="summary-card">
                <h3>Total Operations</h3>
                <div className="summary-value">{executionSheet.operations.length}</div>
              </div>
              <div className="summary-card">
                <h3>Total Area Executed</h3>
                <div className="summary-value">
                  {executionSheet.operations.reduce((sum, op) => sum + op.area_ha_executed, 0).toFixed(1)} ha
                </div>
              </div>
              <div className="summary-card">
                <h3>Average Completion</h3>
                <div className="summary-value">
                  {Math.round(executionSheet.operations.reduce((sum, op) => sum + op.area_perc, 0) / executionSheet.operations.length)}%
                </div>
              </div>
              <div className="summary-card">
                <h3>Active Polygons</h3>
                <div className="summary-value">{executionSheet.polygons_operations.length}</div>
              </div>
            </div>

            <div className="observations-section">
              <h3>General Observations</h3>
              <div className="observations-content">
                {editMode ? (
                  <textarea
                    value={executionSheet.observations}
                    onChange={(e) => setExecutionSheet({ ...executionSheet, observations: e.target.value })}
                    rows="4"
                    className="form-control"
                  />
                ) : (
                  <p>{executionSheet.observations || 'No observations recorded.'}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="operations-section">
            <h3>Operations Summary</h3>
            <div className="operations-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>Operation Code</th>
                    <th>Area Executed (ha)</th>
                    <th>Completion %</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {executionSheet.operations.map((operation, index) => (
                    <tr key={index}>
                      <td>
                        <span className="operation-code">{operation.operation_code}</span>
                      </td>
                      {editMode ? (
                        <>
                          <td>
                            <input
                              type="number"
                              value={operationEdits[index]?.area_ha_executed ?? operation.area_ha_executed}
                              disabled={true}
                              style={{ width: 80, background: '#f8f9fa' }}
                              title="Area is calculated automatically from activities"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={operationEdits[index]?.area_perc ?? operation.area_perc}
                              disabled={true}
                              style={{ width: 60, background: '#f8f9fa' }}
                              title="Percentage is calculated automatically from activities"
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              value={((operationEdits[index]?.starting_date ?? operation.starting_date) || '')}
                              onChange={e => handleSummaryOperationFieldChange(index, 'starting_date', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              value={((operationEdits[index]?.finishing_date ?? operation.finishing_date) || '')}
                              onChange={e => handleSummaryOperationFieldChange(index, 'finishing_date', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={(operationEdits[index]?.observations ?? operation.observations) || ''}
                              onChange={e => handleSummaryOperationFieldChange(index, 'observations', e.target.value)}
                              style={{ width: 180 }}
                            />
                            {operationEditErrors[index] && (
                              <div style={{ color: 'red', fontSize: 12 }}>{operationEditErrors[index]}</div>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{operation.area_ha_executed}</td>
                          <td>
                            <div className="progress-bar">
                              <div
                                className="progress-fill"
                                style={{ width: `${operation.area_perc}%` }}
                              ></div>
                              <span>{operation.area_perc}%</span>
                            </div>
                          </td>
                          <td>{operation.starting_date}</td>
                          <td>{operation.finishing_date || 'Ongoing'}</td>
                          <td>{operation.observations}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'polygons' && (
          <div className="polygons-section">
            <h3>Polygon Operations</h3>
            {/* Polygon Search Bar */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search polygon key/id..."
                value={searchPolygonKey}
                onChange={e => setSearchPolygonKey(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const found = executionSheet.polygons_operations.find(
                      po => String(po.polygon_id).toLowerCase() === searchPolygonKey.trim().toLowerCase()
                    );
                    if (found) {
                      setSelectedPolygon(found.polygon_id);
                      setTimeout(() => {
                        const el = document.getElementById(`polygon-card-${found.polygon_id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 0);
                    } else {
                      alert('Polygon not found');
                    }
                  }
                }}
                className="form-control"
                style={{ maxWidth: 180 }}
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  const found = executionSheet.polygons_operations.find(
                    po =>
                      String(po.polygon_id).toLowerCase() === searchPolygonKey.trim().toLowerCase()
                  );
                  if (found) {
                    setSelectedPolygon(found.polygon_id);
                    setTimeout(() => {
                      const el = document.getElementById(`polygon-card-${found.polygon_id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 0);
                  } else {
                    alert('Polygon not found');
                  }
                }}
                disabled={!searchPolygonKey.trim()}
              >
                Go
              </button>
            </div>
            <div
              className="polygons-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 24,
                maxHeight: 700, // About 3 cards tall, but flexible for card content
                overflowY: 'auto',
                padding: '8px',
                margin: '0 auto',
                width: '100%',
                boxSizing: 'border-box',
                background: '#fafbfc',
                borderRadius: 12,
                border: '1px solid #e3e6ea'
              }}
            >
              {executionSheet.polygons_operations.map((polygonOps) => (
                <div
                  key={polygonOps.polygon_id}
                  id={`polygon-card-${polygonOps.polygon_id}`}
                  className={`polygon-card ${selectedPolygon === polygonOps.polygon_id ? 'selected' : ''}`}
                  style={{
                    background: '#fff',
                    border: selectedPolygon === polygonOps.polygon_id ? '2px solid #007bff' : '1px solid #d1d5db',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    margin: 0,
                    padding: '12px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start'
                  }}
                  onClick={() => setSelectedPolygon(polygonOps.polygon_id)}
                >
                  <div className="polygon-header">
                    <h4>Polygon #{polygonOps.polygon_id}</h4>
                    <div className="completion-badge">
                      {getPolygonCompletionPercentage(polygonOps)}% Complete
                    </div>
                  </div>
                  <div className="polygon-operations">
                    {polygonOps.operations.map((operation) => {
                      const key = `${polygonOps.polygon_id}_${operation.operation_code}`;
                      const assignState = assignmentState[key] || {};
                      const isCompleted = operation.status === 'completed';
                      return (
                        <div key={operation.operation_code} className="operation-item">
                          <div className="operation-info">
                            <span className="operation-id">{operation.operation_code}</span>
                            <span
                              className="status-badge"
                              style={{ backgroundColor: getStatusColor(operation.status) }}
                            >
                              {operation.status}
                            </span>
                          </div>
                          {/* Assignment UI */}
                          {editMode && !isCompleted && (
                            <div className="assignment-controls">
                              <input
                                type="text"
                                placeholder="Assign username"
                                value={assignState.username || operation.assigned_to || ''}
                                onChange={e =>
                                  setAssignmentState(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], username: e.target.value }
                                  }))
                                }
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    handleAssignOperator(polygonOps.polygon_id, operation.operation_code);
                                  }
                                }}
                                onBlur={() => {
                                  handleAssignOperator(polygonOps.polygon_id, operation.operation_code);
                                }}
                                disabled={assignState.loading}
                                style={{ width: 120 }}
                              />
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleAssignOperator(polygonOps.polygon_id, operation.operation_code)}
                                disabled={assignState.loading || !(assignState.username && assignState.username.trim())}
                              >
                                {assignState.loading ? 'Assigning...' : 'Assign'}
                              </button>
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleStartActivity(
                                  polygonOps.polygon_id,
                                  operation.operation_code,
                                  assignState.username || operation.assigned_to
                                )}
                                disabled={!editMode || !(assignState.username || operation.assigned_to)}
                              >
                                Start Activity
                              </button>
                              {assignState.assignedTo && (
                                <span className="assignment-feedback" style={{ color: '#28a745' }}>
                                  Assigned to: {assignState.assignedTo}
                                </span>
                              )}
                              {assignState.error && (
                                <span className="assignment-feedback" style={{ color: 'red' }}>
                                  {assignState.error}
                                </span>
                              )}
                            </div>
                          )}
                          {editMode && (
                            <select
                              value={operation.status}
                              onChange={(e) => handleStatusUpdate(polygonOps.polygon_id, operation.operation_code, e.target.value)}
                              className="status-select"
                              disabled={isCompleted}
                            >
                              <option value="unassigned">Por atribuir</option>
                              <option value="assigned">Atribuído</option>
                              <option value="ongoing">Em execução</option>
                              <option value="completed">Executado</option>
                            </select>
                          )}
                          <div className="operation-dates">
                            {operation.starting_date && (
                              <small>Início: {operation.starting_date}</small>
                            )}
                            {operation.last_activity_date && (
                              <small>Última atividade: {operation.last_activity_date}</small>
                            )}
                            {operation.finishing_date && (
                              <small>Conclusão: {operation.finishing_date}</small>
                            )}
                          </div>
                          {/* Commentary for the pair/activity */}
                          {editMode ? (
                            <div className="operation-observations">
                              <input
                                type="text"
                                value={operation.observations || ''}
                                onChange={e => {
                                  setExecutionSheet(prevSheet => {
                                    const updatedSheet = { ...prevSheet };
                                    const polygonOpsEdit = updatedSheet.polygons_operations.find(po => po.polygon_id === polygonOps.polygon_id);
                                    if (polygonOpsEdit) {
                                      const opEdit = polygonOpsEdit.operations.find(op => op.operation_code === operation.operation_code);
                                      if (opEdit) opEdit.observations = e.target.value;
                                    }
                                    return updatedSheet;
                                  });
                                }}
                                placeholder="Observações"
                                style={{ width: 180 }}
                                disabled={isCompleted}
                              />
                            </div>
                          ) : (
                            operation.observations && (
                              <div className="operation-observations">
                                <small>{operation.observations}</small>
                              </div>
                            )
                          )}
                          {/* Show activities for testing */}
                          {operation.activities && operation.activities.length > 0 && (
                            <div className="operation-activities" style={{ marginTop: 8 }}>
                              <strong>Activities:</strong>
                              <ul>
                                {operation.activities.map(act => (
                                  <li key={act.activity_id}>
                                    {act.type} - {act.status} by {act.started_by} at {act.started_at}
                                    {act.finished_at && `, finished at ${act.finished_at}`}
                                    {act.observations && <span> | Obs: {act.observations}</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tracking' && (
          <div className="tracking-section">
            <h3>GPS Tracking Data</h3>
            {selectedPolygon ? (
              <div className="tracking-details">
                <h4>Polygon #{selectedPolygon} Tracking</h4>
                {(() => {
                  const polygonOps = executionSheet.polygons_operations.find(po => po.polygon_id === selectedPolygon);
                  return polygonOps?.operations.map((operation) => (
                    <div key={operation.operation_code} className="tracking-operation">
                      <h5>{operation.operation_code}</h5>
                      {operation.tracks && operation.tracks.length > 0 ? (
                        <div className="tracks-list">
                          {operation.tracks.map((track, index) => (
                            <div key={index} className="track-item">
                              <strong>Track {index + 1}:</strong>
                              <div className="coordinates">
                                {track.coordinates.length} GPS points recorded
                              </div>
                              <details>
                                <summary>View Coordinates</summary>
                                <div className="coordinates-list">
                                  {track.coordinates.map((coord, coordIndex) => (
                                    <div key={coordIndex} className="coordinate">
                                      Lng: {coord[0]}, Lat: {coord[1]}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No GPS tracking data recorded for this operation.</p>
                      )}
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="tracking-placeholder">
                <p>Select a polygon from the Polygon Operations tab to view its GPS tracking data.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default ExecutionSheet;

export async function CreateExecutionSheet(id, setExecutionSheetData, setError, setLoading, navigate) {
  // Call backend to create execution sheet for worksheet id, then fetch it and navigate to its page
  setLoading && setLoading(true);
  setError && setError(null);
  try {
    const res = await fetch('/rest/execution/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worksheet_id: id })
    });
    if (!res.ok) throw new Error('Failed to create execution sheet');
    let newId = id;
    try {
      const data = await res.json();
      if (data && data.id) newId = data.id;
    } catch { }
    // Optionally fetch the execution sheet (not required if page will fetch on navigation)
    if (setExecutionSheetData) {
      const response = await fetch(`/rest/executionsheet/${newId}`);
      if (!response.ok) throw new Error('Failed to fetch execution sheet');
      const sheet = await response.json();
      setExecutionSheetData(sheet);
    }
    // Navigate to the execution sheet page
    if (navigate) {
      navigate(`/executionsheet/${newId}`);
    }
  } catch (e) {
    if (setError) setError('Failed to create or fetch execution sheet.');
    throw e;
  } finally {
    setLoading && setLoading(false);
  }
}

export function ViewExecutionSheet() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [executionSheetData, setExecutionSheetData] = useState(null);
  const [error, setError] = useState(null);

  // Fetch execution sheet if exists
  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      if (!id) return;
      setLoading(true);
      try {
        const response = await fetch(`/rest/executionsheet/${id}`);
        if (response.status === 404) {
          if (mounted) setExecutionSheetData(null);
          // Do not show create prompt, just show error or export option
          return;
        }
        if (!response.ok) throw new Error('Failed to fetch execution sheet');
        const data = await response.json();
        CheckRequests(data, navigate);
        if (mounted) setExecutionSheetData(data);
      } catch (err) {
        if (mounted) setError('Failed to load execution sheet data.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => { mounted = false; };
  }, [id, navigate]);

  if (loading) {
    return (
      <>
        {topBar && typeof topBar === 'function' ? topBar(navigate) : topBar}
        <div>Loading...</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {topBar && typeof topBar === 'function' ? topBar(navigate) : topBar}
        <div className="error-message">{error}</div>
      </>
    );
  }

  if (!executionSheetData) {
    // Show dummy execution sheet if not found
    return (
      <>
        {topBar && typeof topBar === 'function' ? topBar(navigate) : topBar}
        <div className="execution-sheet-container" style={{ textAlign: 'center', marginTop: 48 }}>
          <div className="error-message" style={{ marginBottom: 24 }}>
            <p>No execution sheet found for this worksheet.<br />For now showing dummy execution sheet. (Later: show error only)</p>
          </div>
          <ExecutionSheet
            executionSheetData={null}
            onSave={null}
            onClose={() => navigate(-1)}
            isEditable={true} // <-- allow editing dummy
          />
        </div>
      </>
    );
  }

  return (
    <>
      {topBar && typeof topBar === 'function' ? topBar(navigate) : topBar}
      <ExecutionSheet
        executionSheetData={executionSheetData}
        onSave={null}
        onClose={() => navigate(-1)}
        isEditable={true}
      />
    </>
  );
}