import { useState, useEffect, useCallback } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/types';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => doc.data() as Product);
      setProducts(fetched);
      setLoading(false);
      setError(null);
    }, (err: any) => {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to fetch products');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const saveProduct = useCallback(async (product: Product) => {
    try {
      await setDoc(doc(db, 'products', product.id), product);
    } catch (err: any) {
      console.error('Error saving product:', err);
      throw err;
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err: any) {
      console.error('Error deleting product:', err);
      throw err;
    }
  }, []);

  return { products, loading, error, saveProduct, deleteProduct };
}
