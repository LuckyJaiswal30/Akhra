export type SeedDepartment = {
  name: string;
  disciplines: string[];
  expertise: string[];
  facultyCount: number;
};

export type SeedUniversity = {
  name: string;
  shortName: string;
  district: string;
  type: string;
  hasInnovationCentre: boolean;
  hasIncubation: boolean;
  departments: SeedDepartment[];
};

export const INSTITUTIONS: SeedUniversity[] = [
  {
    name: "Birla Institute of Technology, Mesra",
    shortName: "BIT Mesra",
    district: "Ranchi",
    type: "Deemed university",
    hasInnovationCentre: true,
    hasIncubation: true,
    departments: [
      {
        name: "Civil and Environmental Engineering",
        disciplines: ["Civil engineering", "Environmental engineering"],
        expertise: [
          "drinking water treatment and purification",
          "groundwater contamination and arsenic removal",
          "rural sanitation and waste water",
          "road and bridge construction in hilly terrain",
          "flood control and drainage",
        ],
        facultyCount: 24,
      },
      {
        name: "Computer Science and Engineering",
        disciplines: ["Computer science"],
        expertise: [
          "machine learning and data analytics",
          "governance dashboards and digital public services",
          "internet of things sensor networks",
          "low bandwidth mobile applications for rural users",
        ],
        facultyCount: 31,
      },
      {
        name: "Electrical and Electronics Engineering",
        disciplines: ["Electrical engineering"],
        expertise: [
          "solar microgrids and off grid electrification",
          "rural power distribution and transformer faults",
          "energy storage and battery systems",
        ],
        facultyCount: 19,
      },
    ],
  },
  {
    name: "Indian Institute of Technology (Indian School of Mines), Dhanbad",
    shortName: "IIT ISM Dhanbad",
    district: "Dhanbad",
    type: "Institute of National Importance",
    hasInnovationCentre: true,
    hasIncubation: true,
    departments: [
      {
        name: "Environmental Science and Engineering",
        disciplines: ["Environmental engineering"],
        expertise: [
          "mine water pollution and acid drainage",
          "air quality and coal dust in mining belts",
          "land reclamation of overburden dumps",
          "industrial effluent treatment",
        ],
        facultyCount: 22,
      },
      {
        name: "Mining Engineering",
        disciplines: ["Mining engineering"],
        expertise: [
          "mine subsidence and ground stability",
          "coalfield fire control",
          "safety of workers in mining areas",
          "displacement and rehabilitation around mines",
        ],
        facultyCount: 28,
      },
      {
        name: "Applied Geology",
        disciplines: ["Geology"],
        expertise: [
          "groundwater mapping and aquifer studies",
          "borewell siting and water table decline",
          "soil and mineral surveys",
        ],
        facultyCount: 17,
      },
    ],
  },
  {
    name: "National Institute of Technology, Jamshedpur",
    shortName: "NIT Jamshedpur",
    district: "East Singhbhum",
    type: "Institute of National Importance",
    hasInnovationCentre: true,
    hasIncubation: true,
    departments: [
      {
        name: "Civil Engineering",
        disciplines: ["Civil engineering"],
        expertise: [
          "urban roads potholes and street drainage",
          "low cost housing and school building repair",
          "solid waste management in towns",
          "structural safety assessment",
        ],
        facultyCount: 21,
      },
      {
        name: "Computer Science and Engineering",
        disciplines: ["Computer science"],
        expertise: [
          "citizen grievance platforms",
          "computer vision for infrastructure inspection",
          "natural language processing for Indian languages",
        ],
        facultyCount: 26,
      },
      {
        name: "Production and Industrial Engineering",
        disciplines: ["Industrial engineering"],
        expertise: [
          "small scale manufacturing and MSME productivity",
          "supply chain for rural producers",
          "prototyping and fabrication",
        ],
        facultyCount: 18,
      },
    ],
  },
  {
    name: "Birsa Agricultural University, Kanke",
    shortName: "Birsa Agricultural University",
    district: "Ranchi",
    type: "State agricultural university",
    hasInnovationCentre: true,
    hasIncubation: true,
    departments: [
      {
        name: "Agronomy",
        disciplines: ["Agriculture"],
        expertise: [
          "rainfed and upland paddy cultivation",
          "crop failure and drought resilient varieties",
          "soil fertility and organic farming",
          "kharif and rabi cropping patterns in plateau soils",
        ],
        facultyCount: 20,
      },
      {
        name: "Plant Pathology and Entomology",
        disciplines: ["Agriculture", "Biology"],
        expertise: [
          "crop disease and pest outbreaks",
          "fungal infection in vegetables and pulses",
          "integrated pest management",
        ],
        facultyCount: 15,
      },
      {
        name: "Agricultural Engineering",
        disciplines: ["Agricultural engineering"],
        expertise: [
          "micro irrigation and lift irrigation",
          "watershed development and check dams",
          "farm mechanisation for smallholders",
          "post harvest storage and cold chain",
        ],
        facultyCount: 14,
      },
      {
        name: "Forestry",
        disciplines: ["Forestry"],
        expertise: [
          "non timber forest produce and tendu leaf livelihoods",
          "afforestation and degraded land restoration",
          "human wildlife conflict",
        ],
        facultyCount: 12,
      },
    ],
  },
  {
    name: "Central University of Jharkhand, Brambe",
    shortName: "Central University of Jharkhand",
    district: "Ranchi",
    type: "Central university",
    hasInnovationCentre: true,
    hasIncubation: false,
    departments: [
      {
        name: "Environmental Sciences",
        disciplines: ["Environmental science"],
        expertise: [
          "river and pond water quality",
          "biodiversity and forest cover loss",
          "climate adaptation in tribal regions",
        ],
        facultyCount: 13,
      },
      {
        name: "Tribal and Customary Law Studies",
        disciplines: ["Law", "Social science"],
        expertise: [
          "land records and tribal land alienation",
          "forest rights and community entitlements",
          "access to welfare schemes",
        ],
        facultyCount: 11,
      },
      {
        name: "Computer Science and Engineering",
        disciplines: ["Computer science"],
        expertise: [
          "language technology for Santhali Ho and Kurukh",
          "speech interfaces for low literacy users",
          "accessible interface design",
        ],
        facultyCount: 16,
      },
    ],
  },
  {
    name: "Ranchi University",
    shortName: "Ranchi University",
    district: "Ranchi",
    type: "State university",
    hasInnovationCentre: false,
    hasIncubation: false,
    departments: [
      {
        name: "Education",
        disciplines: ["Education"],
        expertise: [
          "school dropout and retention",
          "teacher shortage and training",
          "mid day meal and school infrastructure",
          "learning outcomes in government schools",
        ],
        facultyCount: 18,
      },
      {
        name: "Zoology and Public Health",
        disciplines: ["Life sciences", "Public health"],
        expertise: [
          "vector borne disease such as malaria and dengue",
          "water borne illness and sanitation",
          "malnutrition and anaemia",
        ],
        facultyCount: 15,
      },
      {
        name: "Geography",
        disciplines: ["Geography"],
        expertise: [
          "land use mapping and remote sensing",
          "settlement planning and connectivity",
          "migration and rural livelihoods",
        ],
        facultyCount: 12,
      },
    ],
  },
  {
    name: "BIT Sindri",
    shortName: "BIT Sindri",
    district: "Dhanbad",
    type: "Government engineering college",
    hasInnovationCentre: false,
    hasIncubation: false,
    departments: [
      {
        name: "Chemical Engineering",
        disciplines: ["Chemical engineering"],
        expertise: [
          "industrial pollution control",
          "fertiliser and chemical process safety",
          "waste to energy conversion",
        ],
        facultyCount: 14,
      },
      {
        name: "Mechanical Engineering",
        disciplines: ["Mechanical engineering"],
        expertise: [
          "handpump and borewell repair mechanisms",
          "low cost agricultural implements",
          "workshop fabrication and prototyping",
        ],
        facultyCount: 20,
      },
    ],
  },
  {
    name: "Vinoba Bhave University, Hazaribagh",
    shortName: "Vinoba Bhave University",
    district: "Hazaribagh",
    type: "State university",
    hasInnovationCentre: false,
    hasIncubation: false,
    departments: [
      {
        name: "Botany and Environmental Studies",
        disciplines: ["Life sciences"],
        expertise: [
          "medicinal plants and forest produce",
          "soil erosion and land degradation",
          "kitchen gardens and nutrition security",
        ],
        facultyCount: 13,
      },
      {
        name: "Social Work",
        disciplines: ["Social work"],
        expertise: [
          "self help groups and women's livelihoods",
          "community mobilisation",
          "delivery of government welfare schemes",
        ],
        facultyCount: 10,
      },
    ],
  },
  {
    name: "Kolhan University, Chaibasa",
    shortName: "Kolhan University",
    district: "West Singhbhum",
    type: "State university",
    hasInnovationCentre: false,
    hasIncubation: false,
    departments: [
      {
        name: "Rural Development",
        disciplines: ["Rural development"],
        expertise: [
          "employment guarantee works and rural wages",
          "village road and connectivity gaps",
          "drinking water supply schemes",
        ],
        facultyCount: 11,
      },
      {
        name: "Tribal Studies",
        disciplines: ["Anthropology", "Social science"],
        expertise: [
          "displacement and resettlement",
          "tribal language and cultural preservation",
          "traditional water harvesting practices",
        ],
        facultyCount: 9,
      },
    ],
  },
  {
    name: "Nilamber-Pitamber University, Medininagar",
    shortName: "Nilamber-Pitamber University",
    district: "Palamu",
    type: "State university",
    hasInnovationCentre: false,
    hasIncubation: false,
    departments: [
      {
        name: "Geology and Water Resources",
        disciplines: ["Geology"],
        expertise: [
          "drought and falling water tables",
          "dug wells and traditional water bodies",
          "rainwater harvesting structures",
        ],
        facultyCount: 10,
      },
      {
        name: "Commerce and Rural Enterprise",
        disciplines: ["Commerce", "Management"],
        expertise: [
          "market access for farmers and artisans",
          "micro enterprise and credit",
          "cooperative formation",
        ],
        facultyCount: 12,
      },
    ],
  },
  {
    name: "Sido Kanhu Murmu University, Dumka",
    shortName: "Sido Kanhu Murmu University",
    district: "Dumka",
    type: "State university",
    hasInnovationCentre: false,
    hasIncubation: false,
    departments: [
      {
        name: "Santhali Language and Literature",
        disciplines: ["Linguistics"],
        expertise: [
          "Santhali language documentation and Ol Chiki script",
          "translation of public information into tribal languages",
          "community radio and oral communication",
        ],
        facultyCount: 8,
      },
      {
        name: "Public Health and Nutrition",
        disciplines: ["Public health"],
        expertise: [
          "anganwadi and maternal health services",
          "child nutrition and stunting",
          "access to primary health centres",
        ],
        facultyCount: 11,
      },
    ],
  },
  {
    name: "Rajendra Institute of Medical Sciences, Ranchi",
    shortName: "RIMS Ranchi",
    district: "Ranchi",
    type: "Government medical institute",
    hasInnovationCentre: false,
    hasIncubation: false,
    departments: [
      {
        name: "Community Medicine",
        disciplines: ["Medicine", "Public health"],
        expertise: [
          "disease outbreaks and epidemiology",
          "health camps and referral gaps in remote blocks",
          "ambulance and emergency access",
          "sickle cell and endemic disease screening",
        ],
        facultyCount: 16,
      },
    ],
  },
  {
    name: "Xavier Institute of Social Service, Ranchi",
    shortName: "XISS Ranchi",
    district: "Ranchi",
    type: "Autonomous institute",
    hasInnovationCentre: false,
    hasIncubation: true,
    departments: [
      {
        name: "Rural Management",
        disciplines: ["Management", "Rural development"],
        expertise: [
          "farmer producer organisations",
          "livelihood programme design and evaluation",
          "CSR project implementation",
        ],
        facultyCount: 14,
      },
    ],
  },
  {
    name: "Jharkhand University of Technology, Ranchi",
    shortName: "Jharkhand University of Technology",
    district: "Ranchi",
    type: "State technical university",
    hasInnovationCentre: true,
    hasIncubation: false,
    departments: [
      {
        name: "Information Technology",
        disciplines: ["Information technology"],
        expertise: [
          "e governance systems and service delivery portals",
          "mobile applications for field workers",
          "data integration across departments",
        ],
        facultyCount: 15,
      },
      {
        name: "Electronics and Instrumentation",
        disciplines: ["Electronics"],
        expertise: [
          "low cost water quality sensors",
          "air and noise monitoring devices",
          "assistive devices for persons with disabilities",
        ],
        facultyCount: 12,
      },
    ],
  },
  {
    name: "Sarala Birla University, Ranchi",
    shortName: "Sarala Birla University",
    district: "Ranchi",
    type: "Private university",
    hasInnovationCentre: true,
    hasIncubation: true,
    departments: [
      {
        name: "Computer Applications",
        disciplines: ["Computer science"],
        expertise: [
          "web and mobile product development",
          "geographic information systems",
          "student led civic technology projects",
        ],
        facultyCount: 13,
      },
    ],
  },
];
