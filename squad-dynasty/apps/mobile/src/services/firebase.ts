// Firebase (M7) — ativado APENAS quando as variáveis EXPO_PUBLIC_FIREBASE_*
// estão presentes no .env (ver docs/SETUP-FIREBASE.md). Sem elas o jogo segue
// 100% offline; nenhuma tela quebra. Init lazy para não pagar custo no boot.
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  signInAnonymously,
  // @ts-expect-error getReactNativePersistence existe no bundle RN do firebase-auth
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** O online está configurado? (config completa no .env) */
export function isOnlineEnabled(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

/** Sorteios via Cloud Functions (exige plano Blaze + deploy de functions/). */
export function useCloudFunctions(): boolean {
  return process.env.EXPO_PUBLIC_USE_FUNCTIONS === '1';
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function ensureApp(): FirebaseApp {
  if (!isOnlineEnabled()) throw new Error('Online desativado: configure EXPO_PUBLIC_FIREBASE_* no .env');
  if (!app) {
    app = getApps()[0] ?? initializeApp(config as Record<string, string>);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const application = ensureApp();
    if (Platform.OS === 'web') {
      auth = getAuth(application);
    } else {
      auth = initializeAuth(application, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  }
  return auth;
}

export function getDb(): Firestore {
  if (!db) db = getFirestore(ensureApp());
  return db;
}

/** Login anônimo (SPEC: auth anônimo/e-mail). Retorna o uid. */
export async function signInAnon(): Promise<string> {
  const credentials = await signInAnonymously(getFirebaseAuth());
  return credentials.user.uid;
}
