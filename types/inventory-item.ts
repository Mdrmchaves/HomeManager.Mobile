export interface InventoryItem {
  id: string;
  householdId: string;
  name: string;
  description?: string;
  value?: number;
  photoUrl?: string;
  locationId?: string;
  locationName?: string;
  quantity?: number;
  destination?: string;
  ownerId?: string;
  /** Resolvido client-side a partir dos membros da casa — não vem da API */
  ownerName?: string;
  status?: 'active' | 'resolved';
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemRequest {
  householdId: string;
  name: string;
  description?: string;
  value?: number;
  photoUrl?: string;
  locationId?: string;
  quantity?: number;
  destination?: string;
  ownerId?: string;
}

export interface UpdateItemRequest {
  name?: string;
  description?: string;
  value?: number;
  photoUrl?: string;
  locationId?: string;
  quantity?: number;
  destination?: string;
  ownerId?: string;
}
