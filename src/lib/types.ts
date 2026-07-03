export type HubFunction =
  | "warming"
  | "cooling"
  | "cleanair"
  | "food"
  | "charging"
  | "beds"
  | "rest";

export type HubStatus = "open" | "limited" | "full" | "closed";

export type UserRole = "resident" | "hub_admin" | "mnipl_admin";

export interface Hub {
  id: string;
  owner_id: string | null;
  name: string;
  faith: string | null;
  neighborhood: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  functions: HubFunction[];
  primary_function: HubFunction | null;
  status: HubStatus;
  verified: boolean;
  hours: string | null;
  phone: string | null;
  website: string | null;
  images: string[];
  note: string | null;
  // congregation profile Q&A (filled in by hub admin, editable by MNIPL)
  about: string | null;
  experience: string | null;
  languages: string | null;
  accessibility: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
}

export interface ProfileQuestion {
  key: "about" | "experience" | "languages" | "accessibility";
  question: string;
  placeholder: string;
  display_order: number;
}

export interface ManagedUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}
