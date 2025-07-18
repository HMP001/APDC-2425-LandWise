import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { topBar } from '../TopBar';
import { normalizeWorksheet, worksheetToGeoJSON, WorksheetDisplay, DeleteWorkSheet, normalizeAigpData, GenericWorksheetDisplay } from './WorkSheetService';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import CheckRequests from '../CheckRequests';
import './WorkSheet.css';

export function ListWorkSheets() {
  const [worksheets, setWorksheets] = useState([]);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null); // Track which worksheet is expanded
  const [showDeleteId, setShowDeleteId] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const filterOptions = [
    { label: "AIGP", value: "aigp", type: "text" },
    { label: "Status", value: "status", type: "text" },
    { label: "Offset", value: "offset", type: "number" },
    { label: "Issuing User ID", value: "issuing_user_id", type: "text" },
    { label: "Issue Date", value: "issueDate", type: "date" },
    { label: "Title", value: "title", type: "text" },
    { label: "ID", value: "id", type: "text" },
    { label: "Starting Date", value: "starting_date", type: "date" },
    { label: "Finishing Date", value: "finishing_date", type: "date" },
    { label: "Service Provider ID", value: "serviceProviderId", type: "text" },
    { label: "Award Date", value: "awardDate", type: "date" },
    { label: "Limit", value: "limit", type: "number" }
  ];
  const [filters, setFilters] = useState([]);
  const [filterCollapsed, setFilterCollapsed] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState(filterOptions[0].value);
  const [filterValue, setFilterValue] = useState('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let isMounted = true; // Track component mount status

    const body = { limit, offset };
    filters.forEach(filter => {
      if (filter.value) {
        body[filter.key] = filter.value;
      }
    });
    const fetchWorksheets = async () => {
      try {
        const request = await fetch("/rest/worksheet/searchDetailed", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        CheckRequests(request, navigate);

        const data = await request.json();
        console.log("Fetched worksheets data:", data);
        const normalizedWorksheets = data.map(worksheet => {
          // For future use, receiving as geojson
          /*const detectedCRS = detectCRSFromGeoJSON(worksheet);
          let normalizedData;
          if (detectedCRS && detectedCRS.code !== 'EPSG:4326') {
            normalizedData = convertGeoJSONToWorksheetWithCRS(worksheet, detectedCRS);
          } else {
            normalizedData = convertGeoJSONToWorksheet(worksheet);
          }*/

          const normalizedData = normalizeWorksheet(worksheet);
          normalizedData.id = worksheet.id; // Ensure ID is included
          return normalizedData;
        });
        setWorksheets(normalizedWorksheets);
      } catch (err) {
        if (isMounted) setError('Error fetching worksheets. Please try again later.');
        console.error(err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchWorksheets();
    return () => { isMounted = false; }; // Cleanup function to avoid state updates on unmounted component
  }, [navigate, filters, limit, offset]);

  if (loading) {
    return (
      <>
        {topBar(navigate)}
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading Worksheets...</p>
        </div>
      </>
    );
  }

  const handleAddFilter = () => {
    if (!filterValue) return;
    // Overwrite filter with same key
    setFilters(prev => [
      ...prev.filter(f => f.key !== selectedFilter),
      { key: selectedFilter, value: filterValue, label: filterOptions.find(f => f.value === selectedFilter)?.label }
    ]);
    setFilterValue('');
  };

  const handleRemoveFilter = (key) => {
    setFilters(prev => prev.filter(f => f.key !== key));
  };

  const handleFilterKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFilter();
    }
  };

  const handleExpand = async (id) => {
    setExpandedId(expandedId === id ? null : id);
  };
  return (
    <>
      {topBar(navigate)}
      <div className='worksheet-list-container'>
        <div className='worksheet-container'>
          {error && <div className="form-error">{error}</div>}
          <h2 className="worksheet-list-header">WorkSheets List</h2>

          {/* --- Filter Section --- */}
          <div className="filter-section" style={{ marginBottom: 20 }}>
            <button
              className="btn btn-outline-primary"
              type="button"
              onClick={() => setFilterCollapsed(c => !c)}
              style={{ marginBottom: 8 }}
            >
              {filterCollapsed ? "Show Filters" : "Hide Filters"}
            </button>
            {!filterCollapsed && (
              <div className="filter-controls" style={{
                background: "#f8f9fa",
                border: "1px solid #e0e0e0",
                borderRadius: 6,
                padding: 12,
                marginBottom: 10
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    value={selectedFilter}
                    onChange={e => setSelectedFilter(e.target.value)}
                    style={{ minWidth: 120 }}
                  >
                    {filterOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    type={filterOptions.find(f => f.value === selectedFilter)?.type || "text"}
                    value={filterValue}
                    onChange={e => setFilterValue(e.target.value)}
                    onKeyDown={handleFilterKeyDown}
                    placeholder="Enter value"
                    style={{ minWidth: 160 }}
                  />
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={handleAddFilter}
                    disabled={!filterValue}
                  >
                    Add Filter
                  </button>
                  <span style={{ marginLeft: 16, fontSize: 13, color: "#888" }}>
                    Limit:
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={limit}
                      onChange={e => setLimit(Number(e.target.value))}
                      style={{ width: 60, marginLeft: 4, marginRight: 8 }}
                    />
                    Offset:
                    <input
                      type="number"
                      min={0}
                      value={offset}
                      onChange={e => setOffset(Number(e.target.value))}
                      style={{ width: 60, marginLeft: 4 }}
                    />
                  </span>
                </div>
                {/* Active filters */}
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {filters.map(f => (
                    <span key={f.key} style={{
                      background: "#e3f2fd",
                      border: "1px solid #90caf9",
                      borderRadius: 12,
                      padding: "4px 10px",
                      display: "inline-flex",
                      alignItems: "center",
                      fontSize: 13
                    }}>
                      <b>{f.label}:</b> {f.value}
                      <button
                        type="button"
                        onClick={() => handleRemoveFilter(f.key)}
                        style={{
                          marginLeft: 6,
                          background: "none",
                          border: "none",
                          color: "#1976d2",
                          fontWeight: "bold",
                          cursor: "pointer",
                          fontSize: 15
                        }}
                        aria-label="Remove filter"
                      >×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {worksheets.map((worksheet, index) => {
              const expandKey = worksheet.id || worksheet.title || String(index);
              return (
                <li key={expandKey} style={{ marginBottom: 20, border: '1px solid #ccc', borderRadius: 4 }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 10 }}
                    onClick={() => handleExpand(expandKey)}
                  >
                    <span style={{ flex: 1 }}>Worksheet-{expandKey}</span>
                    {expandedId === expandKey ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                  {expandedId === expandKey && (
                    <div style={{ padding: 10, background: '#f9f9f9' }}>
                      <div className='worksheet-header-row'>
                        <h2 className="worksheet-header">WorkSheet Details</h2>
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={async () => {
                            const crsCode = window.prompt(
                              "Enter desired CRS code (e.g., EPSG:4326 for WGS84, EPSG:3763 for Portugal):",
                              "EPSG:4326"
                            );
                            if (!crsCode) return;
                            // Optionally, you could convert coordinates here if needed
                            const geojson = await worksheetToGeoJSON(worksheet, crsCode);
                            const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `worksheet-${worksheet.id || 'export'}.geojson`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          Download as GeoJSON
                        </button>
                      </div>
                      <WorksheetDisplay
                        worksheet={worksheet}
                        setForm={() => { }}
                        isViewMode={true}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                        <button
                          className="btn btn-danger"
                          type="button"
                          onClick={() => setShowDeleteId(worksheet.id)}
                        >
                          Delete WorkSheet
                        </button>
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={() => navigate(`/executionsheet/${worksheet.id}`, { state: { worksheetData: worksheet } })}
                        >
                          View Execution Sheet
                        </button>
                      </div>
                      {showDeleteId === worksheet.id && (
                        <DeleteWorkSheet worksheetId={worksheet.id} onClose={() => setShowDeleteId(null)} />
                      )}
                    </div>
                  )}
                </li>
              )
            }
            )}
          </ul>
        </div>
      </div>
    </>
  )
}

export function GenericListWorkSheets() {
  const [worksheets, setWorksheets] = useState([]);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // --- Filter state ---
  const filterOptions = [
    { label: "AIGP", value: "aigp", type: "text" },
    { label: "Status", value: "status", type: "text" },
    { label: "Offset", value: "offset", type: "number" },
    { label: "Issuing User ID", value: "issuing_user_id", type: "text" },
    { label: "Issue Date", value: "issueDate", type: "date" },
    { label: "Title", value: "title", type: "text" },
    { label: "ID", value: "id", type: "text" },
    { label: "Starting Date", value: "starting_date", type: "date" },
    { label: "Finishing Date", value: "finishing_date", type: "date" },
    { label: "Service Provider ID", value: "serviceProviderId", type: "text" },
    { label: "Award Date", value: "awardDate", type: "date" },
    { label: "Limit", value: "limit", type: "number" }
  ];
  const [filters, setFilters] = useState([]);
  const [filterCollapsed, setFilterCollapsed] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState(filterOptions[0].value);
  const [filterValue, setFilterValue] = useState('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchWorksheets = async () => {
      const body = { limit, offset };
      filters.forEach(filter => {
        if (filter.value) {
          body[filter.key] = filter.value;
        }
      });
      try {
        const request = await fetch("/rest/worksheet/search", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        CheckRequests(request, navigate);

        const data = await request.json();
        console.log("Fetched generic worksheets data:", data);

        // For generic list, we only need generic info
        const basicWorksheets = data.map(worksheet => ({
          id: worksheet.id,
          title: worksheet.title || '',
          status: worksheet.status || '',
          starting_date: worksheet.starting_date || '',
          finishing_date: worksheet.finishing_date || '',
          issue_date: worksheet.issue_date || '',
          award_date: worksheet.award_date || '',
          service_provider_id: worksheet.service_provider_id || '',
          aigp: normalizeAigpData(worksheet.aigp || {})
        }));

        if (isMounted) {
          setWorksheets(basicWorksheets);
        }
      } catch (err) {
        if (isMounted) setError('Error fetching worksheets. Please try again later.');
        console.error(err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWorksheets();
    return () => { isMounted = false; };
  }, [navigate, filters, limit, offset]);

  const handleAddFilter = () => {
    if (!filterValue) return;
    // Overwrite filter with same key
    setFilters(prev => [
      ...prev.filter(f => f.key !== selectedFilter),
      { key: selectedFilter, value: filterValue, label: filterOptions.find(f => f.value === selectedFilter)?.label }
    ]);
    setFilterValue('');
  };

  const handleRemoveFilter = (key) => {
    setFilters(prev => prev.filter(f => f.key !== key));
  };

  const handleFilterKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFilter();
    }
  };

  const handleExpand = async (id) => {
    if (expandedId === id) {
      // Collapse if already expanded
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
  };

  const handleViewDetails = (id) => {
    navigate(`/worksheet/generic-view/${id}`);
  };

  if (loading) {
    return (
      <>
        {topBar(navigate)}
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading Worksheets...</p>
        </div>
      </>
    );
  }

  return (
    <>
      {topBar(navigate)}
      <div className='worksheet-list-container'>
        <div className='worksheet-container'>
          {error && <div className="form-error">{error}</div>}
          <div className='worksheet-header-row'>
            <h2 className="worksheet-header">WorkSheets Overview</h2>
            <div className="worksheet-actions">
              <span className="worksheet-count">{worksheets.length} worksheets found</span>
            </div>
          </div>

          {/* --- Filter Section --- */}
          <div className="filter-section" style={{ marginBottom: 20 }}>
            <button
              className="btn btn-outline-primary"
              type="button"
              onClick={() => setFilterCollapsed(c => !c)}
              style={{ marginBottom: 8 }}
            >
              {filterCollapsed ? "Show Filters" : "Hide Filters"}
            </button>
            {!filterCollapsed && (
              <div className="filter-controls" style={{
                background: "#f8f9fa",
                border: "1px solid #e0e0e0",
                borderRadius: 6,
                padding: 12,
                marginBottom: 10
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    value={selectedFilter}
                    onChange={e => setSelectedFilter(e.target.value)}
                    style={{ minWidth: 120 }}
                  >
                    {filterOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    type={filterOptions.find(f => f.value === selectedFilter)?.type || "text"}
                    value={filterValue}
                    onChange={e => setFilterValue(e.target.value)}
                    onKeyDown={handleFilterKeyDown}
                    placeholder="Enter value"
                    style={{ minWidth: 160 }}
                  />
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={handleAddFilter}
                    disabled={!filterValue}
                  >
                    Add Filter
                  </button>
                  <span style={{ marginLeft: 16, fontSize: 13, color: "#888" }}>
                    Limit:
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={limit}
                      onChange={e => setLimit(Number(e.target.value))}
                      style={{ width: 60, marginLeft: 4, marginRight: 8 }}
                    />
                    Offset:
                    <input
                      type="number"
                      min={0}
                      value={offset}
                      onChange={e => setOffset(Number(e.target.value))}
                      style={{ width: 60, marginLeft: 4 }}
                    />
                  </span>
                </div>
                {/* Active filters */}
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {filters.map(f => (
                    <span key={f.key} style={{
                      background: "#e3f2fd",
                      border: "1px solid #90caf9",
                      borderRadius: 12,
                      padding: "4px 10px",
                      display: "inline-flex",
                      alignItems: "center",
                      fontSize: 13
                    }}>
                      <b>{f.label}:</b> {f.value}
                      <button
                        type="button"
                        onClick={() => handleRemoveFilter(f.key)}
                        style={{
                          marginLeft: 6,
                          background: "none",
                          border: "none",
                          color: "#1976d2",
                          fontWeight: "bold",
                          cursor: "pointer",
                          fontSize: 15
                        }}
                        aria-label="Remove filter"
                      >×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="generic-worksheet-list">
            {worksheets.length === 0 ? (
              <div className="no-worksheets">
                <p>No worksheets found.</p>
              </div>
            ) : (
              <ul className="generic-worksheet-items">
                {worksheets.map((worksheet) => (
                  <li key={worksheet.id} className="generic-worksheet-item">
                    <div
                      className="worksheet-item-header"
                      onClick={() => handleExpand(worksheet.id)}
                    >
                      <div className="worksheet-item-info">
                        <span className="worksheet-item-title">
                          {`Worksheet ${worksheet.id}`}
                        </span>
                        <span className={`worksheet-item-status status-${worksheet.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {worksheet.status}
                        </span>
                      </div>
                      <div className="worksheet-item-toggle">
                        {expandedId === worksheet.id ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                    </div>

                    {expandedId === worksheet.id && (
                      <div className="worksheet-item-content">
                        {worksheet ? (
                          <GenericWorksheetDisplay
                            worksheetData={worksheet}
                            showActions={true}
                            onViewDetails={handleViewDetails}
                            onClose={() => setExpandedId(null)}
                          />
                        ) : (
                          <div className="error-expanded">
                            Failed to load worksheet details.
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}