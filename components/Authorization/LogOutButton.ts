import React, { useState, useEffect, useContext } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import HomeContext from '@/pages/api/home/home.context';

export const useLogOut = (onClose?: () => void) => {
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const { dispatch } = useContext(HomeContext) || {};

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsUserLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const clearConversations = () => {
    dispatch({ field: 'conversations', value: [] });
    dispatch({ field: 'selectedConversation', value: null });
    localStorage.removeItem('conversations');
    localStorage.removeItem('selectedConversation');
    window.location.reload();
  };

  const handleLogOut = () => {
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        setIsUserLoggedIn(false);
        clearConversations();

        if (onClose) {
          onClose();
        }
      })
      .catch((error) => {
        console.error('Error during sign out:', error);
      });
  };

  return { isUserLoggedIn, handleLogOut };
};
