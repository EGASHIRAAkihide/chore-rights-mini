export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          created_at: string | null;
          email: string | null;
          id: string;
          role: 'creator' | 'licensee' | 'admin' | null;
          wallet_address: string | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          id: string;
          role?: 'creator' | 'licensee' | 'admin' | null;
          wallet_address?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          role?: 'creator' | 'licensee' | 'admin' | null;
          wallet_address?: string | null;
        };
        Relationships: [];
      };
      works: {
        Row: {
          created_at: string | null;
          description: string | null;
          fingerprint_id: string | null;
          icc_code: string | null;
          id: string;
          metadata: Json | null;
          owner_id: string;
          status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | null;
          title: string;
          video_url: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          fingerprint_id?: string | null;
          icc_code?: string | null;
          id?: string;
          metadata?: Json | null;
          owner_id: string;
          status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | null;
          title: string;
          video_url?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          fingerprint_id?: string | null;
          icc_code?: string | null;
          id?: string;
          metadata?: Json | null;
          owner_id?: string;
          status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | null;
          title?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'works_owner_id_fkey';
            columns: ['owner_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      fingerprints: {
        Row: {
          algo: string;
          created_at: string | null;
          created_by: string | null;
          hash: string;
          id: string;
          work_id: string | null;
        };
        Insert: {
          algo: string;
          created_at?: string | null;
          created_by?: string | null;
          hash: string;
          id?: string;
          work_id?: string | null;
        };
        Update: {
          algo?: string;
          created_at?: string | null;
          created_by?: string | null;
          hash?: string;
          id?: string;
          work_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fingerprints_work_id_fkey';
            columns: ['work_id'];
            referencedRelation: 'works';
            referencedColumns: ['id'];
          },
        ];
      };
      license_requests: {
        Row: {
          created_at: string | null;
          id: string;
          request_data: Json;
          requester_id: string;
          status: 'PENDING' | 'APPROVED' | 'REJECTED';
          work_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          request_data: Json;
          requester_id: string;
          status?: 'PENDING' | 'APPROVED' | 'REJECTED';
          work_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          request_data?: Json;
          requester_id?: string;
          status?: 'PENDING' | 'APPROVED' | 'REJECTED';
          work_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'license_requests_work_id_fkey';
            columns: ['work_id'];
            referencedRelation: 'works';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'license_requests_requester_id_fkey';
            columns: ['requester_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      agreements: {
        Row: {
          created_at: string | null;
          creator_id: string;
          id: string;
          licensee_id: string;
          polygon_tx_hash: string | null;
          signed_at: string | null;
          status: 'DRAFT' | 'SIGNED' | 'FINALIZED';
          terms: Json;
          work_id: string;
        };
        Insert: {
          created_at?: string | null;
          creator_id: string;
          id?: string;
          licensee_id: string;
          polygon_tx_hash?: string | null;
          signed_at?: string | null;
          status?: 'DRAFT' | 'SIGNED' | 'FINALIZED';
          terms: Json;
          work_id: string;
        };
        Update: {
          created_at?: string | null;
          creator_id?: string;
          id?: string;
          licensee_id?: string;
          polygon_tx_hash?: string | null;
          signed_at?: string | null;
          status?: 'DRAFT' | 'SIGNED' | 'FINALIZED';
          terms?: Json;
          work_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agreements_work_id_fkey';
            columns: ['work_id'];
            referencedRelation: 'works';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          agreement_id: string;
          amount: number;
          created_at: string | null;
          currency: string;
          id: string;
          source: 'stripe' | 'test' | 'manual' | null;
          status: 'RECORDED' | 'DISTRIBUTED' | null;
        };
        Insert: {
          agreement_id: string;
          amount: number;
          created_at?: string | null;
          currency: string;
          id?: string;
          source?: 'stripe' | 'test' | 'manual' | null;
          status?: 'RECORDED' | 'DISTRIBUTED' | null;
        };
        Update: {
          agreement_id?: string;
          amount?: number;
          created_at?: string | null;
          currency?: string;
          id?: string;
          source?: 'stripe' | 'test' | 'manual' | null;
          status?: 'RECORDED' | 'DISTRIBUTED' | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_agreement_id_fkey';
            columns: ['agreement_id'];
            referencedRelation: 'agreements';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          created_at: string | null;
          id: string;
          kind: string;
          meta: Json | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          kind: string;
          meta?: Json | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          kind?: string;
          meta?: Json | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      kpi_daily: {
        Row: {
          agreements: number | null;
          ai_precision: number | null;
          api_uptime: number | null;
          day: string;
          license_requests: number | null;
          signup_users: number | null;
          updated_at: string | null;
          work_count: number | null;
        };
        Insert: {
          agreements?: number | null;
          ai_precision?: number | null;
          api_uptime?: number | null;
          day: string;
          license_requests?: number | null;
          signup_users?: number | null;
          updated_at?: string | null;
          work_count?: number | null;
        };
        Update: {
          agreements?: number | null;
          ai_precision?: number | null;
          api_uptime?: number | null;
          day?: string;
          license_requests?: number | null;
          signup_users?: number | null;
          updated_at?: string | null;
          work_count?: number | null;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      aggregate_kpi_daily: {
        Args: Record<string, never>;
        Returns: void;
      };
      create_work_with_icc: {
        Args: {
          payload: Json;
        };
        Returns: string;
      };
      log_event: {
        Args: {
          kind: string;
          meta?: Json;
        };
        Returns: void;
      };
    };
    Enums: {
      role: 'creator' | 'licensee' | 'admin';
    };
  };
}
