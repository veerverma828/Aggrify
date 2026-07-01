const LOCATIONS = {
  meerut: {
    id: 'meerut',
    name: 'Meerut',
    lat: '28.9845',
    lng: '77.7064',
    pincode: '250001',
    city: 'Meerut',
    locality: 'Meerut Cantt',
    state: 'Uttar Pradesh',
    address: 'Meerut Cantt, Meerut, Uttar Pradesh 250001',
    supportedStores: ['blinkit', 'instamart']
  },
  bengaluru: {
    id: 'bengaluru',
    name: 'Bengaluru',
    lat: '12.9719',
    lng: '77.6412',
    pincode: '560038',
    city: 'Bengaluru',
    locality: 'Indiranagar',
    state: 'Karnataka',
    address: 'Indiranagar, Bengaluru, Karnataka 560038',
    supportedStores: ['blinkit', 'zepto', 'instamart']
  },
  delhi: {
    id: 'delhi',
    name: 'Delhi',
    lat: '28.6304',
    lng: '77.2177',
    pincode: '110001',
    city: 'New Delhi',
    locality: 'Connaught Place',
    state: 'Delhi',
    address: 'Connaught Place, New Delhi, Delhi 110001',
    supportedStores: ['blinkit', 'zepto', 'instamart']
  },
  mumbai: {
    id: 'mumbai',
    name: 'Mumbai',
    lat: '19.1136',
    lng: '72.8697',
    pincode: '400053',
    city: 'Mumbai',
    locality: 'Andheri West',
    state: 'Maharashtra',
    address: 'Andheri West, Mumbai, Maharashtra 400053',
    supportedStores: ['blinkit', 'zepto', 'instamart']
  },
  noida: {
    id: 'noida',
    name: 'Noida',
    lat: '28.6273',
    lng: '77.3725',
    pincode: '201301',
    city: 'Noida',
    locality: 'Sector 62',
    state: 'Uttar Pradesh',
    address: 'Sector 62, Noida, Uttar Pradesh 201301',
    supportedStores: ['blinkit', 'zepto', 'instamart']
  },
  gurugram: {
    id: 'gurugram',
    name: 'Gurugram',
    lat: '28.4901',
    lng: '77.0895',
    pincode: '122002',
    city: 'Gurugram',
    locality: 'DLF Phase 3',
    state: 'Haryana',
    address: 'DLF Phase 3, Gurugram, Haryana 122002',
    supportedStores: ['blinkit', 'zepto', 'instamart']
  }
};

const DEFAULT_LOCATION = LOCATIONS.meerut;

module.exports = {
  LOCATIONS,
  DEFAULT_LOCATION
};
