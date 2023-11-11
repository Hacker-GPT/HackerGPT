import { useEffect, useState, useContext, useRef } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { IconBrandOpenai } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';

import firebase from '@/utils/server/firebase-client-init';
import { initFirebaseApp } from '@/utils/server/firebase-client-init';
import { getPremiumStatus } from '@/components/Payments/getPremiumStatus';
import { RenderModuleBenefits } from '@/components/Chat/RenderModuleBenefits';
import HomeContext from '@/pages/api/home/home.context';

export const ModelSelect = () => {
  const { t } = useTranslation('chat');
  const [user, setUser] = useState<firebase.User | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  const timeoutRef = useRef<number | null>(null);

  const app = initFirebaseApp();
  const auth = getAuth(app);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser as firebase.User | null);
    });

    const checkPremium = async () => {
      const newPremiumStatus = auth.currentUser
        ? await getPremiumStatus(app)
        : false;
      setIsPremium(newPremiumStatus);
    };
    checkPremium();

    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [app, auth.currentUser?.uid]);

  const handleModuleClick = (modelName: string) => {
    if (
      (modelName === 'GPT-4' || modelName === 'Web Browsing (GPT-4)') &&
      !isPremium
    ) {
      return;
    }

    const selectedModel = models.find((model) => model.name === modelName);
    if (selectedModel) {
      setSelectedModel(selectedModel.id);
      handleModelChange(selectedModel.id);
    }
  };

  const {
    state: { selectedConversation, models, defaultModelId },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const updatedModel = models.find((model) => model.id === e.target.value);
    selectedConversation &&
      handleUpdateConversation(selectedConversation, {
        key: 'model',
        value: updatedModel || null,
      });
  };

  const handleModelChange = (modelId: string) => {
    const mockEvent = {
      target: {
        value: modelId,
      },
    } as React.ChangeEvent<HTMLSelectElement>;

    handleChange(mockEvent);
  };

  const handleModuleEnter = (modelName: string) => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    setHoveredModule(modelName);
    setShowBenefits(true);
  };

  const handleModuleLeave = () => {
    timeoutRef.current = window.setTimeout(() => {
      setShowBenefits(false);
      setHoveredModule(null);
    }, 300);
  };

  const handleBenefitsEnter = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleBenefitsLeave = () => {
    timeoutRef.current = window.setTimeout(() => {
      setShowBenefits(false);
      setHoveredModule(null);
    }, 300);
  };

  const [selectedModel, setSelectedModel] = useState<string | undefined>(
    selectedConversation?.model?.id || defaultModelId
  );

  return (
    <div className="relative flex flex-col items-stretch justify-center gap-2 sm:items-center">
      <div className="relative flex rounded-xl bg-gray-100 p-1 text-hgpt-medium-gray dark:bg-hgpt-dark-gray">
        <ul className="flex w-full list-none gap-1 sm:w-auto">
          {models
            .filter((model) => model.name !== 'Web Browsing (GPT-4)')
            .sort((a, b) => {
              if (a.name === 'HackerGPT') return -1;
              if (b.name === 'HackerGPT') return 1;
              if (a.name === 'GPT-4') return -1;
              if (b.name === 'GPT-4') return 1;
              return a.name.localeCompare(b.name);
            })
            .map((model, index) => (
              <li key={model.id} className="group/toggle w-full">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded="false"
                  data-state="closed"
                  className={`w-full cursor-pointer ${
                    selectedModel === model.id
                      ? 'rounded-lg border-black/10 bg-white text-gray-900 dark:bg-hgpt-medium-gray dark:text-gray-100'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:dark:text-gray-100'
                  }`}
                  onClick={() => handleModuleClick(model.name)}
                  onMouseEnter={() => handleModuleEnter(model.name)}
                  onMouseLeave={handleModuleLeave}
                >
                  <div className="group/button relative flex w-full items-center justify-center gap-1 rounded-lg py-3 outline-none transition-opacity duration-100 sm:w-auto sm:min-w-[150px] md:gap-2 md:py-3">
                    {model.name === 'HackerGPT' ? (
                      <div className="pl-2">
                        <IconBrandOpenai size={20} />
                      </div>
                    ) : (
                      <div className="pl-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="none"
                          className="icon-sm group-hover/button:text-brand-purple transition-colors"
                          width="16"
                          height="16"
                        >
                          <path
                            d="M12.784 1.442a.8.8 0 0 0-1.569 0l-.191.953a.8.8 0 0 1-.628.628l-.953.19a.8.8 0 0 0 0 1.57l.953.19a.8.8 0 0 1 .628.629l.19.953a.8.8 0 0 0 1.57 0l.19-.953a.8.8 0 0 1 .629-.628l.953-.19a.8.8 0 0 0 0-1.57l-.953-.19a.8.8 0 0 1-.628-.629l-.19-.953h-.002ZM5.559 4.546a.8.8 0 0 0-1.519 0l-.546 1.64a.8.8 0 0 1-.507.507l-1.64.546a.8.8 0 0 0 0 1.519l1.64.547a.8.8 0 0 1 .507.505l.546 1.641a.8.8 0 0 0 1.519 0l.546-1.64a.8.8 0 0 1 .506-.507l1.641-.546a.8.8 0 0 0 0-1.519l-1.64-.546a.8.8 0 0 1-.507-.506L5.56 4.546Zm5.6 6.4a.8.8 0 0 0-1.519 0l-.147.44a.8.8 0 0 1-.505.507l-.441.146a.8.8 0 0 0 0 1.519l.44.146a.8.8 0 0 1 .507.506l.146.441a.8.8 0 0 0 1.519 0l.147-.44a.8.8 0 0 1 .506-.507l.44-.146a.8.8 0 0 0 0-1.519l-.44-.147a.8.8 0 0 1-.507-.505l-.146-.441Z"
                            fill="currentColor"
                          ></path>
                        </svg>
                      </div>
                    )}
                    <span className="truncate pr-1.5 text-sm font-medium md:pr-1.5">
                      {model.id === defaultModelId
                        ? `${model.name}`
                        : model.name}
                    </span>
                    {index === 1 && !isPremium && (
                      <div className="pr-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                          className="icon-sm group-hover/button:text-brand-purple ml-0.5 -ml-2 !text-gray-500 transition-colors group-hover/options:text-gray-500 sm:ml-0"
                          width="16"
                          height="16"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              </li>
            ))}
        </ul>
      </div>
      {showBenefits && (
        <div
          onMouseEnter={handleBenefitsEnter}
          onMouseLeave={handleBenefitsLeave}
        >
          <RenderModuleBenefits moduleName={hoveredModule} />
        </div>
      )}
    </div>
  );
};
