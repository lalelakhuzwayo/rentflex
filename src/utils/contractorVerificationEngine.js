/**
 * RentFlex Contractor Verification Engine
 * Automated, secure, and reliable contractor verification system.
 */

/**
 * Validates South African 13-digit ID numbers using the Luhn Algorithm.
 * Format: YYMMDD SSSS CA Z
 * @param {string} idNumber 
 * @returns {{ valid: boolean, reason?: string, dateOfBirth?: string, gender?: string, citizenship?: string }}
 */
export function validateSouthAfricanID(idNumber) {
  if (!idNumber || typeof idNumber !== 'string') {
    return { valid: false, reason: 'ID number is required' };
  }

  const cleanID = idNumber.trim().replace(/\s+/g, '');

  if (!/^\d{13}$/.test(cleanID)) {
    return { valid: false, reason: 'SA ID number must be exactly 13 digits' };
  }

  // Extract DOB components
  const yy = cleanID.substring(0, 2);
  const mm = cleanID.substring(2, 4);
  const dd = cleanID.substring(4, 6);

  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);

  if (month < 1 || month > 12) {
    return { valid: false, reason: 'Invalid month in ID number' };
  }

  if (day < 1 || day > 31) {
    return { valid: false, reason: 'Invalid day of month in ID number' };
  }

  // Gender indicator: 0000-4999 = Female, 5000-9999 = Male
  const genderCode = parseInt(cleanID.substring(6, 10), 10);
  const gender = genderCode >= 5000 ? 'Male' : 'Female';

  // Citizenship indicator: 0 = SA Citizen, 1 = Permanent Resident
  const citizenshipCode = parseInt(cleanID.substring(10, 11), 10);
  const citizenship = citizenshipCode === 0 ? 'SA Citizen' : 'Permanent Resident';

  // Luhn Checksum Calculation
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let digit = parseInt(cleanID.charAt(i), 10);
    // Double every second digit from right to left (even indices in 0-indexed string from left)
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }

  if (sum % 10 !== 0) {
    return { valid: false, reason: 'ID checksum verification failed' };
  }

  return {
    valid: true,
    gender,
    citizenship,
    dateOfBirth: `${yy}-${mm}-${dd}`
  };
}

/**
 * Validates South African SARS Tax Reference Numbers.
 * SARS tax numbers are 10 digits starting with 0, 1, 2, 3 or 9.
 * @param {string} taxNumber 
 * @returns {boolean}
 */
export function validateTaxNumber(taxNumber) {
  if (!taxNumber) return false;
  const cleanTax = taxNumber.trim().replace(/\s+/g, '');
  return /^[0-39]\d{9}$/.test(cleanTax);
}

/**
 * Runs automated verification checks and calculates a verification score (0-100).
 * 
 * Scoring System:
 * - Valid SA ID Number (Luhn verified): +35 points
 * - Verified SA ID Document uploaded: +25 points
 * - Trade Certificate / License uploaded: +25 points
 * - Proof of Address uploaded: +15 points
 * 
 * Status Thresholds:
 * - Score >= 75: Automatically 'verified' (verified = true)
 * - Score 40-74: 'under_review' (manual fallback check available)
 * - Score < 40: 'pending' (requires document / detail submission)
 * 
 * @param {Object} contractor
 * @returns {Object} Verification results and metrics
 */
export function runAutomatedContractorVerification(contractor = {}) {
  const {
    id_number,
    tax_number,
    id_document_url,
    trade_certificate_url,
    proof_of_address_url,
  } = contractor;

  let score = 0;
  const breakdown = {
    idNumberValid: false,
    idDocumentProvided: false,
    tradeCertificateProvided: false,
    proofOfAddressProvided: false,
    taxNumberValid: false,
  };

  // 1. Check ID Number
  const idValidation = validateSouthAfricanID(id_number);
  if (idValidation.valid) {
    score += 35;
    breakdown.idNumberValid = true;
  }

  // 2. Check ID Document
  if (id_document_url && typeof id_document_url === 'string' && id_document_url.trim().length > 5) {
    score += 25;
    breakdown.idDocumentProvided = true;
  }

  // 3. Check Trade Certificate
  if (trade_certificate_url && typeof trade_certificate_url === 'string' && trade_certificate_url.trim().length > 5) {
    score += 25;
    breakdown.tradeCertificateProvided = true;
  }

  // 4. Check Proof of Address
  if (proof_of_address_url && typeof proof_of_address_url === 'string' && proof_of_address_url.trim().length > 5) {
    score += 15;
    breakdown.proofOfAddressProvided = true;
  }

  // Check optional tax number validity for breakdown details
  if (tax_number && validateTaxNumber(tax_number)) {
    breakdown.taxNumberValid = true;
  }

  // Determine status based on automated checks
  let status = 'pending';
  let verified = false;
  let idVerified = false;
  let tradeVerified = false;

  if (score >= 75) {
    status = 'verified';
    verified = true;
    idVerified = breakdown.idNumberValid && breakdown.idDocumentProvided;
    tradeVerified = breakdown.tradeCertificateProvided;
  } else if (score >= 40) {
    status = 'under_review';
    idVerified = breakdown.idNumberValid && breakdown.idDocumentProvided;
  }

  return {
    score,
    status,
    verified,
    idVerified,
    tradeVerified,
    breakdown,
    idValidation,
    verifiedAt: verified ? new Date().toISOString() : null,
  };
}
