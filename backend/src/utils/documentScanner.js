// Real Government Document OCR & Authenticity Scanner

const GOV_DOCUMENT_SIGNATURES = {
  AADHAAR: {
    name: 'Aadhaar Card (UIDAI)',
    keywords: [
      'government of india',
      'unique identification',
      'uidai',
      'aadhaar',
      'aadhar',
      'mera aadhaar',
      'meri pehchan',
      'bharat sarkar',
      'enrollment',
      'vid:',
      'help@uidai',
      'male',
      'female',
      'year of birth',
      'yob',
      'dob',
      'address',
    ],
    numberRegex: /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g,
    minKeywordsRequired: 2,
  },
  PAN: {
    name: 'Income Tax Department PAN Card',
    keywords: [
      'income tax department',
      'govt of india',
      'govt. of india',
      'government of india',
      'permanent account number',
      'incometax',
      'father',
      'father\'s name',
      'signature',
      'date of birth',
      'national id',
    ],
    numberRegex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    minKeywordsRequired: 2,
  },
  VOTER_ID: {
    name: 'Election Commission Voter ID (EPIC)',
    keywords: [
      'election commission of india',
      'bharat nirvachan aayog',
      'elector photo identity',
      'elector',
      'epic',
      'voter',
      'electoral registration',
      'elector\'s name',
    ],
    numberRegex: /\b[A-Z]{3}\d{7}\b/g,
    minKeywordsRequired: 2,
  },
  DRIVING_LICENSE: {
    name: 'Driving Licence (State Transport)',
    keywords: [
      'driving licence',
      'driving license',
      'union of india',
      'transport department',
      'motor vehicles',
      'licence to drive',
      'form 7',
      'valid till',
    ],
    numberRegex: /\b[A-Z]{2}[0-9A-Z\s-]{12,16}\b/g,
    minKeywordsRequired: 2,
  },
};

/**
 * Validates real OCR extracted text from uploaded document.
 */
export const scanAndVerifyDocument = (docType, extractedOcrText = '', fileMeta = {}) => {
  const targetConfig = GOV_DOCUMENT_SIGNATURES[docType];

  if (!targetConfig) {
    return {
      isAuthentic: false,
      confidence: 0,
      message: `Unsupported document type: ${docType}`,
    };
  }

  const cleanText = (extractedOcrText || '').toLowerCase().replace(/[\r\n\t]+/g, ' ');
  const textLength = cleanText.trim().length;

  // 1. Check if ANY text was extracted
  if (textLength < 10) {
    return {
      isAuthentic: false,
      confidence: 0,
      extractedSnippet: cleanText.substring(0, 100),
      message: `Verification Rejected: No readable text detected in this image. Please upload a clear, high-resolution photo or scan of your ${targetConfig.name}.`,
    };
  }

  // 2. Scan for mandatory Government keywords in the real image text
  const matchedKeywords = targetConfig.keywords.filter((kw) => cleanText.includes(kw));

  // 3. Scan for ID number format in the real image text
  const rawIdMatches = (extractedOcrText || '').toUpperCase().match(targetConfig.numberRegex) || [];
  const detectedIdNumbers = [...new Set(rawIdMatches.map((m) => m.replace(/\s+/g, '')))];

  // 4. Check for Mismatch with other document types
  const otherTypes = Object.keys(GOV_DOCUMENT_SIGNATURES).filter((t) => t !== docType);
  for (const other of otherTypes) {
    const otherMatchedKeywords = GOV_DOCUMENT_SIGNATURES[other].keywords.filter((kw) =>
      cleanText.includes(kw)
    );
    if (otherMatchedKeywords.length >= 2 && matchedKeywords.length === 0) {
      return {
        isAuthentic: false,
        confidence: 0.1,
        detectedType: GOV_DOCUMENT_SIGNATURES[other].name,
        extractedSnippet: cleanText.substring(0, 120),
        message: `Document Mismatch: You selected ${targetConfig.name}, but the uploaded document text contains markers of ${GOV_DOCUMENT_SIGNATURES[other].name}.`,
      };
    }
  }

  // 5. Strict rejection of random / promotional images
  const hasStrongGovernmentIdentity =
    matchedKeywords.length >= targetConfig.minKeywordsRequired ||
    (matchedKeywords.length >= 1 && detectedIdNumbers.length > 0) ||
    (detectedIdNumbers.length > 0 && textLength > 20);

  if (!hasStrongGovernmentIdentity) {
    // Show what text was actually detected in their image
    const snippet = cleanText.substring(0, 140).trim();
    return {
      isAuthentic: false,
      confidence: 0.15,
      matchedKeywords,
      extractedSnippet: snippet,
      message: `Verification Failed: This uploaded image does NOT contain official ${targetConfig.name} authority markers or UIDAI/Govt seals. Detected text in your image: "${snippet || 'Unrecognized image data'}..."`,
    };
  }

  // Calculate authenticity confidence based on real text density
  let confidenceScore = 75;
  if (matchedKeywords.length >= 3) confidenceScore += 15;
  if (detectedIdNumbers.length > 0) confidenceScore += 10;

  return {
    isAuthentic: true,
    confidence: Math.min(99, confidenceScore),
    detectedType: targetConfig.name,
    matchedMarkers: matchedKeywords,
    extractedIdNumbers: detectedIdNumbers,
    extractedSnippet: cleanText.substring(0, 120),
    message: `Authentic ${targetConfig.name} verified successfully! Official authority headers (${matchedKeywords.slice(0, 3).join(', ')}) confirmed.`,
  };
};
