import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ToolID } from '@/types/tool';
import { OpenAIModelID } from '@/types/openai';
import { usePremiumStatusContext } from '@/hooks/PremiumStatusContext';

import HomeContext from '@/pages/api/home/home.context';

import PluginStoreModal from './PluginStore';
import { availablePlugins } from './PluginStore';

import { usePluginContext } from '@/hooks/PluginProvider';

import { Plugin } from '@/types/plugin';

const PluginSelector = () => {
  const { t } = useTranslation('tool');
  const {
    state: { selectedToolId, selectedConversation },
    dispatch: homeDispatch,
  } = useContext(HomeContext);
  const { isPremium } = usePremiumStatusContext();
  const { state: pluginState, dispatch: pluginDispatch } = usePluginContext();
  const [isPluginStoreOpen, setIsPluginStoreOpen] = useState(false);

  const MAX_PLUGINS = 7;
  const defaultPluginIds = [0, 99];

  useEffect(() => {
    if (selectedConversation?.model.id) {
      homeDispatch({
        type: 'SET_SELECTED_TOOL_ID',
        payload: null,
      });
    }
  }, [selectedConversation?.model.id, homeDispatch]);

  const toolOnChange = (toolId: string | null) => {
    if (selectedToolId === ToolID.WEBSEARCH && toolId !== ToolID.WEBSEARCH) {
      alert(
        t(
          'To select a different plugin, please first turn off the "Search Web" feature.',
        ),
      );
      return;
    }

    if (
      selectedToolId === ToolID.ENHANCEDSEARCH &&
      toolId !== ToolID.ENHANCEDSEARCH &&
      toolId !== 'plugins_store'
    ) {
      alert(
        t(
          'To select a different plugin, please first turn off the "Enhanced Search" feature.',
        ),
      );
      return;
    }

    if (toolId === 'none') {
      homeDispatch({
        type: 'SET_SELECTED_TOOL_ID',
        payload: null,
      });
      return;
    }

    if (
      toolId !== ToolID.SUBFINDER &&
      toolId !== ToolID.ALTERX &&
      toolId !== ToolID.GAU &&
      toolId !== ToolID.CYBERCHEF &&
      toolId !== ToolID.CVEMAP &&
      toolId !== ToolID.GOLINKFINDER &&
      toolId !== 'plugins_store' &&
      selectedConversation?.model.id !== OpenAIModelID.HackerGPT_PRO
    ) {
      alert(t('Use the HackerGPT Pro model for this plugin.'));
      return;
    }

    if (toolId === 'plugins_store') {
      setIsPluginStoreOpen(true);
    } else {
      homeDispatch({
        type: 'SET_SELECTED_TOOL_ID',
        payload: toolId,
      });
    }
  };

  const installPlugin = (plugin: Plugin) => {
    if (pluginState.installedPlugins.some((p) => p.id === plugin.id)) {
      alert('This plugin is already installed.');
      return;
    }

    if (pluginState.installedPlugins.length >= MAX_PLUGINS) {
      alert('You can only install up to ' + MAX_PLUGINS + ' plugins.');
      return;
    }

    pluginDispatch({
      type: 'INSTALL_PLUGIN',
      payload: { ...plugin, isInstalled: true },
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

  const selectorPlugins = updatedAvailablePlugins.filter(
    (plugin) => plugin.isInstalled || defaultPluginIds.includes(plugin.id),
  );

  return (
    <div className="flex flex-row items-center justify-between md:justify-start">
      <label className="mr-2 text-left text-sm text-neutral-700 dark:text-neutral-300">
        {t('Plugins')}
      </label>
      <div className="relative w-fit rounded-lg border border-neutral-200 bg-transparent pr-1 text-neutral-900 focus:outline-none dark:border-neutral-500 dark:text-white">
        <select
          className="cursor-pointer bg-transparent p-2 focus:outline-none"
          value={selectedToolId || 'none'}
          onChange={(e) => toolOnChange(e.target.value)}
        >
          {selectorPlugins.map((tool, key) => (
            <option
              key={key}
              value={tool.value}
              disabled={tool.isPremium && !isPremium}
              className="flex font-sans disabled:text-neutral-500 dark:bg-[#343541] dark:text-white"
            >
              {tool.selectorName}
            </option>
          ))}
        </select>
      </div>
      <PluginStoreModal
        isOpen={isPluginStoreOpen}
        setIsOpen={setIsPluginStoreOpen}
        pluginsData={updatedAvailablePlugins}
        installPlugin={installPlugin}
        uninstallPlugin={uninstallPlugin}
      />
    </div>
  );
};

export default PluginSelector;
