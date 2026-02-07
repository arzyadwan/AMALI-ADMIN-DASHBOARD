import { useState, useEffect } from 'react';
import { 
  fetchActiveContracts, 
  payInstallment, 
  type Contract, 
  type Installment 
} from '../services/api';
import { 
  CheckCircle, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  CreditCard,
  User,
  Calendar,
  Printer,
  FileText
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { SalesInvoice } from '../components/printables/SalesInvoice';
import { InstallmentCard } from '../components/printables/InstallmentCard';

// ============================================================================
// COMPONENT
// ============================================================================

export default function Dashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Print Refs
  const invoiceRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);

  const handlePrintInvoice = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: 'Invoice-Sistem-Amali',
  });

  const handlePrintCard = useReactToPrint({
    contentRef: cardRef,
    documentTitle: 'Kartu-Angsuran-Amali',
  });

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setIsLoading(true);
      const data = await fetchActiveContracts();
      setContracts(data);
    } catch (err) {
      setError('Gagal mengambil data kontrak aktif');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = async (installment: Installment) => {
    if (!window.confirm(`Terima pembayaran angsuran ke-${installment.installment_nth} sebesar ${formatRupiah(installment.amount_due)}?`)) {
      return;
    }

    try {
      setIsPaying(installment.id);
      const result = await payInstallment(installment.id);
      if (result.success) {
        alert('Pembayaran berhasil dicatat!');
        loadContracts(); // Refresh data
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal memproses pembayaran');
    } finally {
      setIsPaying(null);
    }
  };

  const formatRupiah = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'LATE': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default: return <Calendar className="w-4 h-4 text-gray-400" />;
    }
  };

  const calculateRemaining = (contract: Contract) => {
    const total = parseFloat(contract.monthly_installment) * contract.tenor_months;
    const paid = contract.installments
      .filter(i => i.status === 'PAID')
      .reduce((acc, i) => acc + parseFloat(i.amount_due), 0);
    return total - paid;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <h1 className="text-2xl font-black text-gray-800">Buku Besar Piutang</h1>
            <p className="text-gray-500">Kelola angsuran dan monitoring piutang aktif customer</p>
          </header>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center border border-red-100">
              {error}
            </div>
          ) : contracts.length === 0 ? (
            <div className="bg-white p-20 rounded-2xl shadow-sm text-center border border-dashed border-gray-200">
              <CreditCard className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800">Belum Ada Kontrak Aktif</h3>
              <p className="text-gray-400">Silakan buat transaksi baru di menu Kasir POS.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Produk</th>
                    <th className="px-6 py-4">Total Pinjaman</th>
                    <th className="px-6 py-4">Sisa Hutang</th>
                    <th className="px-6 py-4">Tenor</th>
                    <th className="px-6 py-4">Jatuh Tempo</th>
                    <th className="px-6 py-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {contracts.map((contract) => (
                    <React.Fragment key={contract.id}>
                      <tr 
                        className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${expandedId === contract.id ? 'bg-blue-50/50' : ''}`}
                        onClick={() => setExpandedId(expandedId === contract.id ? null : contract.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">{contract.transaction.customer_name}</p>
                              <p className="text-[10px] text-gray-400">{contract.transaction.customer_phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-800 leading-tight">{contract.transaction.product?.name || 'N/A'}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{contract.transaction.product?.category} - {contract.transaction.product?.sub_category}</p>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-700">
                          {formatRupiah(parseFloat(contract.monthly_installment) * contract.tenor_months)}
                        </td>
                        <td className="px-6 py-4 font-bold text-blue-600">
                          {formatRupiah(calculateRemaining(contract))}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {contract.tenor_months} Bln
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-medium">
                          Tgl {contract.due_date_day}
                        </td>
                        <td className="px-6 py-4">
                          {expandedId === contract.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </td>
                      </tr>
                      {expandedId === contract.id && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50/30 px-6 py-6 border-b border-gray-100">
                            {/* Action Buttons */}
                            <div className="flex gap-3 mb-6">
                              <button 
                                onClick={() => handlePrintInvoice()}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                              >
                                <Printer className="w-4 h-4" />
                                CETAK STRUK DP
                              </button>
                              <button 
                                onClick={() => handlePrintCard()}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                              >
                                <FileText className="w-4 h-4" />
                                CETAK KARTU ANGSURAN
                              </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {contract.installments.map((inst) => (
                                <div 
                                  key={inst.id} 
                                  className={`p-4 rounded-xl border bg-white shadow-sm flex flex-col justify-between ${
                                    inst.status === 'PAID' ? 'border-emerald-100 opacity-80' : 'border-gray-200'
                                  }`}
                                >
                                  <div>
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Bulan Ke-{inst.installment_nth}</span>
                                      {getStatusIcon(inst.status)}
                                    </div>
                                    <p className="font-black text-gray-800">{formatRupiah(inst.amount_due)}</p>
                                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(inst.due_date)}
                                    </p>
                                  </div>
                                  
                                  <div className="mt-4">
                                    {inst.status === 'PAID' ? (
                                      <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                                        <CheckCircle className="w-4 h-4" />
                                        <span>DIBAYAR: {formatDate(inst.paid_at || '')}</span>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handlePay(inst); }}
                                        disabled={isPaying === inst.id}
                                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-blue-100"
                                      >
                                        {isPaying === inst.id ? '...' : 'BAYAR'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Hidden Printables */}
      <div className="hidden">
        {expandedId && contracts.find(c => c.id === expandedId) && (
          <>
            <SalesInvoice 
              ref={invoiceRef} 
              contract={contracts.find(c => c.id === expandedId)!} 
            />
            <InstallmentCard 
              ref={cardRef} 
              contract={contracts.find(c => c.id === expandedId)!} 
            />
          </>
        )}
      </div>
    </div>
  );
}

import React from 'react';
