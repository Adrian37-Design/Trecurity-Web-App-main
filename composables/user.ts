
import { type User } from '@prisma/client'

const LOCAL_STORAGE_KEY = 'user-d3f0d7b7-464b-4417-8a61-98e59c162268';

export type AuthenticatedUser = User & {
  companies_managed?: any[];
  companies_joined?: any[];
  active_company_id?: string;
  [key: string]: any;
};

export const useUser = () => {

  const userState = useState<AuthenticatedUser | null>('user', () => null);

  const setUser = (user?: AuthenticatedUser | null) => {

    if (user) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
    } else if (user === null) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } else {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        user = JSON.parse(stored);
      }
    }

    // set user to context
    userState.value = user || null;

  }

  return {
    setUser,
    user: userState
  }
}

