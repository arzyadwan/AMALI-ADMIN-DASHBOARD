import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCustomers, createCustomer, type Customer } from '../services/api';
import { Users, Search, UserPlus, Phone, ChevronRight } from 'lucide-react';

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();

  // New Customer Form State
  const [newCustomer, setNewCustomer] = useState({
    nik: '',
    name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    loadCustomers();
  }, [searchTerm]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCustomers(searchTerm);
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCustomer(newCustomer);
      alert('Customer berhasil ditambahkan!');
      setShowAddModal(false);
      setNewCustomer({ nik: '', name: '', phone: '', address: '' });
      loadCustomers();
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const message = Array.isArray(errorData) 
        ? errorData.map((e: any) => e.message).join(', ')
        : errorData || 'Gagal menambahkan customer';
      alert(message);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                DATABASE CUSTOMER
              </h1>
              <p className="text-gray-400 font-medium text-sm">Kelola profil dan riwayat kredit pelanggan Anda.</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95"
            >
              <UserPlus className="w-5 h-5" />
              TAMBAH CUSTOMER
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari berdasarkan Nama, NIK, atau Nomor Telepon..."
              className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kontak</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Alamat</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium">Memuat data...</td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium">Tidak ada customer ditemukan.</td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{c.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">NIK: {c.nik}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {c.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 line-clamp-1 max-w-xs">{c.address}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-white rounded-lg transition-colors">
                          <ChevronRight className="w-5 h-5 text-gray-300" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter">TAMBAH CUSTOMER BARU</h2>
              <p className="text-gray-400 text-sm font-medium">Lengkapi data identitas pelanggan.</p>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-8 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Nama Lengkap</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  placeholder="e.g., Budi Santoso"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">NIK (Nomor KTP)</label>
                <input
                  required
                  type="text"
                  maxLength={16}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                  placeholder="16 digit nomor KTP"
                  value={newCustomer.nik}
                  onChange={(e) => setNewCustomer({...newCustomer, nik: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Nomor Telepon</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  placeholder="e.g., 08123456789"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Alamat Tinggal</label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium resize-none"
                  placeholder="Alamat lengkap sesuai KTP..."
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 text-gray-400 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                >
                  BATAL
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                >
                  SIMPAN DATA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
