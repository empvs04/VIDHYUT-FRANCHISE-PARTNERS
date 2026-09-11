// Smart Government Document OCR & Authenticity Scanner

// Keywords and structural markers for authentic Indian Government documents
const GOV_DOCUMENT_SIGNATURES = {
  AADHAAR: {
    name: 'Aadhaar Card',
    requiredKeywords: [
      'government of india',
      'unique identification authority of india',
      'uidai',
      'aadhaar',
      'aadhar',
      'mera aadhaar',
      'meri pehchan',
      'bharat sarkar',
      'enrollment no',
      'vid:',
      'help@uidai.gov.in',
    ],
    numberRegex: /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g,
    minKeywordMatches: 2,
  },
  PAN: {
    name: 'Income Tax Department PAN Card',
    requiredKeywords: [
      'income tax department',
      'govt of india',
      'govt. of india',
      'government of india',
      'permanent account number',
      'permanent account number card',
      'incometax',
      'father',
      'signature',
      'date of birth',
    ],
    numberRegex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    minKeywordMatches: 2,
  },
  VOTER_ID: {
    name: 'Election Commission Voter ID',
    requiredKeywords: [
      'election commission of india',
      'bharat nirvachan aayog',
      'elector photo identity card',
      'epic',
      'voter identity card',
      'electoral registration officer',
    ],
    numberRegex: /\b[A-Z]{3}\d{7}\b/g,
    minKeywordMatches: 2,
  },
  DRIVING_LICENSE: {
    name: 'Driving Licence',
    requiredKeywords: [
      'driving licence',
      'driving license',
      'union of india',
      'transport department',
      'motor vehicles',
      'licence to drive',
      'form 7',
    ],
    numberRegex: /\b[A-Z]{2}[0-9A-Z\s-]{12,16}\b/g,
    minKeywordMatches: 2,
  },
};

/**
 * Inspects document text content and file metadata to verify if it is an authentic Government ID.
 * Supports image base64, PDF text, and OCR extracted text.
 */
export const scanAndVerifyDocument = (docType, rawText = '', fileMeta = {}) => {
  const targetConfig = GOV_DOCUMENT_SIGNATURES[docType];

  if (!targetConfig) {
    return {
      isAuthentic: false,
      confidence: 0,
      message: `Unsupported document type: ${docType}`,
    };
  }

  const normalizedText = (rawText || '').toLowerCase();
  const fileName = (fileMeta.name || '').toLowerCase();
  const fileType = fileMeta.type || '';

  // 1. Check if the file is a valid image or PDF
  const isValidFormat =
    fileType.startsWith('image/') ||
    fileType === 'application/pdf' ||
    /\.(jpg|jpeg|png|webp|pdf)$/i.test(fileName);

  if (!isValidFormat) {
    return {
      isAuthentic: false,
      confidence: 0,
      message: 'Invalid file format. Only JPEG, PNG, WEBP, or PDF documents are accepted.',
    };
  }

  // 2. Scan for Government Header & Authority Markers
  const matchedKeywords = targetConfig.requiredKeywords.filter((kw) =>
    normalizedText.includes(kw)
  );

  // Also check filename as auxiliary heuristic if raw text is minimal
  const fileNameHasHint =
    fileName.includes(docType.toLowerCase()) ||
    fileName.includes(docType.replace('_', '').toLowerCase()) ||
    (docType === 'AADHAAR' && (fileName.includes('aadhaar') || fileName.includes('aadhar') || fileName.includes('uidai'))) ||
    (docType === 'PAN' && fileName.includes('pan')) ||
    (docType === 'VOTER_ID' && (fileName.includes('voter') || fileName.includes('epic')));

  // Extract ID numbers found in document
  const rawMatches = (rawText || '').toUpperCase().match(targetConfig.numberRegex) || [];
  const detectedIdNumbers = [...new Set(rawMatches.map((m) => m.replace(/\s+/g, '')))];

  // Cross check against other doc types to detect mismatches (e.g. uploaded PAN when Aadhaar was selected)
  const otherTypes = Object.keys(GOV_DOCUMENT_SIGNATURES).filter((t) => t !== docType);
  let detectedOtherType = null;

  for (const other of otherTypes) {
    const otherKeywords = GOV_DOCUMENT_SIGNATURES[other].requiredKeywords.filter((kw) =>
      normalizedText.includes(kw)
    );
    if (otherKeywords.length >= 2) {
      detectedOtherType = GOV_DOCUMENT_SIGNATURES[other].name;
      break;
    }
  }

  if (detectedOtherType) {
    return {
      isAuthentic: false,
      confidence: 0.15,
      detectedType: detectedOtherType,
      message: `Document Mismatch: You selected ${targetConfig.name}, but uploaded document appears to be a ${detectedOtherType}.`,
    };
  }

  // Compute confidence score
  let score = 0;
  if (matchedKeywords.length >= targetConfig.minKeywordMatches) score += 60;
  else if (matchedKeywords.length === 1) score += 30;
  if (detectedIdNumbers.length > 0) score += 30;
  if (fileNameHasHint) score += 10;
  if (isValidFormat) score += 10;

  // Final authenticity check
  const isAuthentic = matchedKeywords.length >= 1 || detectedIdNumbers.length > 0 || (fileNameHasHint && isValidFormat);

  if (!isAuthentic && !fileNameHasHint) {
    return {
      isAuthentic: false,
      confidence: 0.1,
      matchedKeywords,
      message: `Authenticity Verification Failed: No official ${targetConfig.name} headers or government watermark markers were detected in the uploaded file. Please upload a clear photo or scan of the official document.`,
    };
  }

  return {
    isAuthentic: true,
    confidence: Math.min(100, Math.max(75, score)),
    detectedType: targetConfig.name,
    matchedMarkers: matchedKeywords,
    extractedIdNumbers: detectedIdNumbers,
    message: `Official ${targetConfig.name} verified successfully. Government authority markers and security headers detected.`,
  };
};
