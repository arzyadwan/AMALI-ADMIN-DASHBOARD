import { useState, useEffect } from 'react';
import { fetchProducts, restockProduct, type Product } from '../services/api';
import { 
  Package, 
  Plus, 
  ArrowUpCircle, 
  AlertTriangle,
  Search,
  X
} from 'lucide-react';
import ProductForm from '../components/ProductForm';
import { PRODUCT_TYPES } from '../constants/productTypes';

// ============================================================================
// COMPONENT
// ============================================================================

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [restockId, setRestockId] = useState<number | null>(null);
  const [restockValue, setRestockValue] = useState(1);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterSubCategory, setFilterSubCategory] = useState<string>('');

  useEffect(() => {
    loadProducts();
  }, [filterCategory, filterSubCategory]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const data = await fetchProducts(
        filterCategory || undefined,
        filterSubCategory || undefined
      );
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockId) return;

    try {
      await restockProduct(restockId, restockValue);
      alert('Stok berhasil ditambahkan!');
      setRestockId(null);
      setRestockValue(1);
      loadProducts();
    } catch (err) {
      alert('Gagal menambah stok');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sub_category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatRupiah = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">Manajemen Inventaris</h1>
              <p className="text-gray-400 text-sm">Kelola stok barang dan data produk AMALI</p>
            </div>
            
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-sm shadow-blue-100 flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              TAMBAH PRODUK BARU
            </button>
          </header>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <Search className="w-5 h-5 text-gray-300" />
              <input 
                type="text" 
                placeholder="Cari SKU atau Nama Produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm font-medium text-gray-700"
              />
            </div>

            <div className="flex gap-2">
              <select 
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setFilterSubCategory('');
                }}
                className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 text-xs font-bold text-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">SEMUA KATEGORI</option>
                <option value="ELECTRONIC">ELEKTRONIK</option>
                <option value="FURNITURE">FURNITURE</option>
                <option value="VEHICLE">VEHICLE</option>
              </select>

              <select 
                value={filterSubCategory}
                onChange={(e) => setFilterSubCategory(e.target.value)}
                className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 text-xs font-bold text-gray-500 outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
                disabled={!filterCategory}
              >
                <option value="">SEMUA TIPE</option>
                {filterCategory && PRODUCT_TYPES[filterCategory as keyof typeof PRODUCT_TYPES].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              {(filterCategory || filterSubCategory || searchTerm) && (
                <button 
                  onClick={() => {
                    setFilterCategory('');
                    setFilterSubCategory('');
                    setSearchTerm('');
                  }}
                  className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-all"
                  title="Reset Filter"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <th className="px-6 py-4">Produk</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4">Stok</th>
                    <th className="px-6 py-4">Harga Modal</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.map((product) => (
                    <tr 
                      key={product.id} 
                      className={`hover:bg-gray-50/50 transition-colors ${product.stock_qty < 2 ? 'bg-red-50/30' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{product.name}</p>
                            <p className="text-[10px] font-mono text-gray-400">{product.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-gray-100 text-gray-500 w-fit">
                            {product.category}
                          </span>
                          <span className="text-[10px] font-bold text-blue-600">
                            {product.sub_category}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-sm ${product.stock_qty < 2 ? 'text-red-500' : 'text-gray-700'}`}>
                            {product.stock_qty}
                          </span>
                          {product.stock_qty < 2 && <AlertTriangle className="w-3 h-3 text-red-500" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-600 text-sm">
                        {formatRupiah(product.base_price)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setRestockId(product.id)}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1 ml-auto"
                        >
                          <ArrowUpCircle className="w-3 h-3" />
                          RESTOCK
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-800 tracking-tighter uppercase">📦 Tambah Inventaris</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <ProductForm 
                onSuccess={() => { setShowAddModal(false); loadProducts(); }} 
                onCancel={() => setShowAddModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Restock Prompt */}
      {restockId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 text-center">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-xs" onClick={() => setRestockId(null)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm">
            <ArrowUpCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tighter">Tambah Stok</h3>
            <p className="text-gray-400 text-sm mb-6">Berapa jumlah barang yang masuk ke gudang?</p>
            
            <form onSubmit={handleRestock}>
              <input 
                type="number" 
                min="1"
                autoFocus
                value={restockValue}
                onChange={(e) => setRestockValue(parseInt(e.target.value))}
                className="w-full h-16 text-center text-3xl font-black bg-gray-50 border-2 border-gray-100 rounded-2xl mb-6 focus:border-emerald-500 focus:bg-white transition-all outline-none"
              />
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setRestockId(null)}
                  className="flex-1 py-3 text-sm font-bold text-gray-400 hover:bg-gray-50 rounded-xl transition-all"
                >
                  BATAL
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 text-sm font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-sm shadow-emerald-100"
                >
                  KONFIRMASI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
