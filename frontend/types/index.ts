// Core domain types for the AP System

export interface Inspection {
  id: number;
  inspection_number: string;
  client: string;
  inspector: string;
  date: string;
  status: "pending" | "complete" | "failed" | "cancelled";
  commodity: string;
  location: string;
}

export interface Client {
  id: number;
  name: string;
  account_code: string;
  email: string;
  phone: string;
  active: boolean;
}

export interface Inspector {
  id: number;
  name: string;
  email: string;
  region: string;
}

export interface AnalyticsSummary {
  total_inspections: number;
  completed: number;
  pending: number;
  failed: number;
  period: string;
}

export interface SupportTicket {
  id: number;
  subject: string;
  status: "open" | "closed" | "pending";
  submitted_by: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
  count?: number;
  error?: string;
}
