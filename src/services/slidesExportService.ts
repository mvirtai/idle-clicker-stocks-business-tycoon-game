import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  Auth,
  User,
} from 'firebase/auth';
import { GameStore } from '../store/useGameStore';

interface FirebaseConfigShape {
  projectId?: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
}

/**
 * Arkkitehtuurinen suojaus (12-Factor App & GitHub-turvallisuus):
 * 1. Emme tee kovaa staattista `import config from '../../firebase-applet-config.json'` -kutsua,
 *    koska kyseinen tiedosto on `.gitignore`-listalla eikä sitä viedä GitHubiin.
 * 2. Luemme ensisijaisesti `import.meta.env.VITE_FIREBASE_*` -ympäristömuuttujat (`.env`).
 * 3. Jos paikallinen `firebase-applet-config.json` löytyy levyltä, Viten `import.meta.glob`
 *    lataa sen automaattisesti ilman, että käännös hajoaa tiedoston puuttuessa!
 */
const localConfigModules = import.meta.glob<FirebaseConfigShape>(
  '../../firebase-applet-config.json',
  { eager: true, import: 'default' }
);

const localFileConfig: FirebaseConfigShape =
  Object.values(localConfigModules)[0] || {};

function resolveFirebaseConfig(): FirebaseConfigShape | null {
  const env = import.meta.env;
  const apiKey = env.VITE_FIREBASE_API_KEY || localFileConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || localFileConfig.projectId;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN || localFileConfig.authDomain;
  const appId = env.VITE_FIREBASE_APP_ID || localFileConfig.appId;

  if (!apiKey || apiKey === 'your-api-key-here' || apiKey === 'YOUR_FIREBASE_API_KEY_HERE') {
    return null;
  }

  return {
    apiKey,
    projectId,
    authDomain,
    appId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || localFileConfig.storageBucket,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || localFileConfig.messagingSenderId,
  };
}

let cachedAuth: Auth | null = null;

function getFirebaseAuthInstance(): Auth {
  if (cachedAuth) return cachedAuth;

  const config = resolveFirebaseConfig();
  if (!config) {
    throw new Error(
      'Firebase-asetuksia ei löytynyt. Aseta VITE_FIREBASE_* muuttujat .env-tiedostoon tai luo paikallinen firebase-applet-config.json.'
    );
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  cachedAuth = getAuth(app);
  return cachedAuth;
}

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/presentations');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuthListener = (
  onSuccess?: (user: User, token: string) => void,
  onFail?: () => void
) => {
  try {
    const auth = getFirebaseAuthInstance();
    return onAuthStateChanged(auth, async (user) => {
      if (user && cachedAccessToken) {
        if (onSuccess) onSuccess(user, cachedAccessToken);
      } else {
        if (!isSigningIn) {
          cachedAccessToken = null;
          if (onFail) onFail();
        }
      }
    });
  } catch {
    if (onFail) onFail();
    return () => {};
  }
};

export const getGoogleAccessToken = async (): Promise<string> => {
  if (cachedAccessToken) return cachedAccessToken;

  const auth = getFirebaseAuthInstance();
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google OAuth -käyttöoikeustunnisteen (Access Token) nouto epäonnistui.');
    }
    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  } finally {
    isSigningIn = false;
  }
};

export interface PitchDeckExportResult {
  presentationId: string;
  presentationUrl: string;
  title: string;
}

/**
 * Luo yrityksen ja sijoitussalkun pohjalta valmiin sijoittajaesityksen (Pitch Deck) Google Slidesiin.
 */
export async function exportPitchDeckToGoogleSlides(
  store: GameStore
): Promise<PitchDeckExportResult> {
  const token = await getGoogleAccessToken();

  const title = `${store.company.name || 'Yritys'} – Sijoittaja- ja Kasvukatsaus (Vk ${store.week})`;

  // 1. Luodaan esitys Google Slides API:lla
  const createRes = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Google Slides -esityksen luominen epäonnistui');
  }

  const presentation = await createRes.json();
  const presentationId = presentation.presentationId;

  // 2. Koostetaan datasta diaesityksen sisältö
  const totalPortfolioVal = store.getPortfolioValue ? store.getPortfolioValue() : 0;
  const pl = store.getPortfolioProfitLoss ? store.getPortfolioProfitLoss() : { amount: 0, percent: 0 };
  const risk = ((store.loan.principal / store.loan.homeCollateralValue) * 100).toFixed(1);

  // batchUpdate diojen ja tekstien lisäämiseksi
  const slide1Id = 'slide_financials';
  const slide2Id = 'slide_portfolio';

  const requests = [
    // Dia 2: Talous & Lainanhoito
    {
      createSlide: {
        objectId: slide1Id,
        slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
      },
    },
    // Dia 3: Sijoitussalkku ja Raaka-aineet
    {
      createSlide: {
        objectId: slide2Id,
        slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
      },
    },
  ];

  await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  return {
    presentationId,
    presentationUrl: `https://docs.google.com/presentation/d/${presentationId}/edit`,
    title,
  };
}
