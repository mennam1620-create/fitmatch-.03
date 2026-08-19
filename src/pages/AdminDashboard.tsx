import { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useProducts } from '@/hooks/useProducts';
import { PRODUCTS as STATIC_PRODUCTS } from '@/lib/catalog';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, RefreshCw, Plus, Trash2, CreditCard as Edit, Check } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

export function AdminDashboard({ onNavigate }: { onNavigate: (to: string) => void }) {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { products, loading: productsLoading, error, saveProduct, deleteProduct } = useProducts();
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  
  // Custom confirm state
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; action: () => Promise<void>; isDestructive?: boolean } | null>(null);

  if (adminLoading) {
    return <div className="p-20 text-center"><Spinner /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-20 text-center max-w-md mx-auto">
        <ShieldAlert size={48} className="mx-auto text-rose-500 mb-4" />
        <h2 className="text-2xl font-serif text-neutral-900 mb-2">Access Denied</h2>
        <p className="text-neutral-600 mb-6">You must be an administrator to view this page.</p>
        <Button onClick={() => onNavigate('/')}>Return to Home</Button>
      </div>
    );
  }

  const performSeed = async () => {
    setSeeding(true);
    setSeedSuccess(false);
    setSeedError(null);
    try {
      for (const p of STATIC_PRODUCTS) {
        await saveProduct(p);
      }
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (err: any) {
      setSeedError(`Error seeding: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleSeed = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Seed Database',
      message: 'This will add the static catalog products to your database. Existing products will remain. Continue?',
      action: async () => { await performSeed(); setConfirmDialog(null); }
    });
  };

  const performDelete = async (id: string) => {
    try {
      await deleteProduct(id);
    } catch (err: any) {
      setSeedError(`Error deleting: ${err.message}`);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      isDestructive: true,
      action: async () => { await performDelete(id); setConfirmDialog(null); }
    });
  };

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage the product catalog and settings."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Admin' }]}
        onNavigate={onNavigate}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-serif text-neutral-900">Products ({products.length})</h2>
          <div className="flex gap-3 items-center">
            {seedSuccess && <span className="text-sm text-emerald-600 flex items-center gap-1 animate-fade-in"><Check size={14} /> Seeded</span>}
            <Button variant="outline" onClick={handleSeed} disabled={seeding} icon={<RefreshCw size={16} />}>
              {seeding ? 'Seeding...' : 'Seed Data'}
            </Button>
            <Button onClick={() => onNavigate('/admin/product/new')} icon={<Plus size={16} />}>
              Add Product
            </Button>
          </div>
        </div>

        {(error || seedError) && (
          <div className="bg-rose-50 text-rose-800 p-4 rounded-lg mb-6 text-sm border border-rose-200">
            {error || seedError}
          </div>
        )}

        {productsLoading ? (
          <div className="py-20 text-center"><Spinner /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white border border-neutral-200 rounded-xl">
            <p className="text-neutral-500 mb-4">No products in the database.</p>
            <Button onClick={handleSeed} disabled={seeding}>Seed Sample Data</Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Brand</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 font-medium text-neutral-900 flex items-center gap-3">
                        <img src={p.image} alt={p.name} className="w-8 h-8 rounded object-cover bg-neutral-100 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{p.name}</span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600 truncate max-w-[150px]">{p.brand}</td>
                      <td className="px-4 py-3 text-neutral-600 capitalize">{p.category}</td>
                      <td className="px-4 py-3 text-neutral-600">${p.price}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => onNavigate(`/admin/product/${p.id}`)} className="text-neutral-400 hover:text-emerald-600 transition-colors p-2" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="text-neutral-400 hover:text-rose-600 transition-colors p-2 ml-1" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Custom Confirm Dialog */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={() => setConfirmDialog(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full animate-scale-in p-6">
            <h2 className="font-serif text-lg text-neutral-900">{confirmDialog.title}</h2>
            <p className="mt-2 text-sm text-neutral-500 leading-relaxed">{confirmDialog.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmDialog(null)}>Cancel</Button>
              <Button 
                variant="primary" 
                className={confirmDialog.isDestructive ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 border-none text-white" : ""}
                onClick={confirmDialog.action}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
