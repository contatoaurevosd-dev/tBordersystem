export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          reference_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          reference_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          reference_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
          store_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          store_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_amount: number | null
          closing_observations: string | null
          id: string
          opened_at: string
          opened_by: string
          opening_amount: number
          opening_observations: string | null
          status: string
          store_id: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          closing_observations?: string | null
          id?: string
          opened_at?: string
          opened_by: string
          opening_amount?: number
          opening_observations?: string | null
          status?: string
          store_id?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          closing_observations?: string | null
          id?: string
          opened_at?: string
          opened_by?: string
          opening_amount?: number
          opening_observations?: string | null
          status?: string
          store_id?: string | null
        }
        Relationships: []
      }
      cash_transactions: {
        Row: {
          amount: number
          cash_session_id: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          payment_method: string
          service_order_id: string | null
          store_id: string | null
          type: string
        }
        Insert: {
          amount: number
          cash_session_id?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          payment_method: string
          service_order_id?: string | null
          store_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          cash_session_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          payment_method?: string
          service_order_id?: string | null
          store_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          phone: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          phone: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          phone?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          name: string
          store_id: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          name: string
          store_id?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          name?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "models_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs: {
        Row: {
          content: string
          created_at: string
          created_by: string
          error_message: string | null
          id: string
          printed_at: string | null
          printer_type: string
          service_order_id: string
          status: string
          store_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          error_message?: string | null
          id?: string
          printed_at?: string | null
          printer_type?: string
          service_order_id: string
          status?: string
          store_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          error_message?: string | null
          id?: string
          printed_at?: string | null
          printer_type?: string
          service_order_id?: string
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_jobs_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_orders: {
        Row: {
          accessories: string
          brand_id: string
          checklist_completed: boolean
          checklist_data: Json | null
          checklist_type: string | null
          client_id: string
          created_at: string
          created_by: string
          device_color: string
          entry_date: string
          entry_value: number
          estimated_delivery: string | null
          id: string
          linked_order_id: string | null
          model_id: string
          observations: string | null
          order_number: string
          password_type: string
          password_value: string | null
          payment_method: string | null
          physical_condition: string
          possible_service: string
          problem_description: string
          remaining_value: number
          service_value: number
          status: string
          store_id: string | null
          terms: string[] | null
          updated_at: string
        }
        Insert: {
          accessories?: string
          brand_id: string
          checklist_completed?: boolean
          checklist_data?: Json | null
          checklist_type?: string | null
          client_id: string
          created_at?: string
          created_by: string
          device_color?: string
          entry_date?: string
          entry_value?: number
          estimated_delivery?: string | null
          id?: string
          linked_order_id?: string | null
          model_id: string
          observations?: string | null
          order_number: string
          password_type?: string
          password_value?: string | null
          payment_method?: string | null
          physical_condition?: string
          possible_service?: string
          problem_description?: string
          remaining_value?: number
          service_value?: number
          status?: string
          store_id?: string | null
          terms?: string[] | null
          updated_at?: string
        }
        Update: {
          accessories?: string
          brand_id?: string
          checklist_completed?: boolean
          checklist_data?: Json | null
          checklist_type?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          device_color?: string
          entry_date?: string
          entry_value?: number
          estimated_delivery?: string | null
          id?: string
          linked_order_id?: string | null
          model_id?: string
          observations?: string | null
          order_number?: string
          password_type?: string
          password_value?: string | null
          payment_method?: string | null
          physical_condition?: string
          possible_service?: string
          problem_description?: string
          remaining_value?: number
          service_value?: number
          status?: string
          store_id?: string | null
          terms?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          code: string
          cost_price: number
          created_at: string
          id: string
          min_quantity: number
          name: string
          quantity: number
          sell_price: number
          updated_at: string
        }
        Insert: {
          code: string
          cost_price?: number
          created_at?: string
          id?: string
          min_quantity?: number
          name: string
          quantity?: number
          sell_price?: number
          updated_at?: string
        }
        Update: {
          code?: string
          cost_price?: number
          created_at?: string
          id?: string
          min_quantity?: number
          name?: string
          quantity?: number
          sell_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          store_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_store_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "atendente" | "print_bridge"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "atendente", "print_bridge"],
    },
  },
} as const
