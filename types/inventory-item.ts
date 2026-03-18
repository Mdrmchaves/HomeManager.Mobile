export interface InventoryItem {
  id: string;
  householdId: string;
  name: string;
  description?: string;
  value?: number;
  photoUrl?: string;
  locationId?: string;
  locationName?: string;
  categoryId?: string;
  categoryName?: string;
  quantity?: number;
  destination?: string;
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
  categoryId?: string;
  quantity?: number;
  destination?: string;
}

export interface UpdateItemRequest {
  name?: string;
  description?: string;
  value?: number;
  photoUrl?: string;
  locationId?: string;
  categoryId?: string;
  quantity?: number;
  destination?: string;
}
