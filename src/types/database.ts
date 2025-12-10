export type UserRole = 'admin' | 'atendente' | 'print_bridge';

export type OrderStatus = 'waiting_part' | 'quote' | 'in_progress' | 'delayed' | 'warranty' | 'completed' | 'delivered';

export type PasswordType = 'pattern' | 'pin' | 'password' | 'none';

export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'transfer';

export type PrintJobStatus = 'pending' | 'printing' | 'completed' | 'error';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  created_at: string;
}

export interface Model {
  id: string;
  brand_id: string;
  name: string;
  created_at: string;
  brand?: Brand;
}

export interface StockItem {
  id: string;
  name: string;
  code: string;
  quantity: number;
  min_quantity: number;
  cost_price: number;
  sell_price: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceOrder {
  id: string;
  order_number: string;
  client_id: string;
  brand_id: string;
  model_id: string;
  device_color: string;
  password_type: PasswordType;
  password_value?: string;
  status: OrderStatus;
  terms: string[];
  accessories: string;
  problem_description: string;
  possible_service: string;
  physical_condition: string;
  service_value: number;
  entry_value: number;
  remaining_value: number;
  payment_method?: PaymentMethod;
  entry_date: string;
  estimated_delivery: string;
  observations?: string;
  checklist_completed: boolean;
  checklist_type?: 'android' | 'ios';
  checklist_data?: Record<string, boolean>;
  created_by: string;
  updated_at: string;
  created_at: string;
  
  // Relations
  client?: Client;
  brand?: Brand;
  model?: Model;
  created_by_profile?: {
    id: string;
    full_name: string | null;
  };
  store?: {
    id: string;
    name: string;
  };
}

export interface CashTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  payment_method: PaymentMethod;
  service_order_id?: string;
  created_by: string;
  created_at: string;
}

export interface PrintJob {
  id: string;
  service_order_id: string;
  status: PrintJobStatus;
  printer_type: 'escpos' | 'escbema';
  error_message?: string;
  created_at: string;
  printed_at?: string;
  service_order?: ServiceOrder;
}
