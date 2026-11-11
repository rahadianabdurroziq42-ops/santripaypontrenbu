import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  collection, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  getDocs, 
  writeBatch,
  deleteDoc 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Santri, Transaction, PesantrenProfile } from './types/finance';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }
};

export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out failed:', error);
    throw error;
  }
};

// Error handling as specified in skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Validate connection
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or waiting for network connection.');
    }
  }
}

// Real-time Firestore synchronizers
export function subscribeToSantri(
  onData: (santri: Santri[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'santri';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Santri[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as Santri);
      });
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToTransactions(
  onData: (transactions: Transaction[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'transactions';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Transaction[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as Transaction);
      });
      // Sort newest first
      items.sort((a, b) => {
        const dateComp = b.date.localeCompare(a.date);
        if (dateComp !== 0) return dateComp;
        return (b.time || '').localeCompare(a.time || '');
      });
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToProfile(
  onData: (profile: PesantrenProfile) => void,
  onError?: (err: unknown) => void
) {
  const path = 'settings';
  return onSnapshot(
    doc(db, path, 'profile'),
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as PesantrenProfile);
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, `${path}/profile`);
    }
  );
}

// Cloud Mutation Operations
export async function saveSantriToCloud(santri: Santri): Promise<void> {
  const path = `santri/${santri.id}`;
  try {
    const cleaned = Object.fromEntries(
      Object.entries(santri).filter(([_, v]) => v !== undefined)
    );
    await setDoc(doc(db, 'santri', santri.id), cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSantriFromCloud(santriId: string): Promise<void> {
  const path = `santri/${santriId}`;
  try {
    await deleteDoc(doc(db, 'santri', santriId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateSantriBalanceInCloud(santriId: string, newBalance: number): Promise<void> {
  const path = `santri/${santriId}`;
  try {
    await updateDoc(doc(db, 'santri', santriId), { balance: newBalance });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveTransactionToCloud(transaction: Transaction): Promise<void> {
  const path = `transactions/${transaction.id}`;
  try {
    const cleaned = Object.fromEntries(
      Object.entries(transaction).filter(([_, v]) => v !== undefined)
    );
    await setDoc(doc(db, 'transactions', transaction.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveProfileToCloud(profile: PesantrenProfile): Promise<void> {
  const path = 'settings/profile';
  try {
    const cleaned = Object.fromEntries(
      Object.entries(profile).filter(([_, v]) => v !== undefined)
    );
    await setDoc(doc(db, 'settings', 'profile'), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Bulk seed initial data to Cloud Firestore if collection is empty
export async function seedInitialDataToCloud(
  santriList: Santri[],
  transactions: Transaction[],
  profile: PesantrenProfile
): Promise<void> {
  try {
    const santriSnap = await getDocs(collection(db, 'santri'));
    if (santriSnap.empty) {
      console.log('Seeding initial santri to Firestore cloud...');
      const batch = writeBatch(db);
      for (const s of santriList) {
        const cleaned = Object.fromEntries(
          Object.entries(s).filter(([_, v]) => v !== undefined)
        );
        batch.set(doc(db, 'santri', s.id), cleaned);
      }
      for (const t of transactions) {
        const cleaned = Object.fromEntries(
          Object.entries(t).filter(([_, v]) => v !== undefined)
        );
        batch.set(doc(db, 'transactions', t.id), cleaned);
      }
      const cleanedProfile = Object.fromEntries(
        Object.entries(profile).filter(([_, v]) => v !== undefined)
      );
      batch.set(doc(db, 'settings', 'profile'), cleanedProfile);
      await batch.commit();
      console.log('Successfully seeded initial pesantren data to Firestore!');
    }
  } catch (error) {
    console.error('Error during cloud seeding check:', error);
  }
}// Bulk replace entire santri and transactions collection in Cloud Firestore
export async function replaceAllSantriInCloud(
  newSantriList: Santri[],
  newInitialTransactions: Transaction[] = []
): Promise<void> {
  try {
    // 1. Fetch and delete all existing santri documents
    const existingSnap = await getDocs(collection(db, 'santri'));
    const chunkSize = 400;
    const santriDocs = existingSnap.docs;
    for (let i = 0; i < santriDocs.length; i += chunkSize) {
      const chunk = santriDocs.slice(i, i + chunkSize);
      const deleteBatch = writeBatch(db);
      chunk.forEach((docSnap) => {
        deleteBatch.delete(docSnap.ref);
      });
      await deleteBatch.commit();
    }

    // 2. Fetch and delete all existing transaction documents (so reports 100% reset to new import)
    const existingTrxSnap = await getDocs(collection(db, 'transactions'));
    const trxDocs = existingTrxSnap.docs;
    for (let i = 0; i < trxDocs.length; i += chunkSize) {
      const chunk = trxDocs.slice(i, i + chunkSize);
      const deleteBatch = writeBatch(db);
      chunk.forEach((docSnap) => {
        deleteBatch.delete(docSnap.ref);
      });
      await deleteBatch.commit();
    }

    // 3. Insert the new imported santri in batches
    for (let i = 0; i < newSantriList.length; i += chunkSize) {
      const chunk = newSantriList.slice(i, i + chunkSize);
      const insertBatch = writeBatch(db);
      for (const s of chunk) {
        const cleaned = Object.fromEntries(
          Object.entries(s).filter(([_, v]) => v !== undefined)
        );
        insertBatch.set(doc(db, 'santri', s.id), cleaned);
      }
      await insertBatch.commit();
    }

    // 4. Save new initial deposit transactions
    if (newInitialTransactions.length > 0) {
      for (let i = 0; i < newInitialTransactions.length; i += chunkSize) {
        const chunk = newInitialTransactions.slice(i, i + chunkSize);
        const trxBatch = writeBatch(db);
        for (const t of chunk) {
          const cleaned = Object.fromEntries(
            Object.entries(t).filter(([_, v]) => v !== undefined)
          );
          trxBatch.set(doc(db, 'transactions', t.id), cleaned);
        }
        await trxBatch.commit();
      }
    }
  } catch (error) {
    console.error('Error replacing santri and transactions in cloud:', error);
  }
}
