// API Client with Axios
// Centralized HTTP client for backend communication

import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      alert('Tidak dapat terhubung ke server. Pastikan backend berjalan di localhost:3000');
    } else if (error.response) {
      // Server responded with error status
      const message = error.response.data?.error || 'Terjadi kesalahan';
      console.error('API Error:', message);
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// API FUNCTIONS
// ============================================================================

// Product types
export interface Product {
  id: number;
  sku: string;
  name: string;
  base_price: string;
  stock_qty: number;
  category: string;
  sub_category: string;
  attributes: any;
}

// Simulation types
export interface SimulationPayload {
  price: number;
  dp: number;
  schemeId: number;
  tenorMonths: number;
}

export interface SimulationResult {
  success: boolean;
  data: {
    simulation: {
      price: string;
      dp: string;
      principal: string;
      interestRate: string;
      interestAmount: string;
      totalLoan: string;
      monthlyInstallment: string;
      tenorMonths: number;
    };
    scheme: {
      id: number;
      name: string;
      interestRate: string;
      tenorOptions: number[];
    };
  };
}

// --- CRM / CUSTOMERS ---
export interface Customer {
  id: number;
  nik: string;
  name: string;
  phone: string;
  address: string;
  created_at: string;
}

export interface CustomerDetail {
  profile: Customer;
  history: Array<{
    id: number;
    date: string;
    total_price: string;
    status: string;
    contractId?: number;
    installments: Array<{
        nth: number;
        status: string;
        amount: string;
    }>;
  }>;
}

export async function fetchCustomers(query: string = ''): Promise<Customer[]> {
  const response = await api.get<{ success: boolean; data: Customer[] }>(`/customers?query=${query}`);
  return response.data.data;
}

export async function createCustomer(payload: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
  const response = await api.post<{ success: boolean; data: Customer }>('/customers', payload);
  return response.data.data;
}

export async function getCustomerHistory(id: number): Promise<{ profile: Customer; history: any[] }> {
  const response = await api.get<{ success: boolean; data: { profile: Customer; history: any[] } }>(`/customers/${id}`);
  return response.data.data;
}

// --- TRANSACTIONS ---

export interface CreateTransactionPayload {
  productId: number;
  customerId: number;
  dp: number;
  tenorMonths: number;
  dueDateDay: number;
  price: number;
  schemeId: number;
}

// Transaction types
export interface TransactionResult {
  success: boolean;
  message: string;
  data: {
    transactionId: number;
    contractId: number;
    customer: {
      name: string;
      phone: string;
    };
    product: {
      id: number;
      name: string;
      sku: string;
      remainingStock: number;
    };
    financials: {
      price: string;
      dp: string;
      principal: string;
      interestRate: string;
      interestAmount: string;
      totalLoan: string;
      monthlyInstallment: string;
      tenorMonths: number;
    };
    installmentCount: number;
    firstDueDate: string;
    lastDueDate: string;
  };
}

// ============================================================================
// API METHODS
// ============================================================================

export interface LoanScheme {
  id: number;
  name: string;
  interest_rate: string;
  min_dp_percent: string;
  tenor_options: number[];
  penalty_fee_daily: string;
}

export interface Transaction {
  id: number;
  customer_name: string;
  customer_phone: string;
  status: 'PENDING' | 'ACTIVE' | 'PAID' | 'VOID' | 'BAD_DEBT';
  total_price: string;
  dp_amount: string;
  created_at: string;
  product?: {
    id: number;
    name: string;
    sku: string;
    category: string;
    sub_category: string;
  };
}

export interface Installment {
  id: number;
  installment_nth: number;
  due_date: string;
  amount_due: string;
  amount_paid: string;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'LATE';
  paid_at: string | null;
}

export interface Contract {
  id: number;
  transaction_id: number;
  transaction: Transaction;
  principal_amount: string;
  total_interest: string;
  monthly_installment: string;
  start_date: string;
  due_date_day: number;
  tenor_months: number;
  installments: Installment[];
}

/**
 * Fetch products with optional filtering
 */
export async function fetchProducts(category?: string, subCategory?: string): Promise<Product[]> {
  console.log('📡 API Call: fetchProducts', { category, subCategory });
  const response = await api.get<{ success: boolean; data: Product[] }>('/products', {
    params: { category, sub_category: subCategory }
  });
  return response.data.data;
}

/**
 * Fetch all active loan schemes
 */
export async function fetchSchemes(): Promise<LoanScheme[]> {
  const response = await api.get<{ success: boolean; data: LoanScheme[] }>('/schemes');
  return response.data.data;
}

/**
 * Fetch all active credit contracts
 */
export async function fetchActiveContracts(): Promise<Contract[]> {
  const response = await api.get<{ success: boolean; data: Contract[] }>('/contracts/active');
  return response.data.data;
}

/**
 * Create a new product
 */
export async function createProduct(payload: any): Promise<Product> {
  const response = await api.post<{ success: boolean; data: Product }>('/products', payload);
  return response.data.data;
}

/**
 * Restock a product
 */
export async function restockProduct(productId: number, quantityToAdd: number): Promise<Product> {
  const response = await api.patch<{ success: boolean; data: Product }>(`/products/${productId}/stock`, {
    quantity_to_add: quantityToAdd
  });
  return response.data.data;
}

/**
 * Process payment for an installment
 */
export async function payInstallment(installmentId: number): Promise<{ success: boolean; message: string }> {
  const response = await api.post<{ success: boolean; message: string }>(`/installments/${installmentId}/pay`);
  return response.data;
}

/**
 * Simulate credit calculation
 */
export async function simulateCredit(payload: SimulationPayload): Promise<SimulationResult> {
  const response = await api.post<SimulationResult>('/transactions/simulate', payload);
  return response.data;
}

/**
 * Create a new credit transaction
 */
export async function createTransaction(payload: CreateTransactionPayload): Promise<TransactionResult> {
  const response = await api.post<TransactionResult>('/transactions', payload);
  return response.data;
}

export default api;
