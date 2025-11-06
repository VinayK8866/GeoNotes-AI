
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationSuggestion {
  name: string;
  address: string;
  coordinates: Coordinates;
  placeType: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Note {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  category?: Category;
  location?: {
    name: string;
    coordinates: Coordinates;
  };
  created_at: string; // ISO string
  isArchived: boolean;
}
