import React, { useState, useEffect } from 'react';
import { IconX, IconAlertCircle, IconMailUp } from '@tabler/icons-react';
import firebase from '@/utils/server/firebase-client-init';
import 'firebase/auth';

interface Parameters {
  isOpen: boolean;
  onClose: () => void;
}

const LoginSignupPopup: React.FC<Parameters> = ({ isOpen, onClose }) => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [error, setError] = useState<null | string>(null);
  const [emailError, setEmailError] = useState<null | string>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      setUser(user ? user : null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleClose = () => {
    onClose();
  };

  const handleGoogleSignIn = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();

    try {
      await firebase.auth().signInWithPopup(provider);
      setError(null);
      handleClose();
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  function signInWithTwitter() {
    const provider = new firebase.auth.TwitterAuthProvider();

    firebase
      .auth()
      .signInWithPopup(provider)
      .then((result) => {
        if (result.credential) {
          const twitterCredential =
            result.credential as firebase.auth.OAuthCredential;
          handleClose();
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }

  const handleSendSignInLinkToEmail = async (email: string) => {
    const actionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: true,
    };
    try {
      await firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings);
      setEmailError(null);
      setEmailSent(true);
      window.localStorage.setItem('emailForSignIn', email);
    } catch (error: any) {
      switch (error.code) {
        case 'auth/invalid-email':
          setEmailError('Invalid email address. Please enter a valid email.');
          break;
        case 'auth/network-request-failed':
          setEmailError(
            'Network error. Please check your internet connection and try again.',
          );
          break;
        default:
          setEmailError('An error occurred. Please try again later.');
          break;
      }
    }
  };

  return (
    <div
      className={`inset-negative-5 fixed inset-0 z-50 flex items-center justify-center overflow-y-auto ${
        isOpen ? 'block' : 'hidden'
      }`}
    >
      <div className="absolute inset-0 bg-black opacity-30"></div>
      <div className="relative z-50 m-auto w-full max-w-md overflow-hidden rounded-lg border border-gray-300 bg-white text-white dark:bg-hgpt-dark-gray">
        <div
          className="absolute right-2 top-2 flex h-10 w-10 cursor-pointer items-center justify-center"
          onClick={onClose}
        >
          <IconX color="gray" size={22} strokeWidth={2} />
        </div>
        <div className="p-6 pb-2 pt-12">
          <div className="flex w-full flex-col items-center justify-center space-y-4 p-8 pb-2 pt-2">
            <h1 className="pb-4 pt-2 text-3xl font-bold text-black dark:text-white">
              {isCreatingAccount ? 'Create Your Account' : 'Welcome Back'}
            </h1>
            <button
              onClick={handleGoogleSignIn}
              className="flex w-full items-center justify-center rounded border border-gray-300 bg-white px-4 py-2 text-lg text-black hover:bg-hgpt-hover-white dark:bg-hgpt-dark-gray dark:text-white dark:hover:bg-hgpt-medium-gray"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="icon icon-tabler icon-tabler-brand-google mr-2"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <path d="M17.788 5.108a9 9 0 1 0 3.212 6.892h-8"></path>
              </svg>
              {isCreatingAccount ? 'Sign up with Google' : 'Log in with Google'}
            </button>
            <button
              onClick={signInWithTwitter}
              className="flex w-full items-center justify-center rounded border border-gray-300 bg-white px-4 py-2 text-lg text-black hover:bg-hgpt-hover-white dark:bg-hgpt-dark-gray dark:text-white dark:hover:bg-hgpt-medium-gray"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="icon icon-tabler icon-tabler-brand-x mr-2"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <path d="M4 4l11.733 16h4.267l-11.733 -16z"></path>
                <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path>
              </svg>
              {isCreatingAccount
                ? 'Sign up with Twitter / X'
                : 'Log in with Twitter / X'}
            </button>
            <span className="mx-4 text-black dark:text-white">OR</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="flex w-full items-center justify-center rounded border border-gray-300 bg-white px-4 py-2 text-lg text-black hover:bg-hgpt-hover-white dark:bg-hgpt-dark-gray dark:text-white dark:hover:bg-hgpt-medium-gray"
            />
            {emailError && (
              <div className="flex items-center justify-center text-center text-xs text-red-500 ">
                <IconAlertCircle size={18} className="mr-2" />
                {emailError}
              </div>
            )}
            {emailSent && (
              <div className="flex items-center justify-center text-center text-xs text-green-500 ">
                <IconMailUp size={18} className="mr-2" />
                {'Email link sent successfully!'}
              </div>
            )}
            <button
              onClick={() => handleSendSignInLinkToEmail(email)}
              className="flex w-full items-center justify-center rounded border border-gray-300 bg-white px-4 py-2 text-lg text-black hover:bg-hgpt-hover-white dark:bg-hgpt-dark-gray dark:text-white dark:hover:bg-hgpt-medium-gray"
            >
              {isCreatingAccount
                ? 'Sign up with Email Link'
                : 'Log in with Email Link'}
            </button>
            <div className="mt-2 flex items-center justify-center text-center text-sm text-black dark:text-white">
              <IconAlertCircle size={18} className="mr-2" />
              No free messages with Email Link method.
            </div>
          </div>
          {error && (
            <div className="flex items-center justify-center py-2 pb-2 text-center text-xs text-red-500">
              <IconAlertCircle size={18} className="mr-2" />
              {error}
            </div>
          )}
        </div>
        <div className="pb-2 pt-2 text-center text-xs text-black dark:text-white">
          By using HackerGPT, you agree to our{' '}
          <a
            href="/terms-and-conditions"
            target="_blank"
            className="font-semibold underline"
          >
            Terms of Use
          </a>
          .
        </div>
        <div className="flex justify-center p-6 pb-5 pt-6">
          {isCreatingAccount ? (
            <button
              onClick={() => {
                setIsCreatingAccount(false);
                setError('');
              }}
              className="text-black dark:text-white"
            >
              Already have an account?{' '}
              <span className="font-semibold">Log in</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setIsCreatingAccount(true);
                setError('');
              }}
              className="text-black dark:text-white"
            >
              Don&apos;t have an account?{' '}
              <span className="font-semibold">Sign up</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginSignupPopup;
