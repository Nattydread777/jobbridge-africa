import africaLocations from "./africaLocations";

const internationalLocations = [
  { country: "United States", cities: ["New York", "San Francisco", "Austin", "Seattle", "Remote"] },
  { country: "Canada", cities: ["Toronto", "Vancouver", "Montreal", "Remote"] },
  { country: "United Kingdom", cities: ["London", "Manchester", "Remote"] },
  { country: "Germany", cities: ["Berlin", "Munich", "Remote"] },
  { country: "France", cities: ["Paris", "Remote"] },
  { country: "Netherlands", cities: ["Amsterdam", "Remote"] },
  { country: "Ireland", cities: ["Dublin", "Remote"] },
  { country: "Spain", cities: ["Madrid", "Barcelona", "Remote"] },
  { country: "Portugal", cities: ["Lisbon", "Remote"] },
  { country: "Switzerland", cities: ["Zurich", "Geneva", "Remote"] },
  { country: "Sweden", cities: ["Stockholm", "Remote"] },
  { country: "Australia", cities: ["Sydney", "Melbourne", "Remote"] },
  { country: "Europe", cities: ["Remote"] },
  { country: "Asia-Pacific", cities: ["Remote"] },
];

const jobLocations = [...africaLocations, ...internationalLocations]
  .sort((left, right) => left.country.localeCompare(right.country));

export default jobLocations;
