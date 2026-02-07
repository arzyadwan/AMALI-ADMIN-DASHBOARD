import React from 'react';
import { type Contract } from '../../services/api';

interface SalesInvoiceProps {
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

export const SalesInvoice = React.forwardRef<HTMLDivElement, SalesInvoiceProps>(({ contract }, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-black font-serif w-[148mm] min-h-[210mm] border border-gray-100">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold uppercase">Toko Elektronik Amali</h1>
        <p className="text-sm">Jl. Raya Amali No. 123, Kota Amali</p>
        <p className="text-sm">Telp: (021) 12345678 | WA: 0812-3456-7890</p>
        <div className="border-b-2 border-black my-4"></div>
        <h2 className="text-xl font-bold uppercase underline">Struk Belanja Kredit</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
        <div>
          <p><span className="font-bold">No. Kontrak:</span> #{contract.id}</p>
          <p><span className="font-bold">Tanggal:</span> {new Date(contract.start_date).toLocaleDateString('id-ID')}</p>
        </div>
        <div className="text-right">
          <p><span className="font-bold">Customer:</span> {contract.transaction.customer_name}</p>
          <p><span className="font-bold">Telepon:</span> {contract.transaction.customer_phone}</p>
        </div>
      </div>

      <table className="w-full border-collapse border border-black mb-8 text-sm">
        <thead>
          <tr className="bg-gray-100 italic">
            <th className="border border-black px-4 py-2 text-left">Deskripsi Produk</th>
            <th className="border border-black px-4 py-2 text-right">Harga</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black px-4 py-2">
              <p className="font-bold">{contract.transaction.product?.name || 'Kredit Produk'}</p>
              <p className="text-[10px] text-gray-500 italic uppercase">SKU: {contract.transaction.product?.sku || '-'}</p>
              <p className="text-[10px] italic text-gray-600 mt-1">Tenor {contract.tenor_months} Bulan - Terdaftar pada {new Date(contract.start_date).toLocaleDateString('id-ID')}</p>
            </td>
            <td className="border border-black px-4 py-2 text-right">
              {formatRupiah(contract.transaction.total_price)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-end mb-12">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between border-b border-black pb-1">
            <span>Harga Produk</span>
            <span className="font-bold">{formatRupiah(contract.transaction.total_price)}</span>
          </div>
          <div className="flex justify-between border-b border-black pb-1">
            <span>Uang Muka (DP)</span>
            <span className="font-bold">({formatRupiah(contract.transaction.dp_amount)})</span>
          </div>
          <div className="flex justify-between border-b border-black pb-1">
            <span>Pokok Hutang</span>
            <span className="font-bold">{formatRupiah(contract.principal_amount)}</span>
          </div>
          <div className="flex justify-between text-lg pt-2 italic">
            <span className="font-bold uppercase">Cicilan Pilihan</span>
            <span className="font-bold underline">{formatRupiah(contract.monthly_installment)} / bln</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 text-center text-sm">
        <div className="mt-20 border-t border-black pt-2">
          Customer
        </div>
        <div className="mt-20 border-t border-black pt-2">
          Kasir Toko
        </div>
      </div>

      <div className="mt-16 text-[10px] text-center italic border-t pt-2">
        "Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan. Simpan struk ini sebagai bukti pembayaran DP yang sah."
      </div>

      <style type="text/css" media="print">
        {`
          @page { size: A5 portrait; margin: 0; }
          body { background: white; -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        `}
      </style>
    </div>
  );
});

SalesInvoice.displayName = 'SalesInvoice';
