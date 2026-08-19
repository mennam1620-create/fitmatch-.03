import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, User } from 'firebase/auth';
import type { SizingProfile } from '@/types';
import { handleFirestoreError, OperationType } from '@/lib/firebaseError';

const EMPTY_PROFILE: SizingProfile = {
  name: '',
  measurements: {},
  updatedAt: '',
};

export function useProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfileState] = useState<SizingProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProfileState({ ...EMPTY_PROFILE });
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const path = `users/${user.uid}`;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileState({
          ...EMPTY_PROFILE,
          ...data,
          updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || '',
          measurements: data?.measurements || {},
        });
      } else {
        setProfileState({ ...EMPTY_PROFILE });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [user]);

  const saveProfile = useCallback(async (newProfile: SizingProfile) => {
    if (!user) {
      // Could fallback to local storage if desired, but for now we require login
      console.warn("User must be logged in to save profile");
      return;
    }
    const path = `users/${user.uid}`;
    
    // Firestore cannot accept literal `undefined` values. 
    // We must strip them from the payload.
    const toSave: any = {
      ...newProfile,
      id: user.uid,
      updatedAt: serverTimestamp(),
    };
    
    Object.keys(toSave).forEach(key => {
      if (toSave[key] === undefined) {
        delete toSave[key];
      }
    });

    try {
      await setDoc(doc(db, 'users', user.uid), toSave);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }, [user]);

  const clearProfile = useCallback(async () => {
    if (!user) return;
    const path = `users/${user.uid}`;
    const toSave = {
      ...EMPTY_PROFILE,
      id: user.uid,
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'users', user.uid), toSave);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }, [user]);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in", error);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return { user, profile, loading, saveProfile, clearProfile, signIn, signOut };
}
