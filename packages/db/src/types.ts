export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          role: 'creator' | 'licensee' | 'admin';
          wallet_address: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          role?: 'creator' | 'licensee' | 'admin';
          wallet_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          role?: 'creator' | 'licensee' | 'admin';
          wallet_address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      works: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          metadata: Json | null;
          icc_code: string;
          video_url: string | null;
          fingerprint_id: string | null;
          status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          metadata?: Json | null;
          icc_code: string;
          video_url?: string | null;
          fingerprint_id?: string | null;
          status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          metadata?: Json | null;
          icc_code?: string;
          video_url?: string | null;
          fingerprint_id?: string | null;
          status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'works_owner_id_fkey';
            columns: ['owner_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'works_fingerprint_id_fkey';
            columns: ['fingerprint_id'];
            referencedRelation: 'fingerprints';
            referencedColumns: ['id'];
          },
        ];
      };
      fingerprints: {
        Row: {
          id: string;
          algo: string;
          hash: string;
          work_id: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          algo: string;
          hash: string;
          work_id: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          algo?: string;
          hash?: string;
          work_id?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fingerprints_work_id_fkey';
            columns: ['work_id'];
            referencedRelation: 'works';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fingerprints_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      license_requests: {
        Row: {
          id: string;
          work_id: string;
          requester_id: string;
          request_data: Json;
          status: 'PENDING' | 'APPROVED' | 'REJECTED';
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          work_id: string;
          requester_id: string;
          request_data: Json;
          status?: 'PENDING' | 'APPROVED' | 'REJECTED';
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          work_id?: string;
          requester_id?: string;
          request_data?: Json;
          status?: 'PENDING' | 'APPROVED' | 'REJECTED';
          created_at?: string;
          updated_at?: string | null;
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
          id: string;
          work_id: string;
          creator_id: string;
          licensee_id: string;
          terms: Json;
          status: 'DRAFT' | 'SIGNED' | 'FINALIZED';
          polygon_tx_hash: string | null;
          signed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          work_id: string;
          creator_id: string;
          licensee_id: string;
          terms: Json;
          status?: 'DRAFT' | 'SIGNED' | 'FINALIZED';
          polygon_tx_hash?: string | null;
          signed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          work_id?: string;
          creator_id?: string;
          licensee_id?: string;
          terms?: Json;
          status?: 'DRAFT' | 'SIGNED' | 'FINALIZED';
          polygon_tx_hash?: string | null;
          signed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agreements_work_id_fkey';
            columns: ['work_id'];
            referencedRelation: 'works';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agreements_creator_id_fkey';
            columns: ['creator_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agreements_licensee_id_fkey';
            columns: ['licensee_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          agreement_id: string;
          amount: number;
          currency: string;
          source: 'stripe' | 'test' | 'manual';
          status: 'RECORDED' | 'DISTRIBUTED';
          created_at: string;
        };
        Insert: {
          id?: string;
          agreement_id: string;
          amount: number;
          currency: string;
          source?: 'stripe' | 'test' | 'manual';
          status?: 'RECORDED' | 'DISTRIBUTED';
          created_at?: string;
        };
        Update: {
          id?: string;
          agreement_id?: string;
          amount?: number;
          currency?: string;
          source?: 'stripe' | 'test' | 'manual';
          status?: 'RECORDED' | 'DISTRIBUTED';
          created_at?: string;
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
      receipts: {
        Row: {
          id: string;
          agreement_id: string;
          status: 'pending' | 'scheduled' | 'processing' | 'distributed' | 'paid' | 'failed';
          gross_amount: number;
          currency: string;
          meta: Json | null;
          payout_instructions: Json;
          created_at: string;
          distributed_at: string | null;
        };
        Insert: {
          id?: string;
          agreement_id: string;
          status?: 'pending' | 'scheduled' | 'processing' | 'distributed' | 'paid' | 'failed';
          gross_amount: number;
          currency?: string;
          meta?: Json | null;
          payout_instructions?: Json;
          created_at?: string;
          distributed_at?: string | null;
        };
        Update: {
          id?: string;
          agreement_id?: string;
          status?: 'pending' | 'scheduled' | 'processing' | 'distributed' | 'paid' | 'failed';
          gross_amount?: number;
          currency?: string;
          meta?: Json | null;
          payout_instructions?: Json;
          created_at?: string;
          distributed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'receipts_agreement_id_fkey';
            columns: ['agreement_id'];
            referencedRelation: 'agreements';
            referencedColumns: ['id'];
          },
        ];
      };
      payout_instructions: {
        Row: {
          id: string;
          receipt_id: string;
          agreement_id: string;
          party_user_id: string;
          currency: string;
          amount_cents: number;
          status: 'pending' | 'scheduled' | 'processing' | 'distributed' | 'paid' | 'failed';
          rounding_adjustment: boolean;
          rounding_cents: number;
          created_at: string;
          paid_at: string | null;
          txn_ref: string | null;
        };
        Insert: {
          id?: string;
          receipt_id: string;
          agreement_id: string;
          party_user_id: string;
          currency: string;
          amount_cents: number;
          status?: 'pending' | 'scheduled' | 'processing' | 'distributed' | 'paid' | 'failed';
          rounding_adjustment?: boolean;
          rounding_cents?: number;
          created_at?: string;
          paid_at?: string | null;
          txn_ref?: string | null;
        };
        Update: {
          id?: string;
          receipt_id?: string;
          agreement_id?: string;
          party_user_id?: string;
          currency?: string;
          amount_cents?: number;
          status?: 'pending' | 'scheduled' | 'processing' | 'distributed' | 'paid' | 'failed';
          rounding_adjustment?: boolean;
          rounding_cents?: number;
          created_at?: string;
          paid_at?: string | null;
          txn_ref?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payout_instructions_receipt_id_fkey';
            columns: ['receipt_id'];
            referencedRelation: 'receipts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payout_instructions_agreement_id_fkey';
            columns: ['agreement_id'];
            referencedRelation: 'agreements';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payout_instructions_party_user_id_fkey';
            columns: ['party_user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          id: string;
          user_id: string | null;
          kind: string;
          meta: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          kind: string;
          meta?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          kind?: string;
          meta?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      kpi_daily: {
        Row: {
          day: string;
          signup_users: number | null;
          work_count: number | null;
          license_requests: number | null;
          agreements: number | null;
          api_uptime: number | null;
          ai_precision: number | null;
          updated_at: string;
        };
        Insert: {
          day: string;
          signup_users?: number | null;
          work_count?: number | null;
          license_requests?: number | null;
          agreements?: number | null;
          api_uptime?: number | null;
          ai_precision?: number | null;
          updated_at?: string;
        };
        Update: {
          day?: string;
          signup_users?: number | null;
          work_count?: number | null;
          license_requests?: number | null;
          agreements?: number | null;
          api_uptime?: number | null;
          ai_precision?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      aggregate_kpi_daily: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      approve_license_request: {
        Args: {
          p_request_id: string;
          p_note?: string;
        };
        Returns: string;
      };
      create_work_with_icc: {
        Args: {
          payload: Json;
        };
        Returns: string;
      };
      distribute_receipt: {
        Args: {
          p_receipt_id: string;
          p_split?: Json;
        };
        Returns: Json;
      };
      log_event: {
        Args: {
          p_kind: string;
          p_meta?: Json;
        };
        Returns: void;
      };
    };
    Enums: {
      receipt_status: 'pending' | 'scheduled' | 'processing' | 'distributed' | 'paid' | 'failed';
    };
    CompositeTypes: {};
  };
}
