import { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export const getCheckoutUrl = async (app: FirebaseApp): Promise<string> => {
  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error('Missing Stripe price ID environment variable');
  }

  const auth = getAuth(app);
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error('User is not authenticated');
  }

  const db = getFirestore(app);
  const checkoutSessionRef = collection(
    db,
    'customers',
    userId,
    'checkout_sessions'
  );

  let resolved = false;
  const docRef = await addDoc(checkoutSessionRef, {
    price: priceId,
    billing_address_collection: 'auto',
    allow_promotion_codes: true,
    success_url: window.location.origin,
    cancel_url: window.location.origin,
  });

  return new Promise<string>((resolve, reject) => {
    const unsubscribe = onSnapshot(docRef, (snap) => {
      const data = snap.data() as { error?: { message: string }; url?: string };
      if (data.error) {
        unsubscribe();
        return reject(new Error(`An error occurred: ${data.error.message}`));
      }
      if (data.url && !resolved) {
        unsubscribe();
        resolve(data.url);
        resolved = true;
      }
    });
  });
};

export const getPortalUrl = async (app: FirebaseApp): Promise<string> => {
  const auth = getAuth(app);
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error('User is not authenticated');
  }

  let dataWithUrl: { url?: string } = {};
  try {
    const functions = getFunctions(app, 'us-central1');
    const functionRef = httpsCallable(
      functions,
      'ext-firestore-stripe-payments-createPortalLink'
    );
    const response = await functionRef({
      customerId: userId,
      returnUrl: window.location.origin,
    });

    dataWithUrl = response.data ?? {};

    if (!dataWithUrl.url) {
      throw new Error('No url returned');
    }
    return dataWithUrl.url;
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      throw new Error(error.message);
    } else {
      console.error('An unknown error occurred');
      throw new Error('An unknown error occurred');
    }
  }
};
