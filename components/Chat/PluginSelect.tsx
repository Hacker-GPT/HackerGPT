import { useEffect, useState, useContext } from 'react';
import { useTranslation } from 'next-i18next';
import { OpenAIModel } from '@/types/openai';
import HomeContext from '@/pages/api/home/home.context';

import { getAuth } from 'firebase/auth';
import { initFirebaseApp } from '@/utils/server/firebase-client-init';

import { getPremiumStatus } from '@/components/Payments/getPremiumStatus';

export const PluginSelect = () => {
  const { t } = useTranslation('chat');
  const [isPremium, setIsPremium] = useState(false);
  const app = initFirebaseApp();
  const auth = getAuth(app);

  const {
    state: { selectedConversation, models, defaultModelId },
    handleUpdateConversation,
  } = useContext(HomeContext);

  const handleModelChange = (modelId: string) => {
    selectedConversation &&
      handleUpdateConversation(selectedConversation, {
        key: 'model',
        value: models.find((model) => model.id === modelId) as OpenAIModel,
      });
  };

  useEffect(() => {
    const checkPremium = async () => {
      const newPremiumStatus = auth.currentUser
        ? await getPremiumStatus(app)
        : false;
      setIsPremium(newPremiumStatus);
    };
    checkPremium();
  }, [auth.currentUser?.uid]);

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

  const [selectedModel, setSelectedModel] = useState(
    selectedConversation?.model?.id || defaultModelId
  );

  return (
    <div className="flex flex-col">
      <div className="mb-1 w-full rounded border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
        <select
          className="w-full cursor-pointer bg-transparent p-2"
          value={selectedModel}
          onChange={(e) => {
            const modelName = models.find(
              (model) => model.id === e.target.value
            )?.name;
            if (modelName) {
              handleModuleClick(modelName);
            }
            setSelectedModel(e.target.value);
            handleModelChange(e.target.value);
          }}
        >
          {models
            .sort((a, b) => {
              if (a.name === 'Web Browsing (GPT-4') return 1;
              if (b.name === 'Web Browsing (GPT-4') return -1;
              if (a.name === 'HackerGPT') return -1;
              if (b.name === 'HackerGPT') return 1;
              if (a.name === 'GPT-4') return -1;
              if (b.name === 'GPT-4') return 1;
              return a.name.localeCompare(b.name);
            })
            .map((model) => (
              <option
                key={model.id}
                value={model.id}
                disabled={
                  (model.name === 'GPT-4' ||
                    model.name === 'Web Browsing (GPT-4)') &&
                  !isPremium
                }
                className={`dark:bg-hgpt-medium-gray dark:text-white ${
                  selectedModel === model.id
                    ? 'rounded-lg bg-white text-gray-900 dark:bg-hgpt-medium-gray dark:text-gray-100'
                    : 'text-gray-500'
                }`}
              >
                {model.name}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
};
