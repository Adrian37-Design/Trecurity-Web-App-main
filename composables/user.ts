
import { type User } from '@prisma/client'

const LOCAL_STORAGE_KEY = 'user-d3f0d7b7-464b-4417-8a61-98e59c162268'; 

export const useUser = () => {

  const userState = useState<User|null>('user', () => null);

  const setUser = (user?: User | null ) => {
   
    if (user) {
       localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
    } else if (user === null) {
       localStorage.removeItem(LOCAL_STORAGE_KEY);
    } else {
       user = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
    }
    
    // set user to context
    userState.value = user;
 
  }

  return {
    setUser,
    user: userState
  }
}

