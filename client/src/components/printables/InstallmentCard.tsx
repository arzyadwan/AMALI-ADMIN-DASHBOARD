import React from 'react';
import { type Contract } from '../../services/api';

interface InstallmentCardProps {
  contract: Contract;
}

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

export const InstallmentCard = React.forwardRef<HTMLDivElement, InstallmentCardProps>(({ contract }, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans w-[210mm] min-h-[148mm] border border-gray-100">
      <div className="flex justify-between items-start mb-6 border-b-4 border-black pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Kartu Angsuran Kredit</h1>
          <p className="text-sm font-bold text-gray-600 italic">AMALI-KREDIT: Buku Kendali Pembayaran</p>
        </div>
        <div className="text-right text-xs">
          <p className="font-bold">TOKO ELEKTRONIK AMALI</p>
          <p>Jl. Raya Amali No. 123</p>
          <p>Telp: (021) 12345678</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-32 font-bold">Nama Customer</span>
            <span>: {contract.transaction.customer_name}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-bold">No. Kontrak</span>
            <span className="font-mono">: #{contract.id.toString().padStart(6, '0')}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-bold">Mulai Kredit</span>
            <span>: {formatDate(contract.start_date)}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex">
            <span className="w-32 font-bold">Harga Barang</span>
            <span>: {formatRupiah(contract.transaction.total_price)}</span>
          </div>
          <div className="flex text-blue-800 italic">
            <span className="w-32 font-bold">Angsuran/Bulan</span>
            <span className="font-black text-lg">: {formatRupiah(contract.monthly_installment)}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-bold">Jatuh Tempo</span>
            <span>: Setiap Tanggal {contract.due_date_day}</span>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse border-2 border-black text-xs">
        <thead className="bg-gray-100 uppercase font-black text-center">
          <tr>
            <th className="border-2 border-black px-2 py-2 w-10">Ke</th>
            <th className="border-2 border-black px-2 py-2">Tgl Jatuh Tempo</th>
            <th className="border-2 border-black px-2 py-2">Jumlah Tagihan</th>
            <th className="border-2 border-black px-2 py-2">Status Pembayaran</th>
            <th className="border-2 border-black px-2 py-2 w-48">Paraf Admin & Stempel</th>
          </tr>
        </thead>
        <tbody>
          {contract.installments.map((inst) => (
            <tr key={inst.id} className="h-10">
              <td className="border border-black px-2 py-2 text-center font-bold">{inst.installment_nth}</td>
              <td className="border border-black px-2 py-2 text-center">{formatDate(inst.due_date)}</td>
              <td className="border border-black px-2 py-2 text-right font-bold">{formatRupiah(inst.amount_due)}</td>
              <td className="border border-black px-2 py-2 text-center italic">
                {inst.status === 'PAID' ? (
                  <span className="font-black text-emerald-700">LUNAS</span>
                ) : (
                  <span className="text-gray-300">Belum Bayar</span>
                )}
              </td>
              <td className="border border-black px-2 py-2 text-center text-[10px]">
                {inst.status === 'PAID' ? (
                  <div className="border border-emerald-500 rounded p-1 text-emerald-700 font-bold bg-emerald-50">
                    SAH - {formatDate(inst.paid_at || '')}
                  </div>
                ) : (
                  <div className="h-6 w-full border border-gray-100 border-dashed"></div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 grid grid-cols-2 gap-8 text-[10px] italic">
        <div>
          <p className="font-bold underline mb-1 italic">Perhatian:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Harap membawa kartu ini setiap melakukan pembayaran.</li>
            <li>Pembayaran melewati tanggal jatuh tempo dikenakan denda harian.</li>
            <li>Segala bentuk coretan tanpa paraf admin dianggap tidak sah.</li>
          </ul>
        </div>
        <div className="text-center">
          <p>Diterbitkan Oleh,</p>
          <div className="mt-12 border-t border-black w-32 mx-auto pt-1 font-bold">
            Direksi Amali
          </div>
        </div>
      </div>

      <style type="text/css" media="print">
        {`
          @page { size: A5 landscape; margin: 0; }
          body { background: white; -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        `}
      </style>
    </div>
  );
});

InstallmentCard.displayName = 'InstallmentCard';
