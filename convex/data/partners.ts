export type SeedPartner = {
  name: string;
  kind:
    | "industry"
    | "startup"
    | "msme"
    | "csr"
    | "research_lab"
    | "innovation_hub";
  sector: string;
  district: string;
};

export const SEED_PARTNERS: SeedPartner[] = [
  { name: "Ranchi Fabrication and Tooling Cluster", kind: "msme", sector: "Light engineering", district: "Ranchi" },
  { name: "Jamshedpur Steel Ancillary Consortium", kind: "industry", sector: "Metals and fabrication", district: "East Singhbhum" },
  { name: "Dhanbad Mining Services Group", kind: "industry", sector: "Mining and safety equipment", district: "Dhanbad" },
  { name: "Jharkhand Water Solutions", kind: "startup", sector: "Water treatment", district: "Ranchi" },
  { name: "Plateau AgriTech", kind: "startup", sector: "Agriculture technology", district: "Hazaribagh" },
  { name: "Chotanagpur Solar Works", kind: "msme", sector: "Renewable energy", district: "Ramgarh" },
  { name: "Coalfield Community Trust", kind: "csr", sector: "Corporate social responsibility", district: "Dhanbad" },
  { name: "Adivasi Livelihoods Foundation", kind: "csr", sector: "Rural livelihoods", district: "Khunti" },
  { name: "Jharkhand Public Health Lab Network", kind: "research_lab", sector: "Diagnostics and testing", district: "Ranchi" },
  { name: "Ranchi Innovation Hub", kind: "innovation_hub", sector: "Incubation and prototyping", district: "Ranchi" },
  { name: "Saranda Forest Produce Collective", kind: "msme", sector: "Non timber forest produce", district: "West Singhbhum" },
  { name: "Deoghar Cold Chain Services", kind: "msme", sector: "Post harvest storage", district: "Deoghar" },
];
