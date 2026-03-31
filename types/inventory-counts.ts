export interface LocationCount {
  locationId: string | null;
  locationName: string;
  icon?: string | null;
  count: number;
}

export interface DestinationCount {
  destination: string | null;
  count: number;
}
