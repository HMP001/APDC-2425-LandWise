import React, { useState, useEffect } from 'react';
import './WorkSheet.css';

/**
 * ExecutionSheet Component - UI for viewing and managing execution sheets
 */
const ExecutionSheet = ({ executionSheetData, onSave, onClose, isEditable = false }) => {
  const [executionSheet, setExecutionSheet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

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
              operation_id: 1,
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
              ]
            },
            {
              operation_id: 2,
              status: "ongoing",
              starting_date: "2025-07-04",
              finishing_date: null,
              last_activity_date: "2025-07-05",
              observations: "Seeding 60% complete",
              tracks: []
            }
          ]
        },
        {
          polygon_id: 102,
          operations: [
            {
              operation_id: 1,
              status: "assigned",
              starting_date: null,
              finishing_date: null,
              last_activity_date: null,
              observations: "Scheduled for next week",
              tracks: []
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

  // Handle save operation
  const handleSave = () => {
    if (onSave) {
      onSave(executionSheet);
    }
    setEditMode(false);
  };

  // Handle operation status update
  const handleStatusUpdate = (polygonId, operationId, newStatus) => {
    const updatedSheet = { ...executionSheet };
    const polygonOps = updatedSheet.polygons_operations.find(po => po.polygon_id === polygonId);
    if (polygonOps) {
      const operation = polygonOps.operations.find(op => op.operation_id === operationId);
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
            <div className="polygons-grid">
              {executionSheet.polygons_operations.map((polygonOps) => (
                <div
                  key={polygonOps.polygon_id}
                  className={`polygon-card ${selectedPolygon === polygonOps.polygon_id ? 'selected' : ''}`}
                  onClick={() => setSelectedPolygon(polygonOps.polygon_id)}
                >
                  <div className="polygon-header">
                    <h4>Polygon #{polygonOps.polygon_id}</h4>
                    <div className="completion-badge">
                      {getPolygonCompletionPercentage(polygonOps)}% Complete
                    </div>
                  </div>
                  <div className="polygon-operations">
                    {polygonOps.operations.map((operation) => (
                      <div key={operation.operation_id} className="operation-item">
                        <div className="operation-info">
                          <span className="operation-id">Operation #{operation.operation_id}</span>
                          <span
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(operation.status) }}
                          >
                            {operation.status}
                          </span>
                        </div>
                        {editMode && (
                          <select
                            value={operation.status}
                            onChange={(e) => handleStatusUpdate(polygonOps.polygon_id, operation.operation_id, e.target.value)}
                            className="status-select"
                          >
                            <option value="unassigned">Unassigned</option>
                            <option value="assigned">Assigned</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                          </select>
                        )}
                        <div className="operation-dates">
                          {operation.starting_date && (
                            <small>Started: {operation.starting_date}</small>
                          )}
                          {operation.finishing_date && (
                            <small>Finished: {operation.finishing_date}</small>
                          )}
                        </div>
                        {operation.observations && (
                          <div className="operation-observations">
                            <small>{operation.observations}</small>
                          </div>
                        )}
                      </div>
                    ))}
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
                    <div key={operation.operation_id} className="tracking-operation">
                      <h5>Operation #{operation.operation_id}</h5>
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