// Minimum requirements for account registration (creates INACTIVE account)
export const requiredByRoleToRegister = {
  SYSBO: ["username", "email", "pwd", "name", "phone1", "nif", "employer", "job", "address", "nationality", "residence", "postalCode", "cc", "emissionCC", "emissionLocalCC", "validityCC", "birthDate"],
  SMBO: ["username", "email", "pwd", "name", "phone1", "nif", "employer", "job", "address", "nationality", "residence", "postalCode", "cc", "emissionCC", "emissionLocalCC", "validityCC", "birthDate"],
  SGVBO: ["username", "email", "pwd", "name", "phone1", "nif", "employer", "job", "address", "nationality", "residence", "postalCode", "cc", "emissionCC", "emissionLocalCC", "validityCC", "birthDate"],
  SDVBO: ["username", "email", "pwd", "name", "phone1", "nif", "employer", "job", "address", "nationality", "residence", "postalCode", "cc", "emissionCC", "emissionLocalCC", "validityCC", "birthDate"],
  PRBO: ["username", "email", "pwd", "name", "phone1", "nif", "employer", "job", "address", "nationality", "residence", "postalCode", "cc", "emissionCC", "emissionLocalCC", "validityCC", "birthDate"],
  ADLU: ["username", "email", "pwd"], // Minimum for registration, others can be filled later
  PO: ["username", "email", "pwd", "name", "employer", "phone1"], // Includes PARTNER (employer)
  RU: ["username", "email", "pwd"] // Minimum for registration, others optional
};

// Requirements for account ACTIVATION (all fields needed to go from INACTIVE to ACTIVE)
export const requiredByRoleToActivate = {
  SYSBO: ["username", "email", "pwd", "name", "phone1", "nif", "employer", "job", "address", "nationality", "residence", "postalCode", "cc", "emissionCC", "emissionLocalCC", "validityCC", "birthDate"],
  SMBO: ["username", "email", "pwd", "name", "phone1", "nif", "employer", "job", "address", "nationality", "residence", "postalCode", "cc", "emissionCC", "emissionLocalCC", "validityCC", "birthDate"],
  SGVBO: ["username", "email", "pwd", "name", "phone1", "nif", "employer", "job", "address", "nationality", "residence", "postalCode", "cc", "emissionCC", "emissionLocalCC", "validityCC", "birthDate"],
  SDVBO: ["username", "email", "pwd", "name", "phone1", "nif", "employer", "job", "address", "nationality", "residence", "postalCode", "cc", "emissionCC", "emissionLocalCC", "validityCC", "birthDate"],
  PRBO: ["username", "email", "pwd", "name", "phone1", "nif", "employer", "job", "address", "nationality", "residence", "postalCode", "cc", "emissionCC", "emissionLocalCC", "validityCC", "birthDate"],
  ADLU: ["username", "email", "pwd", "name", "nationality", "residence", "address", "postalCode", "phone1", "nif", "cc", "emissionCC", "emissionLocalCC", "validityCC", "birthDate"],
  PO: ["username", "email", "pwd", "name", "employer", "phone1"], // Same as registration for PO
  RU: ["username", "email", "pwd", "name", "nationality", "residence", "address", "postalCode", "phone1"]
};


