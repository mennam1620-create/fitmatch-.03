import { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useProducts } from '@/hooks/useProducts';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import type { Product, Category, FabricStretch, FitStyle, MeasurementKey, SizeKey, ProductSizeChart } from '@/types';
import { CATEGORY_LABELS, FABRIC_STRETCH_LABELS, FIT_STYLE_LABELS } from '@/lib/catalog';
import { MEASUREMENT_INFOS, SIZE_KEYS } from '@/types';

export function AdminProductEditor({ productId, onNavigate }: { productId?: string, onNavigate: (to: string) => void }) {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { products, saveProduct } = useProducts();
  const [product, setProduct] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (productId && products.length > 0) {
      const existing = products.find(p => p.id === productId);
      if (existing) {
        setProduct(existing);
      } else {
        // Handle not found
        setProduct({
          id: productId,
          colors: [],
          sizeChart: { measurements: ['bust', 'waist', 'hips'], rows: [] }
        });
      }
    } else if (!productId) {
      setProduct({
        id: `prod_${Math.random().toString(36).substr(2, 9)}`,
        name: '',
        brand: '',
        category: 'dresses',
        price: 0,
        colors: [],
        image: '',
        description: '',
        fit: '',
        material: '',
        fabricStretch: 'low',
        fitStyle: 'tailored',
        sizeChart: { measurements: ['bust', 'waist', 'hips'], rows: [] }
      });
    }
  }, [productId, products]);

  if (adminLoading || !product) {
    return <div className="p-20 text-center"><Spinner /></div>;
  }

  if (!isAdmin) {
    return <div className="p-20 text-center">Access Denied</div>;
  }

  const handleSave = async () => {
    if (!product.id || !product.name || !product.brand) {
      // Rather than an alert, just don't save if invalid (the UI can have required validation if needed)
      return;
    }
    setSaving(true);
    setSavedSuccess(false);
    try {
      await saveProduct(product as Product);
      setSavedSuccess(true);
      setTimeout(() => onNavigate('/admin'), 1500);
    } catch (err: any) {
      console.error(`Error saving product: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof Product, value: any) => {
    setProduct(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleMeasurementsChange = (m: string) => {
    const mk = m as MeasurementKey;
    const chart = product.sizeChart!;
    let newMeasurements = [...chart.measurements];
    if (newMeasurements.includes(mk)) {
      newMeasurements = newMeasurements.filter(x => x !== mk);
    } else {
      newMeasurements.push(mk);
    }
    updateField('sizeChart', { ...chart, measurements: newMeasurements });
  };

  const addSizeRow = () => {
    const chart = product.sizeChart!;
    const remainingSizes = SIZE_KEYS.filter(s => !chart.rows.some(r => r.size === s));
    if (remainingSizes.length === 0) return;
    const newRow = { size: remainingSizes[0] };
    updateField('sizeChart', { ...chart, rows: [...chart.rows, newRow] });
  };

  const removeSizeRow = (index: number) => {
    const chart = product.sizeChart!;
    const newRows = [...chart.rows];
    newRows.splice(index, 1);
    updateField('sizeChart', { ...chart, rows: newRows });
  };

  const updateSizeRow = (index: number, key: string, value: any) => {
    const chart = product.sizeChart!;
    const newRows = [...chart.rows];
    newRows[index] = { ...newRows[index], [key]: value };
    updateField('sizeChart', { ...chart, rows: newRows });
  };

  return (
    <div>
      <PageHeader
        title={productId ? 'Edit Product' : 'New Product'}
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: productId ? 'Edit' : 'New' }]}
        onNavigate={onNavigate}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => onNavigate('/admin')}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-6"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </button>

        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField label="Product ID" value={product.id || ''} onChange={(v) => updateField('id', v)} disabled={!!productId} />
            <TextField label="Name" value={product.name || ''} onChange={(v) => updateField('name', v)} />
            <TextField label="Brand" value={product.brand || ''} onChange={(v) => updateField('brand', v)} />
            <Select 
              label="Category" 
              value={product.category || 'dresses'} 
              onChange={(v) => updateField('category', v)}
              options={Object.entries(CATEGORY_LABELS).map(([k,v]) => ({value: k, label: v}))}
            />
            <TextField label="Price" type="number" value={product.price?.toString() || '0'} onChange={(v) => updateField('price', parseFloat(v))} />
            <TextField label="Image URL" value={product.image || ''} onChange={(v) => updateField('image', v)} />
            <Select 
              label="Fit Style" 
              value={product.fitStyle || 'tailored'} 
              onChange={(v) => updateField('fitStyle', v)}
              options={Object.entries(FIT_STYLE_LABELS).map(([k,v]) => ({value: k, label: v}))}
            />
            <Select 
              label="Fabric Stretch" 
              value={product.fabricStretch || 'low'} 
              onChange={(v) => updateField('fabricStretch', v)}
              options={Object.entries(FABRIC_STRETCH_LABELS).map(([k,v]) => ({value: k, label: v}))}
            />
          </div>
          
          <TextField label="Description" value={product.description || ''} onChange={(v) => updateField('description', v)} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField label="Fit Description" value={product.fit || ''} onChange={(v) => updateField('fit', v)} />
            <TextField label="Material" value={product.material || ''} onChange={(v) => updateField('material', v)} />
          </div>

          <TextField label="Colors (comma separated)" value={product.colors?.join(', ') || ''} onChange={(v) => updateField('colors', v.split(',').map(s=>s.trim()).filter(Boolean))} />

          {/* Size Chart Section */}
          <div className="border-t border-neutral-200 pt-6 mt-6">
            <h3 className="text-lg font-serif text-neutral-900 mb-4">Size Chart</h3>
            
            <div className="mb-4">
              <p className="text-sm font-medium text-neutral-700 mb-2">Required Measurements</p>
              <div className="flex gap-3">
                {MEASUREMENT_INFOS.map(m => (
                  <label key={m.key} className="flex items-center gap-2 text-sm text-neutral-600">
                    <input 
                      type="checkbox" 
                      checked={product.sizeChart?.measurements.includes(m.key) || false}
                      onChange={() => handleMeasurementsChange(m.key)}
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto border border-neutral-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200">
                  <tr>
                    <th className="px-3 py-2 font-medium">Size</th>
                    {product.sizeChart?.measurements.map(m => (
                      <th key={m} className="px-3 py-2 font-medium capitalize">{m} (cm)</th>
                    ))}
                    <th className="px-3 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {product.sizeChart?.rows.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <select 
                          value={row.size}
                          onChange={(e) => updateSizeRow(i, 'size', e.target.value)}
                          className="text-sm border-neutral-300 rounded focus:ring-neutral-900 focus:border-neutral-900"
                        >
                          {SIZE_KEYS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      {product.sizeChart?.measurements.map(m => (
                        <td key={m} className="px-3 py-2">
                          <input 
                            type="number" 
                            value={(row as any)[m] || ''}
                            onChange={(e) => updateSizeRow(i, m, parseFloat(e.target.value) || undefined)}
                            className="w-20 text-sm border-neutral-300 rounded focus:ring-neutral-900 focus:border-neutral-900"
                            placeholder="-"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeSizeRow(i)} className="text-neutral-400 hover:text-rose-600 p-1">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={addSizeRow} icon={<Plus size={14} />}>Add Size Row</Button>
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-200 flex justify-end gap-3 items-center">
            {savedSuccess && <span className="text-sm text-emerald-600 font-medium animate-fade-in">Saved!</span>}
            <Button 
              onClick={handleSave} 
              disabled={saving || !product.name || !product.brand} 
              icon={saving ? <Spinner size="sm" /> : <Save size={16} />}
            >
              {saving ? 'Saving...' : 'Save Product'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
