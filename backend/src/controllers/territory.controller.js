import FranchisePartner from '../models/FranchisePartner.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ACCOUNT_STATUS, FRANCHISE_TYPES } from '../config/constants.js';

// Comprehensive Indian States & Key Districts Directory
const INDIAN_TERRITORIES = {
  'Maharashtra': ['Mumbai City', 'Mumbai Suburban', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Satara', 'Ahmednagar', 'Jalgaon', 'Amravati', 'Nanded', 'Sangli', 'Latur', 'Dhule', 'Ratnagiri', 'Chandrapur', 'Parbhani', 'Beed', 'Yavatmal', 'Gondia', 'Wardha', 'Buldhana', 'Bhandara', 'Osmanabad', 'Nandurbar', 'Hingoli', 'Washim', 'Gadchiroli', 'Palghar', 'Raigad', 'Sindhudurg', 'Jalna', 'Akola'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Navsari', 'Morbi', 'Bharuch', 'Valsad', 'Porbandar', 'Mehsana', 'Patan', 'Amreli', 'Banaskantha', 'Sabarkantha', 'Kutch', 'Surendranagar', 'Panchmahal', 'Dahod', 'Kheda', 'Tapi', 'Narmada', 'Dang', 'Aravalli', 'Gir Somnath', 'Botad', 'Chhota Udaipur', 'Mahisagar', 'Devbhoomi Dwarka'],
  'Karnataka': ['Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Davanagere', 'Ballari', 'Vijayapura', 'Shivamogga', 'Tumakuru', 'Raichur', 'Bidar', 'Hosapete', 'Gadag', 'Udupi', 'Hassan', 'Bhadravati', 'Chitradurga', 'Kolar', 'Mandya', 'Chikkamagaluru', 'Bagalkote', 'Ramanagara', 'Karwar', 'Yadgir', 'Koppal', 'Chamarajanagara', 'Haveri', 'Kodagu', 'Chikkaballapura'],
  'Delhi': ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur Nagar', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Noida (Gautam Buddha Nagar)', 'Firozabad', 'Jhansi', 'Muzaffarnagar', 'Mathura', 'Budaun', 'Rampur', 'Shahjahanpur', 'Farrukhabad', 'Ayodhya', 'Hapur', 'Etawah', 'Mirzapur', 'Bulandshahr', 'Sambhal', 'Amroha', 'Hardoi', 'Fatehpur', 'Raebareli', 'Orai', 'Sitapur', 'Bahraich', 'Modinagar', 'Unnao', 'Jaunpur', 'Lakhimpur', 'Hathras', 'Banda', 'Pilibhit', 'Barabanki', 'Khurja', 'Gonda', 'Mainpuri', 'Lalitpur', 'Etah', 'Deoria', 'Badaun', 'Ghazipur', 'Sultanpur', 'Azamgarh', 'Bijnor', 'Sahaswan', 'Basti', 'Chandausi', 'Akbarpur', 'Ballia', 'Tanda', 'Greater Noida', 'Shikohabad', 'Shamli', 'Awagarh', 'Kasganj'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Murwara (Katni)', 'Singrauli', 'Burhanpur', 'Khandwa', 'Bhind', 'Chhindwara', 'Guna', 'Shivpuri', 'Vidisha', 'Chhatarpur', 'Damoh', 'Mandsaur', 'Khargone', 'Neemuch', 'Pithampur', 'Hoshangabad', 'Itarsi', 'Sehore', 'Morena', 'Betul', 'Seoni', 'Datia', 'Nagda'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Bharatpur', 'Sriganganagar', 'Sikar', 'Pali', 'Tonk', 'Kishangarh', 'Beawar', 'Hanumangarh', 'Dholpur', 'Gangapur City', 'Sawai Madhopur', 'Churu', 'Barmer', 'Makrana', 'Nagaur', 'Hindaun', 'Bhiwadi', 'Bundi', 'Sujangarh', 'Jhunjhunu', 'Chittorgarh'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Ranipet', 'Nagercoil', 'Thanjavur', 'Vellore', 'Kancheepuram', 'Erode', 'Tiruvannamalai', 'Pollachi', 'Rajapalayam', 'Sivakasi', 'Pudukkottai', 'Neyveli', 'Nagapattinam', 'Viluppuram', 'Tiruchengode', 'Vaniyambadi', 'Theni Allinagaram', 'Udhagamandalam', 'Arakkonam', 'Kumarapalayam', 'Karaikkudi', 'Avadi', 'Hosur', 'Ambur', 'Karaikudi'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet', 'Mancherial', 'Miryalaguda', 'Jagtial'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Kakinada', 'Rajahmundry', 'Kadapa', 'Tirupati', 'Anantapur', 'Vizianagaram', 'Eluru', 'Ongole', 'Nandyal', 'Machilipatnam', 'Adoni', 'Tenali', 'Proddatur', 'Chittoor', 'Hindupur', 'Bhimavaram', 'Madanapalle', 'Guntakal', 'Srikakulam', 'Dharmavaram', 'Gudivada', 'Narasaraopet', 'Tadipatri', 'Tadepalligudem', 'Amaravati'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Hoshiarpur', 'Mohali', 'Batala', 'Pathankot', 'Moga', 'Abohar', 'Malerkotla', 'Khanna', 'Muktsar', 'Barnala', 'Firozpur', 'Kapurthala', 'Phagwara'],
  'Haryana': ['Faridabad', 'Gurugram', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Jind', 'Thanesar', 'Kaithal', 'Rewari', 'Palwal'],
  'West Bengal': ['Kolkata', 'Howrah', 'Asansol', 'Siliguri', 'Durgapur', 'Bardhaman', 'Malda', 'Baharampur', 'Habra', 'Kharagpur', 'Shantipur', 'Dankuni', 'Dhulian', 'Ranaghat', 'Haldia', 'Raiganj', 'Krishnanagar', 'Nabadwip', 'Medinipur', 'Jalpaiguri', 'Balurghat', 'Basirhat', 'Bankura', 'Chakdaha', 'Darjeeling', 'Alipurduar', 'Purulia'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar', 'Munger', 'Chhapra', 'Danapur', 'Bettiah', 'Saharsa', 'Sasaram', 'Hajipur', 'Dehri', 'Siwan', 'Motihari', 'Nawada', 'Bagaha', 'Buxar', 'Kishanganj', 'Sitamarhi', 'Jamalpur', 'Jehanabad', 'Aurangabad'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Brahmapur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda', 'Jeypore'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Kollam', 'Thrissur', 'Kannur', 'Alappuzha', 'Kottayam', 'Palakkad', 'Manjeri', 'Thalassery', 'Ponnani'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar', 'Phusro', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar', 'Chirkunda'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Rajnandgaon', 'Raigarh', 'Jagdalpur', 'Ambikapur', 'Dhamtari', 'Mahasamund'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Palampur', 'Baddi', 'Nahan', 'Paonta Sahib', 'Sundarnagar', 'Kullu'],
  'Goa': ['North Goa', 'South Goa'],
};

// Get List of States
export const getStates = async (req, res) => {
  const states = Object.keys(INDIAN_TERRITORIES).sort();
  res.status(200).json(
    new ApiResponse(200, states, 'States retrieved successfully')
  );
};

// Get List of Districts for a State
export const getDistrictsByState = async (req, res) => {
  const { state } = req.query;
  if (!state) {
    return res.status(200).json(new ApiResponse(200, [], 'State parameter required'));
  }

  const districts = INDIAN_TERRITORIES[state] || ['Central', 'North', 'South', 'East', 'West'];
  res.status(200).json(
    new ApiResponse(200, districts.sort(), `Districts for ${state} retrieved`)
  );
};

// Get Territory Coverage & Active District Allocation Map
export const getTerritoryCoverage = async (req, res, next) => {
  try {
    const activeDistrictPartners = await FranchisePartner.find({
      franchiseType: FRANCHISE_TYPES.DISTRICT_FRANCHISE,
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
