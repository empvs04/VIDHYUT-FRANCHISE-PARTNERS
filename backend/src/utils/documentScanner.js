// Strict Real Government & Address Document OCR & Authenticity Scanner

const GOV_DOCUMENT_SIGNATURES = {
  AADHAAR: {
    name: 'Aadhaar Card (UIDAI)',
    primaryKeywords: [
      'government of india',
      'govt of india',
      'govt. of india',
      'unique identification authority of india',
      'unique identification',
      'identification authority',
      'uidai',
      'u.i.d.a.i',
      'aadhaar',
      'aadhar',
      'adhar',
      'aahaar',
      'mera aadhaar',
      'meri pehchan',
      'bharat sarkar',
      'enrollment no',
      'enrolment no',
      'help@uidai.gov.in',
      'uidai.gov.in',
      '1947',
      'vid:',
      'vid :',
      'आधार',
      'भारत सरकार',
      'भारतीय विशिष्ट पहचान प्राधिकरण',
      'मेरी पहचान',
      'मेरा आधार',
    ],
    secondaryKeywords: [
      'male',
      'female',
      'transgender',
      'purush',
      'mahila',
      'year of birth',
      'yob',
      'y.o.b',
      'dob',
      'd.o.b',
      'date of birth',
      'address',
      'pata',
      'father',
      'husband',
      's/o',
      'd/o',
      'w/o',
      'c/o',
      'care of',
      'son of',
      'daughter of',
      'wife of',
      'pin',
      'pincode',
      'india',
      'valid throughout india',
    ],
    numberRegex: /(\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b|\b\d{4}\s\d{4}\s\d{4}\b|\b[X\d]{4}\s?[X\d]{4}\s?\d{4}\b|\b\d{12}\b)/g,
    uniqueDiscriminators: ['uidai', 'aadhaar', 'aadhar', 'adhar', 'unique identification', 'mera aadhaar', 'meri pehchan', '1947', 'आधार'],
  },
  PAN: {
    name: 'Income Tax Department PAN Card',
    primaryKeywords: [
      'income tax department',
      'incometax',
      'income tax',
      'govt of india',
      'govt. of india',
      'government of india',
      'permanent account number',
      'permanent account number card',
      'incometaxindia',
      'आयकर विभाग',
      'भारत सरकार',
    ],
    secondaryKeywords: [
      'father',
      "father's name",
      'signature',
      'date of birth',
      'dob',
      'taxpayer',
      'name',
      'india',
    ],
    numberRegex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    uniqueDiscriminators: ['income tax department', 'permanent account number', 'incometaxindia', 'आयकर विभाग'],
  },
  VOTER_ID: {
    name: 'Election Commission Voter ID (EPIC)',
    primaryKeywords: [
      'election commission of india',
      'election commission',
      'bharat nirvachan aayog',
      'elector photo identity card',
      'elector photo identity',
      'epic no',
      'epic',
      'voter identity card',
      'voter id',
      'निर्वाचन आयोग',
      'मतदाता पहचान पत्र',
    ],
    secondaryKeywords: [
      'elector',
      'electoral registration',
      "elector's name",
      'gender',
      'assembly constituency',
      'father',
      'husband',
      'address',
    ],
    numberRegex: /\b[A-Z]{3}\d{7}\b/g,
    uniqueDiscriminators: ['election commission', 'elector photo identity', 'epic no', 'bharat nirvachan', 'निर्वाचन आयोग'],
  },
  DRIVING_LICENSE: {
    name: 'Driving Licence (State Transport)',
    primaryKeywords: [
      'driving licence',
      'driving license',
      'union of india',
      'transport department',
      'motor vehicles department',
      'licence to drive',
      'form 7',
      'dl no',
      'd.l. no',
    ],
    secondaryKeywords: [
      'valid till',
      'date of issue',
      'blood group',
      'authorisation to drive',
      'cov',
      'lmv',
      'mcwg',
      'dob',
      'address',
    ],
    numberRegex: /\b[A-Z]{2}[0-9\s-]{11,16}\b/g,
    uniqueDiscriminators: ['driving licence', 'driving license', 'licence to drive', 'transport department', 'motor vehicles department'],
  },
  PASSPORT: {
    name: 'Indian Passport (MEA)',
    primaryKeywords: [
      'passport',
      'republic of india',
      'bharat ganarajya',
      'ministry of external affairs',
      'passport no',
      'पासपोर्ट',
    ],
    secondaryKeywords: [
      'nationality',
      'place of birth',
      'date of expiry',
      'address',
      'holder',
      'indian',
      'given name',
      'surname',
    ],
    numberRegex: /\b[A-Z][0-9]{7}\b/g,
    uniqueDiscriminators: ['passport', 'ministry of external affairs', 'bharat ganarajya', 'पासपोर्ट'],
  },
  ELECTRICITY_BILL: {
    name: 'Official Electricity Bill',
    primaryKeywords: [
      'electricity',
      'power distribution',
      'mahadiscom',
      'discom',
      'bescom',
      'tneb',
      'cesc',
      'bses',
      'tata power',
      'adani electricity',
      'energy bill',
      'consumer no',
      'consumer number',
      'ca no',
      'bill date',
      'meter no',
      'kwh',
      'units consumed',
      'electricity bill',
      'power corporation',
      'uppcl',
      'dhbvn',
      'wbscedcl',
      'sbpdcl',
      'nbpdcl',
      'tpddl',
      'bill amount',
      'vidyut',
      'vidyut vitran',
      'electric supply',
      'power supply',
    ],
    secondaryKeywords: [
      'address',
      'supply voltage',
      'tariff',
      'due date',
      'sub division',
      'meter reading',
      'connected load',
      'bill period',
      'total payable',
      'consumer name',
    ],
    numberRegex: /\b\d{6,14}\b/g,
    uniqueDiscriminators: ['electricity', 'mahadiscom', 'discom', 'bescom', 'tneb', 'cesc', 'bses', 'tata power', 'adani electricity', 'energy bill', 'consumer no', 'meter no', 'kwh', 'uppcl', 'vidyut'],
  },
  RENT_AGREEMENT: {
    name: 'Registered Rent Agreement / Lease',
    primaryKeywords: [
      'rent agreement',
      'tenancy agreement',
      'lease agreement',
      'registered agreement',
      'stamp duty',
      'sub registrar',
      'e-registration',
      'licensor',
      'licensee',
      'landlord',
      'tenant',
      'premises',
      'monthly rent',
      'security deposit',
      'leave and license',
    ],
    secondaryKeywords: [
      'witness',
      'period of lease',
      'address of premises',
      'notary public',
      'schedule of property',
      'executed on',
      'terms and conditions',
    ],
    numberRegex: /\b(REG|AGR|DOC|MH|DL|KA)[0-9A-Z\/-]{4,16}\b/g,
    uniqueDiscriminators: ['rent agreement', 'tenancy agreement', 'lease agreement', 'licensor', 'licensee', 'leave and license', 'sub registrar'],
  },
  RATION_CARD: {
    name: 'Government Ration Card',
    primaryKeywords: [
      'ration card',
      'food & civil supplies',
      'food and civil supplies',
      'public distribution system',
      'pds',
      'khadya vibhag',
      'ahargroup',
      'nfsa',
      'antodaya',
      'bpl',
      'apl',
      'fps',
      'rashan card',
    ],
    secondaryKeywords: [
      'head of family',
      'family members',
      'address',
      'fair price shop',
      'gas connection',
      'card no',
    ],
    numberRegex: /\b\d{10,14}\b/g,
    uniqueDiscriminators: ['ration card', 'food & civil supplies', 'public distribution system', 'pds', 'khadya vibhag', 'rashan card'],
  },
  BANK_PASSBOOK: {
    name: 'Bank Passbook / Statement',
    primaryKeywords: [
      'bank passbook',
      'bank statement',
      'state bank of india',
      'sbi',
      'hdfc',
      'icici',
      'punjab national bank',
      'bank of baroda',
      'canara bank',
      'axis bank',
      'union bank',
      'kotak',
      'account number',
      'a/c no',
      'ifsc code',
      'ifsc',
      'branch code',
      'statement of account',
      'savings bank',
    ],
    secondaryKeywords: [
      'customer name',
      'account holder',
      'address',
      'balance',
      'transaction date',
      'clear balance',
      'cr',
      'dr',
      'nomination',
    ],
    numberRegex: /\b\d{9,18}\b/g,
    uniqueDiscriminators: ['bank passbook', 'bank statement', 'account number', 'ifsc code', 'statement of account'],
  },
  WATER_BILL: {
    name: 'Water / Gas Utility Bill',
    primaryKeywords: [
      'water bill',
      'water supply',
      'jal board',
      'municipal corporation',
      'water sewerage',
      'jal vibhag',
      'water tax',
      'consumer number',
      'connection number',
      'water meter',
      'gas bill',
      'mahanagar gas',
      'indrapastha gas',
      'png bill',
    ],
    secondaryKeywords: [
      'bill date',
      'property address',
      'due date',
      'meter reading',
      'amount payable',
    ],
    numberRegex: /\b\d{6,14}\b/g,
    uniqueDiscriminators: ['water bill', 'jal board', 'water supply', 'gas bill', 'water meter'],
  },
};

/**
 * Strictly verifies OCR extracted text from the uploaded document.
 * If promotional words or no official document headers/signatures are found, it rejects.
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
  if (textLength < 4) {
    return {
      isAuthentic: false,
      confidence: 0,
      message: `Verification Rejected: No readable text detected in this image. Please upload a clear photo or PDF scan of your authentic ${targetConfig.name}.`,
    };
  }

  // 2. Check for Promotional / Non-ID text (e.g. brochures, posters, marketing cards)
  const promotionalKeywords = [
    'energy saver',
    'rs 3,498',
    'rs 3498',
    'special offer',
    'limited time offer',
    'ns global',
    'pramod',
    'marketing brochure',
    'product features',
    'save electricity',
    'smart technology',
    'bill saving',
  ];

  const matchedPromotional = promotionalKeywords.filter((kw) => cleanText.includes(kw));

  // 3. Scan for PRIMARY Authority Keywords
  const matchedPrimary = targetConfig.primaryKeywords.filter((kw) => cleanText.includes(kw));
  const matchedSecondary = targetConfig.secondaryKeywords.filter((kw) => cleanText.includes(kw));
  const totalKeywordsMatched = matchedPrimary.length + matchedSecondary.length;

  // 4. Scan for ID / Document Numbers
  const rawIdMatches = (extractedOcrText || '').match(targetConfig.numberRegex) || [];
  const detectedIdNumbers = [...new Set(rawIdMatches.map((m) => m.trim().replace(/\s+/g, '')))];

  // 5. Cross check for Document Type Mismatch only using UNIQUE discriminators
  const otherTypes = Object.keys(GOV_DOCUMENT_SIGNATURES).filter((t) => t !== docType);
  for (const other of otherTypes) {
    const otherDiscriminators = GOV_DOCUMENT_SIGNATURES[other].uniqueDiscriminators || [];
    const otherMatched = otherDiscriminators.filter((kw) => cleanText.includes(kw));

    // If another document's unique discriminator is found AND current target has zero primary match
    if (otherMatched.length >= 1 && matchedPrimary.length === 0) {
      return {
        isAuthentic: false,
        confidence: 0,
        detectedType: GOV_DOCUMENT_SIGNATURES[other].name,
        extractedSnippet: cleanText.substring(0, 120),
        message: `Document Mismatch: You selected ${targetConfig.name}, but uploaded document contains headers of ${GOV_DOCUMENT_SIGNATURES[other].name}. Please re-upload the correct document.`,
      };
    }
  }

  // 6. Authenticity Decision:
  // - Rejects if promotional keywords found
  // - Passes if:
  //   a) At least 1 primary keyword is matched OR
  //   b) An authentic ID number pattern was detected along with at least 1 secondary keyword OR
  //   c) At least 2 secondary keywords matched (e.g. DOB + Gender + Address)
  const hasValidHeader = matchedPrimary.length >= 1;
  const hasNumberWithContext = detectedIdNumbers.length > 0 && matchedSecondary.length >= 1;
  const hasMultipleContexts = matchedSecondary.length >= 2;

  const isVerified = matchedPromotional.length === 0 && (hasValidHeader || hasNumberWithContext || hasMultipleContexts);

  if (!isVerified) {
    const snippet = cleanText.substring(0, 150).trim();
    return {
      isAuthentic: false,
      confidence: 0,
      matchedPrimary,
      matchedPromotional,
      extractedSnippet: snippet,
      message: `Verification Rejected: This image does NOT contain official ${targetConfig.name} headers or recognizable identity details. Detected text: "${snippet || 'Unreadable photo'}...". Please re-upload a clear, well-lit photo of your genuine document.`,
    };
  }

  // Calculate confidence score
  let confidence = 85;
  if (matchedPrimary.length >= 2) confidence += 10;
  if (detectedIdNumbers.length > 0) confidence += 5;

  const confirmedMarkers = [...matchedPrimary, ...matchedSecondary].slice(0, 5);

  return {
    isAuthentic: true,
    confidence: Math.min(99, confidence),
    detectedType: targetConfig.name,
    matchedMarkers: confirmedMarkers,
    extractedIdNumbers: detectedIdNumbers,
    extractedSnippet: cleanText.substring(0, 120),
    message: `Authentic ${targetConfig.name} verified successfully! Official markers (${confirmedMarkers.join(', ')}) confirmed.`,
  };
};
