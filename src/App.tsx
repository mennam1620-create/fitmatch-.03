import { useRouter } from '@/lib/router';
import { Navbar } from '@/components/Navbar';
import { HomePage } from '@/pages/HomePage';
import { CatalogPage } from '@/pages/CatalogPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { FindMySizePage } from '@/pages/FindMySizePage';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { AdminProductEditor } from '@/pages/AdminProductEditor';
import { PageTransition } from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/Button';
import { Compass } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useProducts } from '@/hooks/useProducts';

function App() {
  const { route, navigate } = useRouter();
  const { user, profile, loading: profileLoading, saveProfile, clearProfile, signIn, signOut } = useProfile();
  const { products, loading: productsLoading } = useProducts();

  const routeKey = `${route.path}-${route.params.id ?? route.params.cat ?? ''}`;

  const renderPage = () => {
    if (profileLoading || productsLoading) return (
      <div className="flex-1 flex items-center justify-center py-20">
        <p className="text-neutral-500 text-sm">Loading application data...</p>
      </div>
    );

    const path = route.path;
    if (path === '/' || path === '') {
      return <HomePage products={products} profile={profile} onNavigate={navigate} />;
    }
    if (path === '/catalog') {
      return <CatalogPage products={products} profile={profile} onNavigate={navigate} initialCategory={route.params.cat} />;
    }
    if (path === '/profile') {
      return (
        <ProfilePage
          profile={profile ?? { name: '', measurements: {}, updatedAt: '' }}
          onSave={async (p) => { await saveProfile(p); }}
          onClear={async () => { await clearProfile(); }}
          onNavigate={navigate}
          user={user}
        />
      );
    }
    if (path === '/find-my-size') {
      return <FindMySizePage products={products} profile={profile} onNavigate={navigate} />;
    }
    if (path === '/admin') {
      return <AdminDashboard onNavigate={navigate} />;
    }
    if (path.startsWith('/admin/product/')) {
      const id = path.split('/').pop();
      return <AdminProductEditor productId={id === 'new' ? undefined : id} onNavigate={navigate} />;
    }
    if (path === '/product') {
      const id = route.params.id;
      const product = id ? products.find((p) => p.id === id) : undefined;
      if (!product) {
        return (
          <div className="mx-auto max-w-2xl px-4 py-20 text-center">
            <p className="font-serif text-2xl text-neutral-900">Product not found</p>
            <p className="mt-2 text-sm text-neutral-500">The item you're looking for doesn't exist or has been removed.</p>
            <div className="mt-6">
              <Button onClick={() => navigate('/catalog')}>Back to catalog</Button>
            </div>
          </div>
        );
      }
      return <ProductDetailPage product={product} profile={profile} onNavigate={navigate} />;
    }
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mb-5">
          <Compass size={28} />
        </div>
        <p className="font-serif text-2xl text-neutral-900">Page not found</p>
        <p className="mt-2 text-sm text-neutral-500">The page you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Button onClick={() => navigate('/')}>Go home</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar
        onNavigate={navigate}
        currentPath={route.path}
        profile={profile}
        onProfileCleared={clearProfile}
        user={user}
        onSignIn={signIn}
        onSignOut={signOut}
      />
      <main className="flex-1">
        <PageTransition routeKey={routeKey}>{renderPage()}</PageTransition>
      </main>
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-white text-xs font-serif font-semibold">FM</span>
              <span className="font-serif text-lg text-neutral-900">FitMatch</span>
            </div>
            <p className="text-xs text-neutral-400">Demo catalog · Size guidance is informational only.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
