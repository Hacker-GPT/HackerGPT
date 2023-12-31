import { IconX, IconSettings, IconKey, IconTrash } from '@tabler/icons-react';
import {
  FC,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import { getSettings, saveSettings } from '@/utils/app/settings';

import { Settings } from '@/types/settings';

import HomeContext from '@/pages/api/home/home.context';

import { getAuth } from 'firebase/auth';
import { initFirebaseApp } from '@/utils/server/firebase-client-init';

import { getPremiumStatus } from '@/components/Payments/getPremiumStatus';
import { getPortalUrl } from '@/components/Payments/stripePayments';

import { useLogOut } from '@/components/Authorization/LogOutButton';
import { useRouter } from 'next/navigation';

import { ApiKey } from '@/types/api';
import { ClipLoader } from 'react-spinners';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const SettingDialog: FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation('settings');
  const settings: Settings = getSettings();
  const { state, dispatch } = useCreateReducer<Settings>({
    initialState: settings,
  });
  const { dispatch: homeDispatch } = useContext(HomeContext);
  const modalRef = useRef<HTMLDivElement>(null);
  const { isUserLoggedIn, handleLogOut } = useLogOut();
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false);
  const [preFetchedPortalUrl, setPreFetchedPortalUrl] = useState<string | null>(
    null,
  );
  const app = initFirebaseApp();
  const auth = getAuth(app);

  const tabs = [
    {
      name: 'General',
      icon: <IconSettings size={22} strokeWidth={2} />,
      isProtected: false,
    },
    {
      name: 'API keys',
      icon: <IconKey size={22} strokeWidth={2} />,
      isProtected: true,
    },
  ];

  const [selectedTab, setSelectedTab] = useState(tabs[0].name);

  const [showTokenPopup, setShowTokenPopup] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [keyName, setKeyName] = useState('');
  const [keyCreated, setKeyCreated] = useState(false);
  const [userApiKeys, setUserApiKeys] = useState<ApiKey[]>([]);

  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [isDeletingKey, setIsDeletingKey] = useState(false);
  const [isFetchingUserApiKeys, setFetchingUserApiKey] = useState(false);

  const [createErrorMessage, setCreateErrorMessage] = useState('');
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const [revokeErrorMessage, setRevokeErrorMessage] = useState('');
  const [isRevokeButtonDisabled, setIsRevokeButtonDisabled] = useState(false);

  const handleCreateNewKey = async () => {
    if (!auth.currentUser) {
      setCreateErrorMessage('User not authenticated');
      setIsButtonDisabled(false);
      return;
    }

    setIsCreatingKey(true);
    setIsButtonDisabled(true);
    setCreateErrorMessage('');

    const createApiKeyUrl = `${process.env.NEXT_PUBLIC_CREATE_API_KEY_FIREBASE_FUNCTION_URL}`;

    try {
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch(createApiKeyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ keyName }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = errorText || `Error code: ${response.status}`;
        setCreateErrorMessage(`Error creating API key: ${errorMessage}`);
        setIsButtonDisabled(false);
        setIsCreatingKey(false);
        return false;
      }

      const newKey = await response.json();
      const creationTime = new Date(newKey.created).toLocaleString();

      setNewToken(newKey.key);
      setShowTokenPopup(true);
      setKeyCreated(true);
      setUserApiKeys((prevKeys) => [
        ...prevKeys,
        { ...newKey, created: creationTime },
      ]);
      setIsCreatingKey(false);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        setCreateErrorMessage('Failed to create key: ' + error.message);
      } else {
        setCreateErrorMessage(
          'Failed to create key: An unknown error occurred',
        );
      }
    } finally {
      setIsButtonDisabled(false);
      setIsCreatingKey(false);
      return false;
    }
  };

  const handleDeleteKey = async (keyId: string | undefined) => {
    if (!auth.currentUser) {
      setRevokeErrorMessage('User not authenticated');
      setIsRevokeButtonDisabled(false);
      return;
    }

    if (!keyId) {
      setRevokeErrorMessage('Key ID is required');
      setIsRevokeButtonDisabled(false);
      return;
    }

    setIsDeletingKey(true);
    setIsRevokeButtonDisabled(true);
    setRevokeErrorMessage('');

    const deleteApiKeyUrl = `${process.env.NEXT_PUBLIC_DELETE_API_KEY_FIREBASE_FUNCTION_URL}`;

    try {
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch(deleteApiKeyUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ keyId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = errorText || `Error code: ${response.status}`;
        setRevokeErrorMessage(`Error deleting API key: ${errorMessage}`);
        setIsRevokeButtonDisabled(false);
        setIsDeletingKey(false);
        return false;
      }

      await response.json();
      setUserApiKeys((prevKeys) => prevKeys.filter((key) => key.id !== keyId));
      setIsRevokeButtonDisabled(false);
      setIsDeletingKey(false);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        setRevokeErrorMessage('Failed to delete key: ' + error.message);
      } else {
        setRevokeErrorMessage(
          'Failed to delete key: An unknown error occurred',
        );
      }
      setIsRevokeButtonDisabled(false);
      setIsDeletingKey(false);
      return false;
    }
  };

  const fetchUserApiKeys = async () => {
    if (!auth.currentUser) {
      console.error('User not authenticated');
      setFetchingUserApiKey(false);
      return;
    }

    setFetchingUserApiKey(true);

    const fetchApiKeysUrl = `${process.env.NEXT_PUBLIC_FETCH_API_KEYS_FIREBASE_FUNCTION_URL}`;

    try {
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch(fetchApiKeysUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        try {
          const errorText = await response.text();
          const errorMessage = errorText || `Error code: ${response.status}`;
          console.error(`Error fetching user API keys: ${errorMessage}`);
          setFetchingUserApiKey(false);
        } catch (parseError) {
          console.error(
            `Error fetching user API keys:, status code: ${response.status}`,
          );
          setFetchingUserApiKey(false);
        }
        return;
      }

      const keys = await response.json();
      setFetchingUserApiKey(false);
      return keys;
    } catch (error) {
      console.error('Error fetching user API keys:', error);
      setFetchingUserApiKey(false);
      return [];
    }
  };

  useEffect(() => {
    const fetchKeysIfPremium = async () => {
      if (selectedTab === 'API keys' && isPremium) {
        const keys = await fetchUserApiKeys();
        setUserApiKeys(keys);
      }
    };

    fetchKeysIfPremium();
  }, [selectedTab, isPremium]);

  const resetPopupState = () => {
    setShowTokenPopup(false);
    setKeyCreated(false);
    setKeyName('');
  };

  const checkPremiumAndPortal = async () => {
    const newPremiumStatus = auth.currentUser
      ? await getPremiumStatus(app)
      : false;
    setIsPremium(newPremiumStatus);
    if (newPremiumStatus && isUserLoggedIn) {
      try {
        const portalUrl = await getPortalUrl(app);
        setPreFetchedPortalUrl(portalUrl);
      } catch (error) {
        console.error('Error pre-fetching portal URL:', error);
      }
    }
  };

  useEffect(() => {
    checkPremiumAndPortal();
  }, [app, auth.currentUser?.uid, isUserLoggedIn]);

  const manageSubscription = () => {
    if (preFetchedPortalUrl) {
      router.push(preFetchedPortalUrl);
    } else {
      (async () => {
        try {
          const portalUrl = await getPortalUrl(app);
          router.push(portalUrl);
        } catch (error) {
          console.error('Error fetching portal URL:', error);
        }
      })();
    }
  };

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        window.addEventListener('mouseup', handleMouseUp);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      window.removeEventListener('mouseup', handleMouseUp);
      onClose();
    };

    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose]);

  useEffect(() => {
    homeDispatch({ field: 'lightMode', value: state.theme });
    saveSettings(state);
  }, [state.theme]);

  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [apiKeyToRevoke, setApiKeyToRevoke] = useState('');
  const [apicensoredKeyToRevoke, setcensoredKeyApiKeyToRevoke] = useState('');

  const handleOpenCreateKeyModal = () => {
    setCreateErrorMessage('');
    setShowTokenPopup(true);
  };

  const handleRevokeClick = (
    apiKey: SetStateAction<string>,
    censoredKey: string,
  ) => {
    setApiKeyToRevoke(apiKey);
    setcensoredKeyApiKeyToRevoke(censoredKey);
    setRevokeErrorMessage('');
    setShowRevokeModal(true);
  };

  const handleRevokeConfirm = async () => {
    if (apiKeyToRevoke) {
      const deletionSuccess = await handleDeleteKey(apiKeyToRevoke);
      if (deletionSuccess) {
        setShowRevokeModal(false);
      }
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="inset-negative-5 fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="fixed inset-0 z-10 overflow-hidden">
        <div className="flex min-h-screen items-center justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
          <div
            className="hidden sm:inline-block sm:h-screen sm:align-middle"
            aria-hidden="true"
          />
          {/* Modal dialog container */}
          <div
            ref={modalRef}
            className="inline-block max-h-[500px] max-h-[80%] w-11/12 transform overflow-y-auto rounded-lg border border-gray-300 bg-white pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:max-h-[600px] sm:w-full sm:max-w-3xl sm:p-2 sm:align-middle dark:border-neutral-400 dark:bg-hgpt-dark-gray"
            role="dialog"
          >
            {/* Close button */}
            <div className="px-4 pt-5 text-black dark:text-neutral-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">{t('Settings')}</h3>
                <button onClick={onClose}>
                  <IconX color="gray" size={22} strokeWidth={2} />
                </button>
              </div>
              <hr className="my-4 border-hgpt-chat-gray dark:border-white" />
            </div>

            {/* Tabbed Layout */}
            <div className="flex flex-col sm:flex-col">
              {/* Sidebar with tabs */}
              <div>
                <nav
                  className="flex justify-start justify-center"
                  aria-label="Sidebar"
                >
                  {tabs.map((tab) => {
                    // Only show the tab if it is not protected, or if it is protected and the user is a premium, logged-in user
                    if (
                      !tab.isProtected ||
                      (tab.isProtected && isUserLoggedIn)
                    ) {
                      return (
                        <button
                          key={tab.name}
                          onClick={() => setSelectedTab(tab.name)}
                          className={`mb-2 mr-2 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium sm:mb-2 sm:mr-0 sm:justify-start ${
                            selectedTab === tab.name
                              ? 'bg-hgpt-hover-white text-black dark:bg-hgpt-chat-gray dark:text-neutral-200'
                              : 'text-black hover:bg-gray-100 dark:text-neutral-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {tab.icon}
                          <span className="ml-2">{tab.name}</span>
                        </button>
                      );
                    }
                    return null;
                  })}
                </nav>
              </div>

              {/* Content for the selected tab */}
              <div className="w-full p-6">
                {selectedTab === 'General' && (
                  <div>
                    <div className="mb-2 text-sm font-bold text-black dark:text-neutral-200">
                      {t('Theme')}
                    </div>

                    <select
                      className="w-full cursor-pointer bg-transparent p-2 text-neutral-700 dark:text-neutral-200"
                      value={state.theme}
                      onChange={(event) =>
                        dispatch({ field: 'theme', value: event.target.value })
                      }
                    >
                      <option value="dark">{t('Dark mode')}</option>
                      <option value="light">{t('Light mode')}</option>
                    </select>
                    {isPremium && isUserLoggedIn && (
                      <button
                        type="button"
                        className="mt-6 w-full rounded-lg border border border-gray-300 bg-white px-4 py-2 text-black shadow hover:bg-hgpt-hover-white dark:bg-hgpt-dark-gray dark:text-white dark:hover:bg-hgpt-medium-gray"
                        onClick={manageSubscription}
                      >
                        <span>Manage Subscription</span>
                      </button>
                    )}
                    {isUserLoggedIn ? (
                      <>
                        <button
                          type="button"
                          className="mt-6 w-full rounded-lg border border-red-700 bg-red-600 px-4 py-2 text-white shadow hover:bg-red-500 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-red-700 dark:text-white dark:hover:bg-red-500"
                          onClick={handleLogOut}
                        >
                          Log Out
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
                {selectedTab === 'API keys' && (
                  <div>
                    {isPremium && isUserLoggedIn ? (
                      <>
                        <div className="text-left">
                          <p className="mb-4 text-black dark:text-white">
                            Your secret API keys are listed below. Please note
                            that we do not display your secret API keys again
                            after you generate them.
                          </p>
                          <p className="mb-4 text-black dark:text-white">
                            Do not share your API key with others, or expose it
                            in the browser or other client-side code.
                          </p>
                          <p className="mb-4 text-black dark:text-white">
                            Check our{' '}
                            <a
                              href="https://hackergpt.gitbook.io/chat/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-600"
                            >
                              API documentation
                            </a>{' '}
                            for guidance.
                          </p>
                        </div>
                        {isFetchingUserApiKeys ? (
                          <div className="flex justify-center py-4">
                            <ClipLoader size={30} color="white" />
                          </div>
                        ) : userApiKeys.length > 0 ? (
                          <div className="mb-4 overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-center">
                              <thead className="bg-white dark:bg-hgpt-dark-gray">
                                <tr>
                                  <th
                                    scope="col"
                                    className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-black dark:text-white"
                                  >
                                    Name
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-black dark:text-white"
                                  >
                                    Key
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-black dark:text-white"
                                  >
                                    Created
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-black dark:text-white"
                                  >
                                    Last Used
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-black dark:text-white"
                                  ></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 bg-white text-center dark:bg-hgpt-dark-gray">
                                {userApiKeys.map((key, index) => (
                                  <tr key={index}>
                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-black dark:text-white">
                                      {key.keyName.length > 15
                                        ? `${key.keyName.substring(0, 15)}...`
                                        : key.keyName}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-black dark:text-white">
                                      {key.censoredKey}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-black dark:text-white">
                                      {key.created
                                        ? new Date(
                                            key.created,
                                          ).toLocaleDateString()
                                        : 'Never'}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-black dark:text-white">
                                      {key.lastUsed
                                        ? new Date(
                                            key.lastUsed,
                                          ).toLocaleDateString()
                                        : 'Never'}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium">
                                      <button
                                        onClick={() =>
                                          handleRevokeClick(
                                            key.id,
                                            key.censoredKey,
                                          )
                                        }
                                        className="text-black hover:text-hgpt-chat-gray dark:text-white dark:hover:text-hgpt-hover-white"
                                      >
                                        <IconTrash size={18} strokeWidth={2} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-4 text-center">
                            No API keys found.
                          </div>
                        )}
                        <button
                          type="button"
                          className="mt-4 w-full rounded-lg bg-blue-500 px-4 py-2 text-white shadow hover:bg-blue-600 focus:outline-none"
                          onClick={handleOpenCreateKeyModal}
                        >
                          Create New Secret Key
                        </button>
                      </>
                    ) : (
                      <div className="text-black dark:text-white">
                        To use the HackerGPT API with your app and create API
                        keys, you need to have a Plus Subscription.
                      </div>
                    )}
                  </div>
                )}
                {showTokenPopup && (
                  <div className="z-60 fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="m-4 mx-auto max-w-lg rounded bg-white p-6 shadow dark:bg-hgpt-dark-gray">
                      <div className="flex flex-col">
                        <div className="mb-4 flex w-full items-center justify-between">
                          <h2 className="text-lg font-bold text-black dark:text-white">
                            Create an API Key
                          </h2>
                          <button onClick={resetPopupState}>
                            <IconX color="gray" size={22} strokeWidth={2} />
                          </button>
                        </div>
                        {!keyCreated ? (
                          <>
                            <h2 className="mb-2 text-sm text-black dark:text-white">
                              Name your key
                            </h2>
                            <input
                              type="text"
                              placeholder="My Test Key"
                              value={keyName}
                              onChange={(e) => setKeyName(e.target.value)}
                              className="mb-4 w-full rounded bg-hgpt-light-gray p-2 text-white dark:bg-hgpt-medium-gray"
                            />
                            {createErrorMessage && (
                              <div className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">
                                {createErrorMessage}
                              </div>
                            )}
                            <button
                              className="mt-4 w-full rounded bg-blue-500 px-4 py-2 text-white"
                              onClick={handleCreateNewKey}
                              disabled={
                                !keyName || isButtonDisabled || isCreatingKey
                              }
                            >
                              {isCreatingKey ? (
                                <ClipLoader size={20} color="white" />
                              ) : (
                                'Create'
                              )}
                            </button>
                          </>
                        ) : (
                          <>
                            <h2 className="mb-2 self-start text-sm text-black dark:text-white">
                              Your new key:
                            </h2>{' '}
                            <p className="mb-4 w-full rounded bg-hgpt-light-gray p-2 text-white dark:bg-hgpt-medium-gray">
                              {newToken}
                            </p>
                            <p className="mb-4 self-start text-sm text-black dark:text-white">
                              Please copy it now and write it down somewhere
                              safe. You will not be able to see it again.
                            </p>{' '}
                            <button
                              className="w-full rounded bg-blue-500 px-4 py-2 text-white"
                              onClick={() => {
                                setShowTokenPopup(false);
                                setKeyCreated(false);
                              }}
                            >
                              Done
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {showRevokeModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="m-4 mx-auto max-w-sm rounded-lg bg-white p-6 dark:bg-hgpt-dark-gray">
                      <div className="flex flex-col">
                        <h3 className="mb-4 text-lg font-bold text-black dark:text-white">
                          Revoke secret key
                        </h3>
                        <p className="mb-4 text-sm text-black dark:text-white">
                          This API key will immediately be disabled. API
                          requests made using this key will be rejected, which
                          could cause any systems still depending on it to
                          break. Once revoked, you&apos;ll no longer be able to
                          view or modify this API key.
                        </p>
                        <div className="mb-4 w-full rounded bg-hgpt-light-gray p-2 text-white dark:bg-hgpt-medium-gray">
                          {apicensoredKeyToRevoke}
                        </div>
                        {revokeErrorMessage && (
                          <div className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">
                            {revokeErrorMessage}
                          </div>
                        )}
                        <div className="flex justify-end space-x-2">
                          <button
                            className="rounded bg-gray-300 px-4 py-2 text-black hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700"
                            onClick={() => setShowRevokeModal(false)}
                          >
                            Cancel
                          </button>
                          <button
                            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                            onClick={handleRevokeConfirm}
                            disabled={isRevokeButtonDisabled || isDeletingKey}
                          >
                            {isDeletingKey ? (
                              <ClipLoader size={20} color="white" />
                            ) : (
                              'Revoke key'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
