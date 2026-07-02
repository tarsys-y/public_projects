// Auth online (M7): login anônimo + perfil em users/{uid}. Tudo é opcional —
// com o online desativado o store fica em 'disabled' e nada mais acontece.
import { create } from 'zustand';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDb, isOnlineEnabled, signInAnon } from '../services/firebase';
import { useProfileStore } from './profileStore';

export type AuthStatus = 'disabled' | 'signedOut' | 'signingIn' | 'signedIn' | 'error';

interface AuthState {
  status: AuthStatus;
  uid: string | null;
  error: string | null;
  /** Conecta (login anônimo) e cria/atualiza o doc do usuário. */
  connect: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: isOnlineEnabled() ? 'signedOut' : 'disabled',
  uid: null,
  error: null,

  connect: async () => {
    if (!isOnlineEnabled()) return;
    set({ status: 'signingIn', error: null });
    try {
      const uid = await signInAnon();
      const coachName = useProfileStore.getState().coachName;
      await setDoc(
        doc(getDb(), 'users', uid),
        { name: coachName, updatedAt: serverTimestamp() },
        { merge: true },
      );
      set({ status: 'signedIn', uid });
    } catch (e) {
      set({ status: 'error', error: (e as Error).message });
    }
  },
}));
