import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  Auth
} from 'firebase/auth';

// Firebase Client Configuration
// Reads strictly from Vite environment variables (VITE_FIREBASE_...)
// Never hardcode credentials in code to adhere to zero-secrets-in-repo security policy.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

export function isFirebaseConfigured(): boolean {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  return Boolean(apiKey && apiKey.trim() !== '' && !apiKey.includes('DummyKey') && !apiKey.includes('YOUR_'));
}

let authInstance: Auth | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;

export function getSafeAuth(): Auth {
  if (authInstance) {
    return authInstance;
  }
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase API कुंजी कॉन्फ़िगर नहीं है • Firebase API key not configured. Please set VITE_FIREBASE_API_KEY in frontend/.env'
    );
  }
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  authInstance = getAuth(app);
  return authInstance;
}

export function getSafeGoogleProvider(): GoogleAuthProvider {
  if (!googleProviderInstance) {
    googleProviderInstance = new GoogleAuthProvider();
    googleProviderInstance.setCustomParameters({ prompt: 'select_account' });
  }
  return googleProviderInstance;
}

// Fallback proxy to maintain backward-compatibility with any direct 'auth' export references
export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    try {
      const actualAuth = getSafeAuth();
      const val = (actualAuth as any)[prop];
      return typeof val === 'function' ? val.bind(actualAuth) : val;
    } catch {
      return undefined;
    }
  }
});

export const googleProvider = new Proxy({} as GoogleAuthProvider, {
  get(_target, prop) {
    const actualProvider = getSafeGoogleProvider();
    const val = (actualProvider as any)[prop];
    return typeof val === 'function' ? val.bind(actualProvider) : val;
  }
});

/**
 * Sign in with Google popup via Firebase
 */
export async function signInWithGoogleFirebase() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase API कुंजी कॉन्फ़िगर नहीं है • Firebase API key not configured. Please set VITE_FIREBASE_API_KEY in frontend/.env'
    );
  }

  try {
    const safeAuth = getSafeAuth();
    const safeProvider = getSafeGoogleProvider();
    const result = await signInWithPopup(safeAuth, safeProvider);
    const user = result.user;
    const idToken = await user.getIdToken();
    return {
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || '',
      idToken
    };
  } catch (error: any) {
    console.error('Firebase Google sign-in failed', error);
    if (error?.code === 'auth/api-key-not-valid') {
      throw new Error(
        'अमान्य Firebase API Key • Invalid Firebase API Key. Please provide a valid key in frontend/.env'
      );
    }
    throw error;
  }
}

/**
 * Send password reset email via Firebase Authentication
 */
export async function sendFirebasePasswordReset(email: string) {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase API कुंजी कॉन्फ़िगर नहीं है • Firebase API key not configured. Please set VITE_FIREBASE_API_KEY in frontend/.env'
    );
  }

  try {
    const safeAuth = getSafeAuth();
    await sendPasswordResetEmail(safeAuth, email);
    return true;
  } catch (error: any) {
    console.error('Firebase password reset email error', error);
    if (error?.code === 'auth/api-key-not-valid') {
      throw new Error(
        'अमान्य Firebase API Key • Invalid Firebase API Key. Please check frontend/.env'
      );
    }
    throw error;
  }
}

/**
 * Setup reCAPTCHA verifier for Phone Auth
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  const safeAuth = getSafeAuth();
  // Clear any existing widgets in the container
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }

  return new RecaptchaVerifier(safeAuth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      // Response expired
    }
  });
}

/**
 * Send Phone OTP via Firebase
 */
export async function sendFirebasePhoneOtp(
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const safeAuth = getSafeAuth();
  try {
    return await signInWithPhoneNumber(safeAuth, phoneNumber, verifier);
  } catch (error: any) {
    console.error('Firebase send phone OTP error', error);
    throw error;
  }
}
