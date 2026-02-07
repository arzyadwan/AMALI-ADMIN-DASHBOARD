// POSPage: Main dashboard for product selection and transaction processing
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  fetchProducts, 
  fetchSchemes,
  simulateCredit, 
  createTransaction, 
  fetchCustomers,
  createCustomer,
  type Product, 
  type SimulationResult,
  type LoanScheme,
  type Customer
} from '../services/api';
import { UserPlus, Users, X, Search, ShoppingBag, ReceiptText, ChevronRight, Info, LayoutGrid, Monitor, Sofa, Car, CreditCard, Calendar } from 'lucide-react';
import { PRODUCT_TYPES } from '../constants/productTypes';

// ============================================================================
// SCHEMA
// ============================================================================

const posSchema = z.object({
  productId: z.number().int().min(1, 'Pilih produk terlebih dahulu'),
  customerId: z.number().int().min(1, 'Pilih customer terlebih dahulu'),
  dp: z.number().min(0, 'DP tidak boleh negatif'),
  tenorMonths: z.number().int().min(1, 'Pilih tenor'),
  dueDateDay: z.number().int().min(1).max(31),
});

type POSFormData = z.infer<typeof posSchema>;

// ============================================================================
// HELPER: Format currency
// ============================================================================

function formatRupiah(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeScheme, setActiveScheme] = useState<LoanScheme | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSubCategory, setFilterSubCategory] = useState<string>('ALL');
  const [productSearch, setProductSearch] = useState('');
  const [simulation, setSimulation] = useState<SimulationResult['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<POSFormData>({
    resolver: zodResolver(posSchema),
    defaultValues: {
      productId: 0,
      customerId: 0,
      dp: 0,
      tenorMonths: 6,
      dueDateDay: 5,
    },
  });

  // Customer Search State
  const [customerSearch, setCustomerSearch] = useState('');
  const [matchingCustomers, setMatchingCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomerInState] = useState<Customer | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ nik: '', name: '', phone: '', address: '' });

  const watchedDp = watch('dp');
  const watchedTenor = watch('tenorMonths');

  // Load products and schemes on mount
  useEffect(() => {
    loadProducts();
    loadSchemes();
  }, []);

  const loadSchemes = async () => {
    try {
      const data = await fetchSchemes();
      if (data.length > 0) {
        setActiveScheme(data[0]); 
      }
    } catch (err) {
      console.error('Failed to load schemes');
    }
  };

  // Recalculate simulation when product, DP, or tenor changes
  useEffect(() => {
    if (selectedProduct && watchedTenor) {
      handleSimulate();
    }
  }, [selectedProduct, watchedDp, watchedTenor]);

  // Reload products when filters change
  useEffect(() => {
    loadProducts();
  }, [filterCategory, filterSubCategory]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const data = await fetchProducts(
        filterCategory === 'ALL' ? undefined : filterCategory,
        filterSubCategory === 'ALL' ? undefined : filterSubCategory
      );
      setProducts(data);
    } catch (err) {
      setError('Gagal mengambil daftar produk');
    } finally {
      setIsLoading(false);
    }
  };

  // Customer Selection Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (customerSearch.length >= 2 && !selectedCustomer) {
        searchCustomers();
      } else {
        setMatchingCustomers([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [customerSearch]);

  const searchCustomers = async () => {
    try {
      const data = await fetchCustomers(customerSearch);
      setMatchingCustomers(data);
    } catch (err) {
      console.error('Search failed');
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerInState(customer);
    setValue('customerId', customer.id);
    setCustomerSearch(customer.name);
    setMatchingCustomers([]);
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createCustomer(newCustomer);
      handleSelectCustomer(created);
      setShowAddCustomerModal(false);
      setNewCustomer({ nik: '', name: '', phone: '', address: '' });
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const message = Array.isArray(errorData) 
        ? errorData.map((e: any) => e.message).join(', ')
        : errorData || 'Gagal menambah customer';
      alert(message);
    }
  };

  const handleProductSelect = (product: Product) => {
    if (product.stock_qty < 1) return;
    setSelectedProduct(product);
    setValue('productId', product.id);
    const defaultDp = Math.ceil(parseFloat(product.base_price) * 0.1);
    setValue('dp', defaultDp);
    setSimulation(null);
  };

  const handleSimulate = async () => {
    if (!selectedProduct || !activeScheme) return;
    
    try {
      const result = await simulateCredit({
        price: parseFloat(selectedProduct.base_price),
        dp: watchedDp,
        schemeId: activeScheme.id,
        tenorMonths: watchedTenor,
      });

      if (result.success) {
        setSimulation(result.data);
      }
    } catch (err: any) {
      console.error('Simulation error:', err.response?.data?.error);
    }
  };

  const onSubmit = async (data: POSFormData) => {
    if (!selectedProduct) return;
    setIsProcessing(true);
    setError(null);

    try {
      const result = await createTransaction({
        ...data,
        price: parseFloat(selectedProduct.base_price),
        schemeId: activeScheme?.id || 0,
      });

      if (result.success) {
        alert(`Sukses! Transaksi ${result.data.contractId} berhasil dibuat.`);
        setSelectedProduct(null);
        setSelectedCustomerInState(null);
        setCustomerSearch('');
        reset();
        loadProducts(); // Refresh stock
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal memproses transaksi');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchCategory = filterCategory === 'ALL' || p.category === filterCategory;
    const matchSubCategory = filterSubCategory === 'ALL' || p.sub_category === filterSubCategory;
    const matchSearch = productSearch === '' || 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.sku.toLowerCase().includes(productSearch.toLowerCase());
    return matchCategory && matchSubCategory && matchSearch;
  });

  return (
    <div className="flex h-screen bg-slate-50 font-outfit overflow-hidden">
      
      
      {/* ================= LEFT COLUMN: CATALOG ================= */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header & Filter Section */}
        <header className="px-8 pt-8 pb-4 bg-slate-50 z-20">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Katalog Produk</h1>
              <p className="text-slate-500 font-medium">Kelola penjualan dan stok barang</p>
            </div>
            
            <div className="relative w-full xl:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text"
                placeholder="Cari nama barang atau SKU..."
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Main Category Pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'ALL', icon: LayoutGrid, label: 'Semua' },
                { id: 'ELECTRONIC', icon: Monitor, label: 'Elektronik' },
                { id: 'FURNITURE', icon: Sofa, label: 'Furniture' },
                { id: 'VEHICLE', icon: Car, label: 'Kendaraan' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setFilterCategory(cat.id);
                    setFilterSubCategory('ALL');
                  }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 border ${
                    filterCategory === cat.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sub Category Chips */}
            {filterCategory !== 'ALL' && (
              <div className="flex flex-wrap gap-2 p-1.5 animate-in slide-in-from-top-2 fade-in duration-200">
                <button
                  onClick={() => setFilterSubCategory('ALL')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filterSubCategory === 'ALL'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  SEMUA
                </button>
                {PRODUCT_TYPES[filterCategory as keyof typeof PRODUCT_TYPES].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterSubCategory(type)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors uppercase ${
                      filterSubCategory === type
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                        : 'text-slate-500 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Product Grid - Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-b-blue-600"></div>
              <p className="text-slate-400 font-medium text-sm">Memuat data produk...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 mt-10 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Produk Tidak Ditemukan</h3>
              <button 
                onClick={() => { setProductSearch(''); setFilterCategory('ALL'); }}
                className="mt-2 text-sm text-blue-600 font-bold hover:underline"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProductSelect(p)}
                  disabled={p.stock_qty < 1}
                  className={`group relative flex flex-col text-left bg-white rounded-3xl p-5 border-2 transition-all duration-300 hover:-translate-y-1 ${
                    selectedProduct?.id === p.id
                      ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-xl z-10'
                      : p.stock_qty < 1
                      ? 'border-slate-100 opacity-60 grayscale cursor-not-allowed'
                      : 'border-transparent shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:border-blue-200 hover:shadow-lg'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      p.category === 'ELECTRONIC' ? 'bg-amber-50 text-amber-700' : 
                      p.category === 'FURNITURE' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-purple-50 text-purple-700'
                    }`}>
                      {p.sub_category}
                    </span>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${
                      p.stock_qty < 5 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${p.stock_qty < 5 ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
                      Stok: {p.stock_qty}
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-800 leading-tight mb-1 line-clamp-2 group-hover:text-blue-700 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mb-6">{p.sku}</p>

                  <div className="mt-auto flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Harga Cash</p>
                      <p className="text-lg font-black text-slate-900">{formatRupiah(p.base_price)}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      selectedProduct?.id === p.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600'
                    }`}>
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>

                  {p.stock_qty < 1 && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-3xl flex items-center justify-center">
                      <span className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl transform -rotate-12">
                        Habis
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ================= RIGHT COLUMN: SIDEBAR POS ================= */}
      <aside className="w-[420px] bg-white border-l border-slate-100 shadow-2xl flex flex-col z-30">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-none">Keranjang</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {selectedProduct ? '1 Item Terpilih' : 'Menunggu Pilihan'}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!selectedProduct ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 pb-20">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <ShoppingBag className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-400">Pilih produk di sebelah kiri</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* 1. SELECTED PRODUCT CARD */}
              <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 blur-3xl opacity-20 -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">ITEM</p>
                      <h3 className="font-bold text-lg leading-tight">{selectedProduct.name}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-1">{selectedProduct.sku}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-slate-400">Rp</span>
                    <span className="text-2xl font-black tracking-tight">{formatRupiah(selectedProduct.base_price).replace('Rp', '')}</span>
                  </div>
                </div>
              </div>

              {/* 2. CUSTOMER SECTION */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Customer</span>
                </div>
                
                <div className="relative group">
                  <input 
                    type="text"
                    placeholder="Cari nama customer..."
                    className={`w-full pl-4 pr-12 py-3 bg-white border rounded-xl text-sm font-bold transition-all ${
                      selectedCustomer 
                        ? 'border-blue-500 text-blue-700 bg-blue-50/50' 
                        : 'border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      if (selectedCustomer) {
                        setSelectedCustomerInState(null);
                        setValue('customerId', 0);
                      }
                    }}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {selectedCustomer ? (
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => setShowAddCustomerModal(true)}
                        className="p-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Results */}
                  {matchingCustomers.length > 0 && !selectedCustomer && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-xl rounded-xl z-50 max-h-60 overflow-y-auto">
                      {matchingCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center gap-3 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-700">{c.name}</div>
                            <div className="text-[10px] text-slate-400">{c.phone}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.customerId && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.customerId.message}</p>}
              </div>

              {/* 3. PAYMENT SCHEME */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Pembayaran</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 ml-1">Uang Muka (DP)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                      <input 
                        type="number"
                        {...register('dp', { valueAsNumber: true })}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 ml-1">Tenor</label>
                    <div className="relative">
                      <select 
                        {...register('tenorMonths', { valueAsNumber: true })}
                        className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none text-sm"
                      >
                        {[3, 6, 9, 12, 15, 18, 24].map(t => (
                          <option key={t} value={t}>{t} Bulan</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. SIMULATION RESULT */}
              {simulation && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4 animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Estimasi Cicilan</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">
                       {activeScheme?.interest_rate.toString()}% Flat
                    </span>
                  </div>
                  
                  <div className="text-center py-2">
                    <p className="text-3xl font-black text-blue-600 tracking-tight">
                      {formatRupiah(simulation.simulation.monthlyInstallment)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                      Per Bulan x {watchedTenor}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                     <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <p className="text-[10px] text-slate-400">Total Pokok</p>
                        <p className="text-xs font-bold text-slate-700">{formatRupiah(simulation.simulation.principal)}</p>
                     </div>
                     <div className="bg-white p-2 rounded-lg border border-slate-100 text-right">
                        <p className="text-[10px] text-slate-400">Total Tagihan</p>
                        <p className="text-xs font-bold text-slate-900">{formatRupiah(simulation.simulation.totalLoan)}</p>
                     </div>
                  </div>
                </div>
              )}

              {/* ACTION BUTTON */}
              <div className="pt-2 sticky bottom-0 bg-white pb-6">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-b-white"></div>
                  ) : (
                    <>
                      <ReceiptText className="w-5 h-5" />
                      PROSES TRANSAKSI
                    </>
                  )}
                </button>
                
                {error && (
                  <div className="mt-3 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </aside>

      {/* ================= MODAL: QUICK ADD CUSTOMER ================= */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowAddCustomerModal(false)}></div>
          <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-lg">Customer Baru</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddCustomerSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">Nama Lengkap</label>
                <input
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">NIK (KTP)</label>
                <input
                  required
                  maxLength={16}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-mono"
                  value={newCustomer.nik}
                  onChange={(e) => setNewCustomer({...newCustomer, nik: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">Nomor Telepon</label>
                <input
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">Alamat Domisili</label>
                <textarea
                  required
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium resize-none"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                />
              </div>
              <button type="submit" className="w-full py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all shadow-lg mt-2">
                SIMPAN DATA
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}