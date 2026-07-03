export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: string;
        };
      };
      hubs: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          faith: string | null;
          neighborhood: string | null;
          address: string | null;
          lat: number | null;
          lng: number | null;
          functions: string[];
          status: string;
          verified: boolean;
          hours: string | null;
          phone: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          name: string;
          faith?: string | null;
          neighborhood?: string | null;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          functions?: string[];
          status?: string;
          verified?: boolean;
          hours?: string | null;
          phone?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          name?: string;
          faith?: string | null;
          neighborhood?: string | null;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          functions?: string[];
          status?: string;
          verified?: boolean;
          hours?: string | null;
          phone?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      is_mnipl_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      approve_hub: {
        Args: { hub_id: string };
        Returns: void;
      };
    };
  };
}
