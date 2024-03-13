import { useState, useContext, useRef } from 'react';
import { IconLock, IconBuildingStore } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';

import { RenderModuleBenefits } from '@/components/Chat/RenderModuleBenefits';
import HomeContext from '@/pages/api/home/home.context';

import { usePremiumStatusContext } from '@/hooks/PremiumStatusContext';
import { usePluginContext } from '@/hooks/PluginProvider';

import PluginStoreModal from '@/components/EnhancedMenu/PluginStore';
import { availablePlugins } from '@/components/EnhancedMenu/PluginStore';
import { HackerGPTSVG } from './hackergpt-svg';

export const ModelSelect = () => {
  const { t } = useTranslation('chat');
  const [showBenefits, setShowBenefits] = useState(false);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  const timeoutRef = useRef<number | null>(null);

  const { isPremium } = usePremiumStatusContext();

  const handleModuleClick = (modelName: string) => {
    if (modelName === 'Plugins') {
      setIsPluginModalOpen(true);
      return;
    }
    if (
      (modelName === 'HackerGPT Pro' || modelName === 'Web Browsing (GPT-4)') &&
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

  const { state: pluginState, dispatch: pluginDispatch } = usePluginContext();
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);

  const [selectedModel, setSelectedModel] = useState<string | undefined>(
    selectedConversation?.model?.id || defaultModelId,
  );

  const openPluginStore = () => {
    setIsPluginModalOpen(true);
  };

  const MAX_PLUGINS = 7;

  const installPlugin = (plugin: Plugin) => {
    if (pluginState.installedPlugins.some((p) => p.id === (plugin as any).id)) {
      alert('This plugin is already installed.');
      return;
    }

    if (pluginState.installedPlugins.length >= MAX_PLUGINS) {
      alert('You can only install up to ' + MAX_PLUGINS + ' plugins.');
      return;
    }

    pluginDispatch({
      type: 'INSTALL_PLUGIN',
      payload: { ...(plugin as any), isInstalled: true },
    });
  };

  const uninstallPlugin = (pluginId: number) => {
    if (!pluginState.installedPlugins.some((p) => p.id === pluginId)) {
      alert('This plugin is not installed.');
      return;
    }

    pluginDispatch({
      type: 'UNINSTALL_PLUGIN',
      payload: pluginId,
    });
  };

  // Update the availablePlugins array to include the isInstalled property
  const updatedAvailablePlugins = availablePlugins.map((plugin) => {
    const isInstalled = pluginState.installedPlugins.some(
      (p) => p.id === plugin.id,
    );
    return { ...plugin, isInstalled };
  });

  return (
    <div className="relative flex flex-col items-stretch justify-center gap-0 sm:items-center">
      <div className="flex rounded-xl bg-gray-100 p-1 text-hgpt-medium-gray dark:bg-hgpt-dark-gray">
        <ul className="flex w-full list-none gap-1 sm:w-auto">
          {models
            .sort((a, b) => {
              if (a.name === 'HackerGPT') return -1;
              if (b.name === 'HackerGPT') return 1;
              if (a.name === 'HackerGPT Pro') return -1;
              if (b.name === 'HackerGPT Pro') return 1;
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
                  <div className="group/button relative flex w-full items-center justify-center gap-1 rounded-lg py-3 outline-none transition-opacity duration-100 sm:w-auto sm:min-w-[170px] md:gap-2 md:py-3">
                    {model.name === 'HackerGPT' ? (
                      <div className="pl-2">
                        <HackerGPTSVG scale={0.1} />
                      </div>
                    ) : (
                      <HackerGPTSVG scale={0.1} />
                    )}
                    <span className="truncate text-sm font-medium">
                      {model.id === defaultModelId
                        ? `${model.name}`
                        : model.name}
                    </span>
                    {index === 1 && !isPremium && (
                      <div className="pr-2">
                        <IconLock color={'#6b7280'} size={18} strokeWidth={2} />
                      </div>
                    )}
                  </div>
                </button>
              </li>
            ))}
        </ul>
      </div>
      <div className="mb-2 flex justify-center">
        <button
          type="button"
          className="w-auto min-w-[150px] max-w-xs cursor-pointer rounded-b-xl bg-gray-100 text-gray-900 dark:bg-hgpt-dark-gray dark:text-gray-100"
          onClick={openPluginStore}
        >
          <div className="flex items-center justify-center gap-1 py-2">
            <IconBuildingStore size={20} className="pl-1" />

            <span className="truncate pr-1.5 text-sm font-medium">
              Plugin Store
            </span>
          </div>
        </button>
      </div>

      {showBenefits && (
        <div
          onMouseEnter={handleBenefitsEnter}
          onMouseLeave={handleBenefitsLeave}
        >
          <RenderModuleBenefits moduleName={hoveredModule} />
        </div>
      )}
      {isPluginModalOpen && (
        <PluginStoreModal
          isOpen={isPluginModalOpen}
          setIsOpen={setIsPluginModalOpen}
          pluginsData={updatedAvailablePlugins}
          installPlugin={installPlugin}
          uninstallPlugin={uninstallPlugin}
        />
      )}
    </div>
  );
};
