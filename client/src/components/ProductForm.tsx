import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createProduct } from '../services/api';
import { useState } from 'react';
import { PRODUCT_TYPES } from '../constants/productTypes';

// Base schema for common fields
const baseProductSchema = z.object({
  sku: z.string().min(3, 'SKU minimal 3 karakter'),
  name: z.string().min(2, 'Nama produk minimal 2 karakter'),
  base_price: z.number().min(1000, 'Harga minimal Rp 1.000'),
  stock_qty: z.number().int().min(0, 'Stok tidak boleh negatif'),
  category: z.enum(['ELECTRONIC', 'FURNITURE', 'VEHICLE']),
  sub_category: z.string().min(1, 'Tipe produk harus dipilih'),
});

// Electronic-specific attributes
const electronicAttributesSchema = z.object({
  sn: z.string().min(5, 'Serial Number minimal 5 karakter'),
  brand: z.string().min(2, 'Brand minimal 2 karakter'),
  warranty: z.string().min(1, 'Warranty harus diisi'),
  imei: z.string().optional(),
});

// Furniture-specific attributes
const furnitureAttributesSchema = z.object({
  dimensions: z.string().min(3, 'Dimensi harus diisi (e.g., 200x100x80)'),
  material: z.string().min(2, 'Material harus diisi'),
  color: z.string().min(2, 'Warna harus diisi'),
});

// Vehicle-specific attributes
const vehicleAttributesSchema = z.object({
  engine_no: z.string().min(5, 'Nomor Mesin minimal 5 karakter'),
  chassis_no: z.string().min(5, 'Nomor Rangka minimal 5 karakter'),
  color: z.string().min(2, 'Warna harus diisi'),
  year: z.number().int().min(2000, 'Tahun minimal 2000'),
});

// Combined schema with discriminated union
const electronicProductSchema = baseProductSchema.extend({
  category: z.literal('ELECTRONIC'),
  attributes: electronicAttributesSchema,
});

const furnitureProductSchema = baseProductSchema.extend({
  category: z.literal('FURNITURE'),
  attributes: furnitureAttributesSchema,
});

const vehicleProductSchema = baseProductSchema.extend({
  category: z.literal('VEHICLE'),
  attributes: vehicleAttributesSchema,
});

// Full product schema
const productSchema = z.discriminatedUnion('category', [
  electronicProductSchema,
  furnitureProductSchema,
  vehicleProductSchema,
]);

type ProductFormData = z.infer<typeof productSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface ProductFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ProductForm({ onSuccess, onCancel }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    resolver: async (values) => {
      const result = await productSchema.safeParseAsync(values);
      if (result.success) {
        return { values: result.data, errors: {} };
      }
      
      // Map Zod errors to React Hook Form errors
      const formattedErrors = result.error.issues.reduce((acc: any, issue) => {
        const path = issue.path.join('.');
        acc[path] = {
          type: issue.code,
          message: issue.message,
        };
        return acc;
      }, {});
      
      return { values: {}, errors: formattedErrors };
    },
    defaultValues: {
      category: 'ELECTRONIC',
      sku: '',
      name: '',
      base_price: 0,
      stock_qty: 1,
      sub_category: '',
      attributes: {},
    } as any,
  });

  // Watch category to conditionally render fields
  const selectedCategory = watch('category');

  const onSubmit = async (data: ProductFormData) => {
    try {
      setIsSubmitting(true);
      setServerError(null);
      await createProduct(data);
      alert('Produk berhasil ditambahkan!');
      reset();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setServerError(err.response?.data?.error || 'Gagal menambahkan produk');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle category change - reset attributes when switching
  const handleCategoryChange = (newCategory: 'ELECTRONIC' | 'FURNITURE' | 'VEHICLE') => {
    const currentValues = watch();
    if (newCategory === 'ELECTRONIC') {
      reset({
        ...currentValues,
        category: 'ELECTRONIC',
        sub_category: PRODUCT_TYPES.ELECTRONIC[0],
        attributes: { sn: '', brand: '', warranty: '1 Tahun' },
      } as any);
    } else if (newCategory === 'FURNITURE') {
      reset({
        ...currentValues,
        category: 'FURNITURE',
        sub_category: PRODUCT_TYPES.FURNITURE[0],
        attributes: { dimensions: '', material: '', color: '' },
      } as any);
    } else {
      reset({
        ...currentValues,
        category: 'VEHICLE',
        sub_category: PRODUCT_TYPES.VEHICLE[0],
        attributes: { engine_no: '', chassis_no: '', color: '', year: new Date().getFullYear() },
      } as any);
    }
  };

  return (
    <div className="bg-white p-2">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {serverError}
          </div>
        )}

        {/* Category Selector */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tighter">
            Kategori Produk
          </label>
          <div className="flex gap-2">
            {(['ELECTRONIC', 'FURNITURE', 'VEHICLE'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`flex-1 py-2 px-3 rounded-xl border-2 font-bold text-xs transition-all ${
                  selectedCategory === cat
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-100'
                    : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                }`}
              >
                {cat === 'ELECTRONIC' ? '⚡ ELEKTRONIK' : cat === 'FURNITURE' ? '🪑 FURNITURE' : '🏍️ VEHICLE'}
              </button>
            ))}
          </div>
          <input type="hidden" {...register('category')} />
        </div>

        {/* Sub-Category Selector */}
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
            Tipe Produk ({selectedCategory})
          </label>
          <select
            {...register('sub_category')}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
          >
            <option value="">Pilih Tipe Barangnya...</option>
            {PRODUCT_TYPES[selectedCategory as keyof typeof PRODUCT_TYPES].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.sub_category && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.sub_category.message}</p>}
        </div>

        {/* Common Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
              SKU (Kode Barang)
            </label>
            <input
              type="text"
              {...register('sku')}
              placeholder="e.g., EL-TV-001"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
            />
            {errors.sku && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.sku.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
              Stok Awal
            </label>
            <input
              type="number"
              {...register('stock_qty', { valueAsNumber: true })}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
            />
            {errors.stock_qty && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.stock_qty.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
            Nama Produk
          </label>
          <input
            type="text"
            {...register('name')}
            placeholder="Nama lengkap barang..."
            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
          />
          {errors.name && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
            Harga Modal (Rp)
          </label>
          <input
            type="number"
            {...register('base_price', { valueAsNumber: true })}
            placeholder="0"
            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
          />
          {errors.base_price && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.base_price.message}</p>}
        </div>

        {/* Dynamic Attributes Section */}
        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
            Atribut Kategori
          </h3>

          {selectedCategory === 'ELECTRONIC' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Serial Number</label>
                  <input type="text" {...register('attributes.sn' as any)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Brand</label>
                  <input type="text" {...register('attributes.brand' as any)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          ) : selectedCategory === 'FURNITURE' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Dimensi (P x L x T)</label>
                <input type="text" {...register('attributes.dimensions' as any)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">No. Mesin</label>
                  <input type="text" {...register('attributes.engine_no' as any)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">No. Rangka</label>
                  <input type="text" {...register('attributes.chassis_no' as any)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-6 rounded-xl font-bold text-gray-400 hover:bg-gray-100 transition-all text-sm"
            >
              BATAL
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-[2] py-3 px-6 rounded-xl font-black text-white transition-all text-sm shadow-sm shadow-blue-200 ${
              isSubmitting ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN PRODUK'}
          </button>
        </div>
      </form>
    </div>
  );
}
