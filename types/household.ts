export interface HouseholdUser {
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
  householdUsers?: HouseholdUser[];
}
