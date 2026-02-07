import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCustomerHistory, type CustomerDetail } from '../services/api';
import { 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  Calendar, 
  AlertCircle,
  ChevronLeft,
  TrendingUp,
  History
} from 'lucide-react';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) loadData(parseInt(id));
  }, [id]);

  const loadData = async (customerId: number) => {
    try {
      const result = await getCustomerHistory(customerId);
      setData(result as any);
    } catch (err) {
      console.error('Failed to load customer history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(val));
  };

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!data) return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-400">
      <AlertCircle className="w-16 h-16 mb-4" />
      <p className="font-bold">Customer tidak ditemukan</p>
      <Link to="/customers" className="mt-4 text-blue-600 font-bold hover:underline">Kembali ke Daftar</Link>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full p-6">
        {/* Back Button */}
        <Link to="/customers" className="flex items-center gap-2 text-gray-400 hover:text-gray-600 font-bold text-xs mb-6 transition-all">
          <ChevronLeft className="w-4 h-4" />
          KEMBALI KE DAFTAR
        </Link>

        {/* Top Profile Card */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="bg-blue-600 p-8 text-white flex justify-between items-start">
            <div className="flex gap-6 items-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter uppercase">{data.profile.name}</h1>
                <p className="opacity-70 font-mono text-sm tracking-widest">NIK: {data.profile.nik}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20 inline-block mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest block opacity-60">Status Skor</span>
                <span className="text-sm font-bold">SILVER CUSTOMER</span>
              </div>
            </div>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gray-50 rounded-2xl">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Telepon</label>
                <p className="font-bold text-gray-800">{data.profile.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 md:col-span-2">
              <div className="p-3 bg-gray-50 rounded-2xl">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Alamat Domisili</label>
                <p className="font-bold text-gray-800">{data.profile.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-2xl">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase block">Total Belanja</span>
                    <span className="text-lg font-black">{data.history.length} Transaksi</span>
                </div>
            </div>
            {/* Dynamic summary would go here */}
        </div>

        {/* History Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <History className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-black text-gray-800 tracking-tighter">RIWAYAT TRANSAKSI</h2>
          </div>

          {data.history.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-[32px] border border-gray-100 text-gray-400 font-medium">
              Belum ada transaksi dilakukan.
            </div>
          ) : (
            data.history.map((t) => (
              <div key={t.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all p-6 group">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${t.status === 'PAID' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                      <CreditCard className={`w-6 h-6 ${t.status === 'PAID' ? 'text-emerald-600' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-gray-800 uppercase tracking-tight">KONTRAK #{t.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          t.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 
                          t.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {t.status === 'PAID' ? 'LUNAS' : t.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-black text-gray-900 mb-1">{formatCurrency(t.total_price)}</p>
                    <div className="flex items-center gap-2 justify-end">
                      {t.installments.map((ins, idx) => (
                        <div 
                          key={idx} 
                          title={`Cicilan ke-${ins.nth}: ${ins.status}`}
                          className={`w-2 h-2 rounded-full ${
                            ins.status === 'PAID' ? 'bg-emerald-500' : 'bg-gray-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
