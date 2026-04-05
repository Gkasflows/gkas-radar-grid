export interface Flight {
  id: string;
  from: {
    name: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  to: {
    name: string;
    coordinates: [number, number];
  };
}

export const MOCK_FLIGHTS: Flight[] = [
  {
    id: "flight-1",
    from: { name: "New York (JFK)", coordinates: [-73.7781, 40.6413] },
    to: { name: "London (LHR)", coordinates: [-0.4543, 51.4700] }
  },
  {
    id: "flight-2",
    from: { name: "San Francisco (SFO)", coordinates: [-122.3790, 37.6213] },
    to: { name: "Tokyo (NRT)", coordinates: [140.3929, 35.7720] }
  },
  {
    id: "flight-3",
    from: { name: "Dubai (DXB)", coordinates: [55.3644, 25.2532] },
    to: { name: "Sydney (SYD)", coordinates: [151.1772, -33.9399] }
  },
  {
    id: "flight-4",
    from: { name: "Paris (CDG)", coordinates: [2.5479, 49.0097] },
    to: { name: "Singapore (SIN)", coordinates: [103.9915, 1.3644] }
  },
  {
    id: "flight-5",
    from: { name: "Los Angeles (LAX)", coordinates: [-118.4085, 33.9416] },
    to: { name: "Auckland (AKL)", coordinates: [174.7906, -37.0082] }
  }
];
