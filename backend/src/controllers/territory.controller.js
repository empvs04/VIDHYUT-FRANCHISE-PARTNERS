import FranchisePartner from '../models/FranchisePartner.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ACCOUNT_STATUS, FRANCHISE_TYPES } from '../config/constants.js';

// Complete & Comprehensive Official Indian States and Districts Directory
const INDIAN_TERRITORIES = {
  'Andhra Pradesh': [
    'Alluri Sitharama Raju', 'Anakapalli', 'Ananthapuramu', 'Annamayya', 'Bapatla',
    'Chittoor', 'Dr. B.R. Ambedkar Konaseema', 'East Godavari', 'Eluru', 'Guntur',
    'Kakinada', 'Krishna', 'Kurnool', 'Nandyal', 'NTR', 'Palnadu',
    'Parvathipuram Manyam', 'Prakasam', 'Sri Potti Sriramulu Nellore', 'Sri Sathya Sai',
    'Srikakulam', 'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'
  ],
  'Arunachal Pradesh': [
    'Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Kamle',
    'Kra Daadi', 'Kurung Kumey', 'Lepa Rada', 'Lohit', 'Longding', 'Lower Dibang Valley',
    'Lower Siang', 'Lower Subansiri', 'Namsai', 'Pakke Kessang', 'Papum Pare', 'Shi Yomi',
    'Siang', 'Tawang', 'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang', 'Itanagar'
  ],
  'Assam': [
    'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo', 'Chirang',
    'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat',
    'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan (Guwahati)', 'Karbi Anglong',
    'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari',
    'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar', 'Tinsukia', 'Udalguri', 'West Karbi Anglong'
  ],
  'Bihar': [
    'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur (Arrah)',
    'Buxar', 'Darbhanga', 'East Champaran (Motihari)', 'Gaya', 'Gopalganj', 'Jamui',
    'Jehanabad', 'Kaimur (Bhabua)', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai',
    'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda (Bihar Sharif)', 'Nawada',
    'Patna', 'Purnia', 'Rohtas (Sasaram)', 'Saharsa', 'Samastipur', 'Saran (Chhapra)',
    'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali (Hajipur)', 'West Champaran (Bettiah)'
  ],
  'Chhattisgarh': [
    'Balod', 'Baloda Bazar', 'Balrampur', 'Bastar (Jagdalpur)', 'Bemetara', 'Bijapur',
    'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg (Bhilai)', 'Gariaband', 'Gaurela-Pendra-Marwahi',
    'Janjgir-Champa', 'Jashpur', 'Kabirdham (Kawardha)', 'Kanker', 'Khairagarh-Chhuikhadan-Gandai',
    'Kondagaon', 'Korba', 'Koriya', 'Mahasamund', 'Manendragarh-Chirmiri-Bharatpur',
    'Mohla-Manpur-Ambagarh Chowki', 'Mungeli', 'Narayanpur', 'Raigarh', 'Raipur',
    'Rajnandgaon', 'Sakti', 'Sarangarh-Bilaigarh', 'Sukma', 'Surajpur', 'Surguja (Ambikapur)'
  ],
  'Goa': [
    'North Goa (Panaji)', 'South Goa (Margao)'
  ],
  'Gujarat': [
    'Ahmedabad', 'Amreli', 'Anand', 'Aravalli (Modasa)', 'Banaskantha (Palanpur)',
    'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang (Ahwa)',
    'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath (Veraval)', 'Jamnagar', 'Junagadh',
    'Kheda (Nadiad)', 'Kutch (Bhuj)', 'Mahisagar (Lunawada)', 'Mehsana', 'Morbi',
    'Narmada (Rajpipla)', 'Navsari', 'Panchmahal (Godhra)', 'Patan', 'Porbandar',
    'Rajkot', 'Sabarkantha (Himmatnagar)', 'Surat', 'Surendranagar', 'Tapi (Vyara)',
    'Vadodara', 'Valsad'
  ],
  'Haryana': [
    'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram',
    'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh (Narnaul)',
    'Nuh (Mewat)', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa',
    'Sonipat', 'Yamunanagar'
  ],
  'Himachal Pradesh': [
    'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra (Dharamshala)', 'Kinnaur (Reckong Peo)',
    'Kullu', 'Lahaul and Spiti (Keylong)', 'Mandi', 'Shimla', 'Sirmaur (Nahan)',
    'Solan', 'Una'
  ],
  'Jharkhand': [
    'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum (Jamshedpur)',
    'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti',
    'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu (Daltonganj)', 'Ramgarh',
    'Ranchi', 'Sahibganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum (Chaibasa)'
  ],
  'Karnataka': [
    'Bagalkote', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar',
    'Chamarajanagara', 'Chikkaballapura', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada (Mangaluru)',
    'Davanagere', 'Dharwad (Hubballi)', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi (Gulbarga)',
    'Kodagu (Madikeri)', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara',
    'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada (Karwar)', 'Vijayanagara (Hosapete)',
    'Vijayapura (Bijapur)', 'Yadgir'
  ],
  'Kerala': [
    'Alappuzha', 'Ernakulam (Kochi)', 'Idukki (Painavu)', 'Kannur', 'Kasaragod',
    'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta',
    'Thiruvananthapuram', 'Thrissur', 'Wayanad (Kalpetta)'
  ],
  'Madhya Pradesh': [
    'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani',
    'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh',
    'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad (Narmadapuram)',
    'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Maihar',
    'Mandla', 'Mandsaur', 'Mauganj', 'Morena', 'Narsinghpur', 'Neemuch', 'Niwari',
    'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore',
    'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli',
    'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'
  ],
  'Maharashtra': [
    'Ahmednagar', 'Akola', 'Amravati', 'Chhatrapati Sambhajinagar (Aurangabad)', 'Beed',
    'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli',
    'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur',
    'Nanded', 'Nandurbar', 'Nashik', 'Dharashiv (Osmanabad)', 'Palghar', 'Parbhani',
    'Pune', 'Raigad (Alibag)', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg (Oros)',
    'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'
  ],
  'Manipur': [
    'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam',
    'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati', 'Tamenglong',
    'Tengnoupal', 'Thoubal', 'Ukhrul'
  ],
  'Meghalaya': [
    'Eastern West Khasi Hills', 'East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills (Shillong)',
    'North Garo Hills', 'Ri-Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills',
    'West Garo Hills (Tura)', 'West Jaintia Hills', 'West Khasi Hills'
  ],
  'Mizoram': [
    'Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib', 'Lawngtlai', 'Lunglei',
    'Mamit', 'Saitual', 'Serchhip', 'Siaha'
  ],
  'Nagaland': [
    'Chümoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon',
    'Niuland', 'Noklak', 'Peren', 'Phek', 'Shamator', 'Tseminyü', 'Tuensang', 'Wokha', 'Zünheboto'
  ],
  'Odisha': [
    'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack',
    'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam (Brahmapur)', 'Jagatsinghpur',
    'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar (Keonjhar)',
    'Khordha (Bhubaneswar)', 'Koraput', 'Malkangiri', 'Mayurbhanj (Baripada)', 'Nabarangpur',
    'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur (Sonepur)', 'Sundargarh (Rourkela)'
  ],
  'Punjab': [
    'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka',
    'Firozpur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana',
    'Malerkotla', 'Mansa', 'Moga', 'Sri Muktsar Sahib', 'Pathankot', 'Patiala',
    'Rupnagar (Ropar)', 'Sahibzada Ajit Singh Nagar (Mohali)', 'Sangrur', 'Shahid Bhagat Singh Nagar (Nawanshahr)',
    'Tarn Taran'
  ],
  'Rajasthan': [
    'Ajmer', 'Alwar', 'Anupgarh', 'Balotra', 'Banswara', 'Baran', 'Barmer', 'Beawar',
    'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa',
    'Deeg', 'Didwana-Kuchaman', 'Dholpur', 'Dudu', 'Gangapur City', 'Hanumangarh',
    'Jaipur', 'Jaipur Rural', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur',
    'Jodhpur Rural', 'Karauli', 'Kekri', 'Khairthal-Tijara', 'Kota', 'Kotputli-Behror',
    'Nagaur', 'Neem Ka Thana', 'Pali', 'Phalodi', 'Pratapgarh', 'Rajsamand', 'Salumbar',
    'Sanchore', 'Sawai Madhopur', 'Shahpura', 'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'
  ],
  'Sikkim': [
    'Gangtok', 'Gyalshing', 'Pakyong', 'Namchi', 'Mangan', 'Soreng'
  ],
  'Tamil Nadu': [
    'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
    'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram', 'Kanniyakumari (Nagercoil)',
    'Karur', 'Krishnagiri (Hosur)', 'Madurai', 'Mayiladuthurai', 'Nagapattinam',
    'Namakkal', 'Nilgiris (Ooty)', 'Perambalur', 'Pudukkottai', 'Ramanathapuram',
    'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi (Tuticorin)',
    'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai',
    'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'
  ],
  'Telangana': [
    'Adilabad', 'Bhadradri Kothagudem', 'Hanamkonda', 'Hyderabad', 'Jagtial', 'Jangaon',
    'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam',
    'Kumuram Bheem Asifabad', 'Mahabubabad', 'Mahbubnagar', 'Mancherial', 'Medak',
    'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal',
    'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Ranga Reddy', 'Sangareddy', 'Siddipet',
    'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'
  ],
  'Tripura': [
    'Dhalai (Ambassa)', 'Gomati (Udaipur)', 'Khowai', 'North Tripura (Dharmanagar)',
    'Sepahijala (Bishramganj)', 'South Tripura (Belonia)', 'Unakoti (Kailashahar)', 'West Tripura (Agartala)'
  ],
  'Uttar Pradesh': [
    'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya (Faizabad)',
    'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki',
    'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli',
    'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad',
    'Gautam Buddha Nagar (Noida)', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur',
    'Hapur', 'Hardoi', 'Hathras', 'Jalaun (Orai)', 'Jaunpur', 'Jhansi', 'Kannauj',
    'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kushinagar', 'Lakhimpur Kheri',
    'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau',
    'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh',
    'Prayagraj (Allahabad)', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar',
    'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra',
    'Sultanpur', 'Unnao', 'Varanasi'
  ],
  'Uttarakhand': [
    'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital (Haldwani)',
    'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar (Rudrapur)', 'Uttarkashi'
  ],
  'West Bengal': [
    'Alipurduar', 'Bankura', 'Birbhum (Suri)', 'Cooch Behar', 'Dakshin Dinajpur (Balurghat)',
    'Darjeeling', 'Hooghly (Chinsurah)', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong',
    'Kolkata', 'Malda', 'Murshidabad (Baharampur)', 'Nadia (Krishnanagar)', 'North 24 Parganas (Barasat)',
    'Paschim Bardhaman (Asansol)', 'Paschim Medinipur (Midnapore)', 'Purba Bardhaman',
    'Purba Medinipur (Tamluk)', 'Purulia', 'South 24 Parganas (Alipore)', 'Uttar Dinajpur (Raiganj)'
  ],
  // Union Territories
  'Delhi': [
    'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
    'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'
  ],
  'Jammu and Kashmir': [
    'Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu',
    'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri',
    'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'
  ],
  'Ladakh': [
    'Leh', 'Kargil'
  ],
  'Chandigarh': [
    'Chandigarh'
  ],
  'Dadra and Nagar Haveli and Daman and Diu': [
    'Dadra and Nagar Haveli (Silvassa)', 'Daman', 'Diu'
  ],
  'Puducherry': [
    'Puducherry', 'Karaikal', 'Mahe', 'Yanam'
  ],
  'Andaman and Nicobar Islands': [
    'Nicobar', 'North and Middle Andaman', 'South Andaman (Port Blair)'
  ],
  'Lakshadweep': [
    'Lakshadweep (Kavaratti)'
  ]
};

// Get List of States
export const getStates = async (req, res) => {
  const states = Object.keys(INDIAN_TERRITORIES).sort();
  res.status(200).json(
    new ApiResponse(200, states, 'Indian states retrieved successfully')
  );
};

// Get List of Districts for a State
export const getDistrictsByState = async (req, res) => {
  const { state } = req.query;
  if (!state) {
    return res.status(200).json(new ApiResponse(200, [], 'State parameter is required'));
  }

  // Exact or case-insensitive match
  const matchedKey = Object.keys(INDIAN_TERRITORIES).find(
    (k) => k.toLowerCase() === state.trim().toLowerCase()
  );

  const districts = matchedKey ? INDIAN_TERRITORIES[matchedKey] : [];
  res.status(200).json(
    new ApiResponse(200, districts.sort(), `Districts for ${state} retrieved successfully`)
  );
};

// Get Territory Coverage & Active District Allocation Map
export const getTerritoryCoverage = async (req, res, next) => {
  try {
    const activeDistrictPartners = await FranchisePartner.find({
      franchiseType: {
        $in: [
          FRANCHISE_TYPES.DISTRICT_FRANCHISE,
          FRANCHISE_TYPES.NON_EXCLUSIVE_DISTRICT,
          FRANCHISE_TYPES.STANDARD_EXCLUSIVE_DISTRICT,
          FRANCHISE_TYPES.PREMIUM_EXCLUSIVE_DISTRICT,
        ],
      },
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    }).select('franchiseId fullName state district mobileNumber email joiningDate');

    const stateFranchises = await FranchisePartner.find({
      franchiseType: FRANCHISE_TYPES.STATE_FRANCHISE,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    }).select('franchiseId fullName state mobileNumber email joiningDate');

    res.status(200).json(
      new ApiResponse(
        200,
        {
          activeDistrictPartners,
          stateFranchises,
          totalAllocatedDistricts: activeDistrictPartners.length,
          totalAllocatedStates: stateFranchises.length,
        },
        'Territory coverage data retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};
