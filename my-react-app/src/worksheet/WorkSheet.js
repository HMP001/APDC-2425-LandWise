import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWsNorm, WorksheetDisplay, convertGeometryCoordinates, normalizeAigpData } from './WorkSheetService';
import { topBar } from '../TopBar';
import './WorkSheet.css';

export default function WorkSheet({ mode }) {
  const { id } = useParams();
  const [form, setForm] = useState({
    id: id,
    title: '',
    status: '',
    starting_date: '',
    finishing_date: '',
    issue_date: '',
    award_date: '',
    service_provider_id: '',
    issuing_user_id: '',
    posa_code: '',
    posa_description: '',
    posp_code: '',
    posp_description: '',
    operations: [],
    aigp: {},
    features: {}
  });
  const [initialForm, setInitialForm] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [loadingWS, setLoadingWS] = useState(mode === 'edit');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'edit') {
      let isMounted = true;
      fetchWsNorm(id, navigate)
        .then(normalizedData => {
          setForm(normalizedData);
          setInitialForm(normalizedData);
        })
        .catch(err => {
          console.error("Error fetching worksheet:", err);
          setError("Failed to load worksheet data. Please try again later.");
        })
        .finally(() => {
          if (isMounted) setLoadingWS(false);
        });
      return () => { isMounted = false; };
    }
  }, [mode, navigate, id]);


  if (loadingWS) {
    return (
      <>
        {topBar(navigate)}
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading WorkSheet...</p>
        </div>
      </>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Convert AIGP array to comma-separated string for backend
      const formDataForBackend = {
        ...form,
        aigp: Object.keys(form.aigp) || [],
        features: Object.values((form.features) || []).map(({ key, ...rest }) => rest)
      };

      const response = await fetch(mode === 'create' ? "/rest/worksheet/create" : "/rest/worksheet/edit", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formDataForBackend)
      });
      const data = await response.json();
      if (response.ok) {
        navigate(`/worksheet/view/${form.id}`); // Redirect to the worksheets list or detail page
      } else {
        const errorData = data;
        setError(errorData.message || "Failed to create worksheet. Please try again later.");
        if (mode === 'edit') {
          setForm(initialForm); // Reset to initial form if edit fails
        }
        setLoading(false);
      }
    } catch (error) {
      console.error("Error creating worksheet:", error);
      setError("An error occurred while creating the worksheet. Please try again later.");
      if (mode === 'edit') {
        setForm(initialForm); // Reset to initial form if edit fails

      }
      setLoading(false);
    }

  };

  return (
    <>
      {topBar(navigate)}
      <div className='worksheet-form-container'>
        <div className='worksheet-container'>
          <form onSubmit={handleSubmit} className="worksheet-form">
            <h2 className="worksheet-header">Create WorkSheet</h2>

            <WorksheetDisplay
              worksheet={form}
              setWorksheet={setForm}
              isViewMode={false}
            />

            {/* Submit/Error */}
            {error && <div className="form-error">{error}</div>}
            <button
              className="btn btn-primary btn-large"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  {mode === 'create' ? "Creating" : "Submiting"}  Worksheet
                  <span className="spinner" />
                </>
              ) : (
                mode === 'create' ? "Create Worksheet" : "Submit Worksheet"
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );

}

export function UploadWorkSheet() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [worksheetData, setWorksheetData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setError('');
    setWarning('');
    setWorksheetData(null);
    setShowPreview(false);
    setDetectedFormat('');

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          let normalizedData = null;
          let format = '';

          // Only accept GeoJSON format
          if (jsonData.type === "FeatureCollection") {
            // Validate GeoJSON
            const validation = validateGeoJSONWorksheet(jsonData);
            if (!validation.valid) {
              setError(`GeoJSON validation error: ${validation.error}`);
              return;
            }

            // Detect and handle coordinate systems
            const detectedCRS = detectCRSFromGeoJSON(jsonData);
            if (detectedCRS && detectedCRS.code !== 'EPSG:4326') {
              // Convert coordinates using local approximation (no external API calls)
              try {
                normalizedData = await convertGeoJSONToWorksheetWithCRS(jsonData, detectedCRS);
                format = `GeoJSON FeatureCollection (${detectedCRS.code} converted to WGS84)`;
                setWarning(`Coordinates converted from ${detectedCRS.code} to WGS84 using approximation. Map display may not be perfectly accurate.`);
              } catch (conversionError) {
                console.error("CRS conversion error:", conversionError);
                setWarning(`Unable to convert coordinates from ${detectedCRS.code}. Using original coordinates for preview - features may not display correctly on the map.`);
                normalizedData = convertGeoJSONToWorksheet(jsonData);
                format = 'GeoJSON FeatureCollection';
              }
            } else {
              // No CRS conversion needed or CRS is already WGS84
              normalizedData = convertGeoJSONToWorksheet(jsonData);
              format = 'GeoJSON FeatureCollection (WGS84)';
            }
          } else {
            setError("Only GeoJSON FeatureCollection format is supported. Please upload a valid GeoJSON file with worksheet metadata.");
            return;
          }

          if (normalizedData) {
            setWorksheetData(normalizedData);
            setDetectedFormat(format);
            setShowPreview(true);
          } else {
            setError("Unable to parse worksheet data. Please check the GeoJSON format and metadata structure.");
          }
        } catch (parseError) {
          console.error("Error parsing JSON:", parseError);
          setError("Invalid JSON file. Please ensure the file is properly formatted GeoJSON.");
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    const aigp = Object.keys(worksheetData.aigp) || []
    const features = Object.values((worksheetData.features) || []).map(({ key, ...rest }) => rest);

    try {
      const response = await fetch("/rest/worksheet/create", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: worksheetData.id || '',
          title: worksheetData.title || '',
          status: worksheetData.status || '',
          starting_date: worksheetData.starting_date || '',
          finishing_date: worksheetData.finishing_date || '',
          issue_date: worksheetData.issue_date || '',
          award_date: worksheetData.award_date || '',
          service_provider_id: worksheetData.service_provider_id || '',
          issuing_user_id: worksheetData.issuing_user_id || '',
          posa_code: worksheetData.posa_code || '',
          posa_description: worksheetData.posa_description || '',
          posp_code: worksheetData.posp_code || '',
          posp_description: worksheetData.posp_description || '',
          aigp: aigp,
          operations: worksheetData.operations || [],
          features: features,
          crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG:4326' } } // Assuming WGS84 for upload
        })
      });
      const data = await response.json();
      if (response.ok) {
        navigate(`/worksheet/view/${worksheetData.id}`); // Redirect to the worksheets list or detail page
      } else {
        const errorData = data;
        setError(errorData.message || "Failed to upload worksheet. Please try again later.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error uploading worksheet:", error);
      setError("An error occurred while uploading the worksheet. Please try again later.");
      setLoading(false);
    }
  };

  const handleCancelPreview = () => {
    setFile(null);
    setWorksheetData(null);
    setShowPreview(false);
    setDetectedFormat('');
    setError('');
    setWarning('');
    // Reset the file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <>
      {topBar(navigate)}
      <div className='worksheet-form-container'>
        <div className='worksheet-container'>
          {!showPreview ? (
            <div className="upload-worksheet-form">
              <h2 className="upload-worksheet-header">Upload WorkSheet</h2>

              <div className="form-section">
                <p style={{ marginBottom: '15px', color: '#666' }}>
                  Upload a GeoJSON file containing worksheet data with feature geometries. The file will be previewed before uploading to the server.
                </p>

                <label className="form-label" htmlFor="worksheet-file">
                  Select GeoJSON WorkSheet File:
                </label>
                <input
                  id="worksheet-file"
                  type="file"
                  accept=".geojson,.json"
                  onChange={handleFileChange}
                  required
                  className="form-input"
                />

                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '14px' }}>Required GeoJSON Structure:</p>
                  <ul style={{ margin: '0', fontSize: '12px', color: '#666', paddingLeft: '20px' }}>
                    <li><strong>Type:</strong> Must be a FeatureCollection</li>
                    <li><strong>Features:</strong> Array of GeoJSON features with geometries (Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon)</li>
                    <li><strong>Metadata:</strong> Optional metadata object containing worksheet details (title, status, AIGP info, operations, etc.)</li>
                  </ul>
                  <p style={{ margin: '10px 0 5px 0', fontSize: '12px', color: '#666' }}>
                    <strong>Metadata structure:</strong> Include a "metadata" object at the root level with fields like: title, status, starting_date, finishing_date, aigp (with id, name, address, nif), operations array, etc.
                  </p>
                  <p style={{ margin: '5px 0 5px 0', fontSize: '12px', color: '#666' }}>
                    <strong>Coordinate Systems:</strong> Files with EPSG:3763 (Portuguese projected coordinates) are automatically converted to WGS84 for map display.
                  </p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#007bff' }}>
                    <strong>Sample file:</strong>
                    <a href="/sample-landit-geojson.json" download style={{ marginLeft: '5px', textDecoration: 'underline' }}>Download Sample GeoJSON</a>
                  </p>
                </div>
              </div>

              {warning && <div className="form-warning" style={{
                color: '#856404',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '4px',
                padding: '10px',
                margin: '10px 0'
              }}>{warning}</div>}

              {file && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
                  <p style={{ margin: '0', fontSize: '14px', color: '#155724' }}>
                    ✓ File selected: {file.name}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="worksheet-form">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#e8f4fd',
                borderRadius: '8px',
                border: '1px solid #bee5eb'
              }}>
                <div>
                  <h2 className="worksheet-header" style={{ margin: '0 0 5px 0' }}>
                    Preview Uploaded WorkSheet
                  </h2>
                  <p style={{ margin: '0', fontSize: '14px', color: '#0c5460', wordBreak: 'break-word' }}>
                    Detected format: <strong>{detectedFormat}</strong><br />
                    Review the worksheet data below, then confirm upload to save it to the server.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '220px', alignItems: 'stretch' }}>
                  <button
                    type="button"
                    onClick={handleCancelPreview}
                    className="btn btn-secondary"
                    style={{ marginRight: '10px' }}
                    disabled={loading}
                  >
                    Choose Different File
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        Submiting...
                        <span className="spinner" />
                      </>
                    ) : (
                      'Confirm and Upload to Server'
                    )}
                  </button>
                </div>
              </div>
              {error && <div className="form-error">{error}</div>}

              {worksheetData && (
                <WorksheetDisplay
                  worksheet={worksheetData}
                  setWorksheet={setWorksheetData}
                  isViewMode={false}
                />
              )}

              {error && <div className="form-error">{error}</div>}
              {warning && <div className="form-warning" style={{
                color: '#856404',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '4px',
                padding: '10px',
                margin: '10px 0'
              }}>{warning}</div>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const validateGeoJSONWorksheet = (geoJsonData) => {
  if (!geoJsonData.type || geoJsonData.type !== "FeatureCollection") {
    return { valid: false, error: "Must be a FeatureCollection" };
  }

  if (!geoJsonData.features || !Array.isArray(geoJsonData.features)) {
    return { valid: false, error: "Must contain a features array" };
  }

  // Metadata is optional - we can create a basic worksheet even without metadata
  return { valid: true };
};

// CRS Detection and Conversion Functions

/**
 * Detect the CRS from a GeoJSON object
 * @param {Object} geoJsonData - GeoJSON object
 * @returns {Object|null} - CRS information object or null if not detected
 */
function detectCRSFromGeoJSON(geoJsonData) {
  // Check for explicit CRS property
  if (geoJsonData.crs && geoJsonData.crs.properties) {
    const crsProps = geoJsonData.crs.properties;

    // Handle different CRS property formats
    if (crsProps.name) {
      const crsName = crsProps.name;

      // Handle EPSG format variations
      if (crsName.includes('EPSG')) {
        const epsgMatch = crsName.match(/EPSG[:\s]*(\d+)/i);
        if (epsgMatch) {
          const epsgCode = epsgMatch[1];
          return {
            code: `EPSG:${epsgCode}`,
            name: getCRSName(epsgCode),
            type: 'projected'
          };
        }
      }

      // Handle other named CRS
      return {
        code: crsName,
        name: crsName,
        type: 'unknown'
      };
    }

    // Handle code property
    if (crsProps.code) {
      return {
        code: crsProps.code,
        name: getCRSName(crsProps.code.replace('EPSG:', '')),
        type: 'projected'
      };
    }
  }

  // Check for CRS in the name property (legacy format)
  if (geoJsonData.name && typeof geoJsonData.name === 'string') {
    const nameStr = geoJsonData.name.toLowerCase();
    if (nameStr.includes('epsg')) {
      const epsgMatch = nameStr.match(/epsg[:\s]*(\d+)/i);
      if (epsgMatch) {
        const epsgCode = epsgMatch[1];
        return {
          code: `EPSG:${epsgCode}`,
          name: getCRSName(epsgCode),
          type: 'projected'
        };
      }
    }
  }

  // Heuristic detection based on coordinate ranges
  if (geoJsonData.features && geoJsonData.features.length > 0) {
    const sampleCoords = extractSampleCoordinates(geoJsonData.features[0]);
    if (sampleCoords) {
      const [x, y] = sampleCoords;

      // Check for Portuguese EPSG:3763 (typical ranges: X: -100000 to 400000, Y: -300000 to 300000)
      if (x > -200000 && x < 500000 && y > -400000 && y < 400000 && (Math.abs(x) > 180 || Math.abs(y) > 90)) {
        return {
          code: 'EPSG:3763',
          name: 'ETRS89 / Portugal TM06',
          type: 'projected'
        };
      }

      // Check for UTM zones (typical ranges for Portugal area)
      if (x > 100000 && x < 900000 && y > 4000000 && y < 5000000) {
        return {
          code: 'EPSG:32629', // UTM Zone 29N (most common for Portugal)
          name: 'WGS 84 / UTM zone 29N',
          type: 'projected'
        };
      }

      // If coordinates look like lat/lng, assume WGS84
      if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
        return {
          code: 'EPSG:4326',
          name: 'WGS 84',
          type: 'geographic'
        };
      }
    }
  }

  // Default assumption - WGS84
  return {
    code: 'EPSG:4326',
    name: 'WGS 84',
    type: 'geographic'
  };
}


/**
 * Convert GeoJSON to worksheet with CRS conversion
 * @param {Object} geoJsonData - GeoJSON data
 * @param {Object} detectedCRS - Detected CRS information
 * @returns {Promise<Object>} - Converted worksheet data
 */
async function convertGeoJSONToWorksheetWithCRS(geoJsonData, detectedCRS) {
  // Create a copy of the original data
  const convertedGeoJSON = JSON.parse(JSON.stringify(geoJsonData));

  // Convert all feature coordinates if CRS conversion is needed
  if (detectedCRS.code !== 'EPSG:4326') {
    for (let i = 0; i < convertedGeoJSON.features.length; i++) {
      const feature = convertedGeoJSON.features[i];
      if (feature.geometry && feature.geometry.coordinates) {
        try {
          const convertedCoords = await convertGeometryCoordinates(
            feature.geometry.coordinates,
            feature.geometry.type,
            detectedCRS.code,
            'EPSG:4326'
          );
          feature.geometry.coordinates = convertedCoords;
        } catch (error) {
          console.error(`Failed to convert coordinates for feature ${i}:`, error);
          // Keep original coordinates if conversion fails
        }
      }
    }
  }

  // Use the existing conversion function with converted coordinates
  return convertGeoJSONToWorksheet(convertedGeoJSON);
}

const convertGeoJSONToWorksheet = (geoJsonData) => {
  // Try to get metadata from multiple possible locations
  const metadata = geoJsonData.metadata || geoJsonData.properties || {};

  // Also check if metadata is embedded in the first feature's properties
  const firstFeatureMetadata = geoJsonData.features && geoJsonData.features.length > 0 ?
    geoJsonData.features[0].properties?.metadata : {};

  // Merge all possible metadata sources
  const allMetadata = { ...firstFeatureMetadata, ...metadata };

  const result = {
    id: allMetadata.id || '', // Include ID from metadata
    title: allMetadata.title || geoJsonData.name || '',
    status: allMetadata.status || '',
    starting_date: allMetadata.starting_date || '',
    finishing_date: allMetadata.finishing_date || '',
    issue_date: allMetadata.issue_date || '',
    award_date: allMetadata.award_date || '',
    service_provider_id: allMetadata.service_provider_id || '',
    issuing_user_id: allMetadata.issuing_user_id || '',
    posa_code: allMetadata.posa_code || '',
    posa_description: allMetadata.posa_description || '',
    posp_code: allMetadata.posp_code || '',
    posp_description: allMetadata.posp_description || '',
    aigp: normalizeAigpData(allMetadata.aigp),
    operations: allMetadata.operations || [],
    polygon: [], // Keep empty for backward compatibility
    features: Object.fromEntries(
      (geoJsonData.features || []).map((feature, idx) => {
        const key = feature.properties?.polygon_id || feature.properties?.id || `${Date.now()}_${idx}`;;
        return [key, { ...feature, key }];
      })
    )
  };

  Object.values(result.features).forEach(feature => {
    if (feature.properties?.aigp) {
      // Increment the count for this AIGP in the worksheet
      if (!result.aigp[feature.properties.aigp]) {
        result.aigp[feature.properties.aigp] = 1;
      } else {
        result.aigp[feature.properties.aigp]++;
      }
    }
  });

  return result;
};


/**
 * Get human-readable CRS name by EPSG code
 * @param {string} epsgCode - EPSG code (without EPSG: prefix)
 * @returns {string} - Human-readable CRS name
 */
function getCRSName(epsgCode) {
  const knownCRS = {
    '4326': 'WGS 84',
    '3763': 'ETRS89 / Portugal TM06',
    '32629': 'WGS 84 / UTM zone 29N',
    '32628': 'WGS 84 / UTM zone 28N',
    '2154': 'RGF93 / Lambert-93',
    '3857': 'WGS 84 / Pseudo-Mercator'
  };

  return knownCRS[epsgCode] || `EPSG:${epsgCode}`;
}

/**
 * Extract sample coordinates from a feature geometry
 * @param {Object} feature - GeoJSON feature
 * @returns {Array|null} - [x, y] coordinates or null
 */
function extractSampleCoordinates(feature) {
  if (!feature.geometry || !feature.geometry.coordinates) {
    return null;
  }

  const coords = feature.geometry.coordinates;
  const geomType = feature.geometry.type;

  switch (geomType) {
    case 'Point':
      return coords;
    case 'LineString':
      return coords[0];
    case 'Polygon':
      return coords[0][0];
    case 'MultiPoint':
      return coords[0];
    case 'MultiLineString':
      return coords[0][0];
    case 'MultiPolygon':
      return coords[0][0][0];
    default:
      return null;
  }
}
