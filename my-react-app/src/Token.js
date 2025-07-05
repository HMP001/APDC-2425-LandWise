// Helper function to decode JWT header (without verification)
function decodeJWTHeader(token) {
  try {
    const base64Url = token.split('.')[0];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

// Helper function to decode JWT payload (without verification)
function decodeJWTPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

// Helper function to validate ADC JWT format
function isValidADCJWT(header) {
  return header && header.typ === "ADC-JWT-Type" &&
    (header.alg === "HMAC-SHA256" || header.alg === "ECDSA");
}

// Main token function that can return different formats
export default function Token(format = 'raw') {
  const token = sessionStorage.getItem('authToken');
  if (!token) {
    throw new Error("No authentication token found.");
  }

  try {
    const parsedToken = JSON.parse(token);
    if (!parsedToken || !parsedToken.token) {
      throw new Error("Invalid token format.");
    }

    const rawToken = parsedToken.token;

    switch (format) {
      case 'tokenauth':
        // Return TokenAuth-like JSON object
        return {
          username: parsedToken.username || 'unknown',
          role: parsedToken.role || 'enduser',
          photo_url: parsedToken.photo_url || '',
          validateFrom: parsedToken.validateFrom || Date.now(),
          validateTo: parsedToken.validateTo || Date.now() + (2 * 60 * 60 * 1000), // 2 hours
          raw: rawToken
        };

      case 'jwt':
        // Check if the token is a JWT and decode it
        if (rawToken.includes('.') && rawToken.split('.').length === 3) {
          const header = decodeJWTHeader(rawToken);
          const payload = decodeJWTPayload(rawToken);

          if (header && payload) {
            // Check if it's an ADC JWT
            if (isValidADCJWT(header)) {
              return {
                // Header information
                tokenType: header.typ,
                algorithm: header.alg,
                reference: header.ref || '',

                // Payload claims (ADC specific)
                issuer: payload.issuer || '',
                jti: payload.jti || '', // unique token identifier
                username: payload.sub || 'unknown', // subject (UserID)
                role: payload.role || 'enduser',
                photo_url: payload.photo_url || payload.picture || '',
                issuedAt: payload.iat ? new Date(payload.iat * 1000) : null,
                expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
                notBefore: payload.nbt ? new Date(payload.nbt * 1000) : null,

                // Additional claims
                email: payload.email || '',
                name: payload.name || '',

                // Raw data
                header: header,
                payload: payload,
                raw: rawToken,

                // Utility methods
                getTimeInfo: function () {
                  return {
                    issuedAt: this.issuedAt,
                    expiresAt: this.expiresAt,
                    notBefore: this.notBefore,
                    // Time info for reference only - don't rely on client-side validation
                    clientTime: new Date(),
                    warning: "Time validation should be done server-side due to clock synchronization issues"
                  };
                },
                // Keep these for compatibility but mark as unreliable
                isExpired: function () {
                  console.warn("Client-side expiry check is unreliable due to time synchronization. Validate server-side.");
                  return this.expiresAt ? new Date() > this.expiresAt : false;
                },
                isValidTime: function () {
                  console.warn("Client-side time validation is unreliable due to time synchronization. Validate server-side.");
                  const now = new Date();
                  const afterNotBefore = !this.notBefore || now >= this.notBefore;
                  const beforeExpiry = !this.expiresAt || now < this.expiresAt;
                  return afterNotBefore && beforeExpiry;
                }
              };
            }

            // Standard JWT fallback
            return {
              username: payload.sub || payload.username || 'unknown',
              role: payload.role || payload.authorities || 'RU',
              photo_url: payload.photo_url || payload.picture || '',
              exp: payload.exp,
              iat: payload.iat,
              header: header,
              payload: payload,
              raw: rawToken
            };
          }
        }

        // Fallback to creating a JWT-like structure from sessionStorage data
        return {
          username: parsedToken.username || 'unknown',
          role: parsedToken.role || 'RU',
          photo_url: parsedToken.photo_url || '',
          raw: rawToken
        };

      case 'raw':
      default:
        return rawToken;
    }
  } catch (error) {
    console.error("Error parsing token:", error);
    throw new Error("Invalid authentication token.");
  }
}

// Export additional helper functions
export function getTokenAuth() {
  return Token('tokenauth');
}

export function getJWTToken() {
  try {
    return Token('jwt');
  } catch (error) {
    console.error("Error retrieving JWT token:", error);
    return {
      username: 'Visitor',
      role: 'VU',
      photo_url: '',
      raw: ''
    };
  }
}

export function getRawToken() {
  return Token('raw');
}

// ADC-specific JWT helper functions
export function getADCJWTInfo() {
  const jwtData = Token('jwt');
  if (jwtData.tokenType === "ADC-JWT-Type") {
    return jwtData;
  }
  return null;
}

export function isTokenValid() {
  console.warn("Client-side token validation is unreliable. Always validate tokens server-side.");
  try {
    const jwtData = Token('jwt');
    if (jwtData.isValidTime && typeof jwtData.isValidTime === 'function') {
      return jwtData.isValidTime();
    }
    // Fallback for non-ADC tokens
    if (jwtData.expiresAt) {
      return new Date() < jwtData.expiresAt;
    }
    return true; // Assume valid if no expiry info
  } catch (error) {
    return false;
  }
}

// Better approach: Check if token exists and has expected structure
export function hasValidTokenStructure() {
  try {
    const jwtData = Token('jwt');
    return !!(jwtData.username && jwtData.token);
  } catch (error) {
    return false;
  }
}

// Server-side validation helper
export function shouldValidateWithServer() {
  try {
    const jwtData = Token('jwt');
    // If we have time claims, suggest server validation
    return !!(jwtData.expiresAt || jwtData.notBefore || jwtData.issuedAt);
  } catch (error) {
    return true; // If we can't parse, definitely validate server-side
  }
}

export function getTokenClaims() {
  try {
    const jwtData = Token('jwt');
    return {
      issuer: jwtData.issuer,
      jti: jwtData.jti,
      username: jwtData.username,
      role: jwtData.role,
      photo_url: jwtData.photo_url,
      issuedAt: jwtData.issuedAt,
      expiresAt: jwtData.expiresAt,
      notBefore: jwtData.notBefore
    };
  } catch (error) {
    return null;
  }
}