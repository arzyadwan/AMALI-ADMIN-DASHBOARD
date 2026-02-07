// CreditSimulator: Interactive credit calculation component
// Calculates monthly installments based on price, DP, and tenor

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { simulateCredit, type SimulationResult } from '../services/api';

// ============================================================================
// SCHEMA
// ============================================================================

const simulationSchema = z.object({
  price: z.number().min(100000, 'Harga minimal Rp 100.000'),
  dp: z.number().min(0, 'DP tidak boleh negatif'),
  tenorMonths: z.number().int().min(1, 'Tenor harus dipilih'),
});

type SimulationFormData = z.infer<typeof simulationSchema>;

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

export default function CreditSimulator() {
  const [result, setResult] = useState<SimulationResult['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hardcoded tenor options (will fetch from LoanScheme later)
  const tenorOptions = [3, 6, 9, 12];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SimulationFormData>({
    resolver: zodResolver(simulationSchema),
    defaultValues: {
      price: 4500000,
      dp: 500000,
      tenorMonths: 6,
    },
  });

  const watchedPrice = watch('price');
  const watchedDp = watch('dp');

  // Calculate DP percentage for display
  const dpPercentage = watchedPrice > 0 
    ? ((watchedDp / watchedPrice) * 100).toFixed(1) 
    : '0';

  const onSubmit = async (data: SimulationFormData) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await simulateCredit({
        price: data.price,
        dp: data.dp,
        schemeId: 1, // Default scheme for now
        tenorMonths: data.tenorMonths,
      });

      if (response.success) {
        setResult(response.data);
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Gagal menghitung simulasi';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        🧮 Simulasi Kredit
      </h2>
      <p className="text-gray-500 mb-6">
        Hitung cicilan bulanan sebelum transaksi
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Price Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Harga Jual (Rp)
          </label>
          <input
            type="number"
            {...register('price', { valueAsNumber: true })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 4500000"
          />
          {errors.price && (
            <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
          )}
        </div>

        {/* DP Input with percentage indicator */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Uang Muka / DP (Rp)
            </label>
            <span className="text-sm text-blue-600 font-medium">
              {dpPercentage}% dari harga
            </span>
          </div>
          <input
            type="number"
            {...register('dp', { valueAsNumber: true })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 500000"
          />
          {errors.dp && (
            <p className="text-red-500 text-sm mt-1">{errors.dp.message}</p>
          )}
        </div>

        {/* Tenor Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pilih Tenor (Bulan)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {tenorOptions.map((tenor) => (
              <label
                key={tenor}
                className="relative"
              >
                <input
                  type="radio"
                  value={tenor}
                  {...register('tenorMonths', { valueAsNumber: true })}
                  className="sr-only peer"
                />
                <div className="py-3 px-4 text-center border-2 rounded-lg cursor-pointer transition-all peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 hover:border-gray-400">
                  <span className="font-semibold">{tenor}</span>
                  <span className="text-xs block text-gray-500">bulan</span>
                </div>
              </label>
            ))}
          </div>
          {errors.tenorMonths && (
            <p className="text-red-500 text-sm mt-1">{errors.tenorMonths.message}</p>
          )}
        </div>

        {/* Calculate Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Menghitung...
            </>
          ) : (
            '🔢 Hitung Simulasi'
          )}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-medium">❌ {error}</p>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            📊 Hasil Simulasi
          </h3>

          {/* Monthly Installment - Big and Bold */}
          <div className="text-center py-4 mb-4 bg-white rounded-lg shadow-sm">
            <p className="text-sm text-gray-500 mb-1">Cicilan per Bulan</p>
            <p className="text-4xl font-bold text-blue-600">
              {formatRupiah(result.simulation.monthlyInstallment)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              selama {result.simulation.tenorMonths} bulan
            </p>
          </div>

          {/* Detail Breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Harga Jual</span>
              <span className="font-medium">{formatRupiah(result.simulation.price)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Uang Muka (DP)</span>
              <span className="font-medium text-green-600">- {formatRupiah(result.simulation.dp)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Pokok Hutang</span>
              <span className="font-medium">{formatRupiah(result.simulation.principal)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Bunga ({result.simulation.interestRate}% x {result.simulation.tenorMonths} bln)</span>
              <span className="font-medium text-orange-600">+ {formatRupiah(result.simulation.interestAmount)}</span>
            </div>
            <div className="flex justify-between py-2 font-semibold text-base">
              <span className="text-gray-800">Total Kredit</span>
              <span className="text-blue-700">{formatRupiah(result.simulation.totalLoan)}</span>
            </div>
          </div>

          {/* Scheme Info */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Skema: <span className="font-medium">{result.scheme.name}</span> • 
              Bunga Flat {result.scheme.interestRate}%/bulan
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
