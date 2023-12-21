import React, { useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePremiumStatusContext } from '@/hooks/PremiumStatusContext';

import { ToolID } from '@/types/tool';
import { OpenAIModelID } from '@/types/openai';

import HomeContext from '@/pages/api/home/home.context';

const SearchToggle = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const { t } = useTranslation('search');
  const {
    state: { selectedToolId, selectedConversation },
    dispatch: homeDispatch,
  } = useContext(HomeContext);
  const { isPremium } = usePremiumStatusContext();

  const SEARCH_TOOL_ID = ToolID.WEBSEARCH;

  useEffect(() => {
    if (
      selectedConversation?.model.id !== OpenAIModelID.GPT_4 &&
      selectedToolId === SEARCH_TOOL_ID
    ) {
      setIsEnabled(false);
      homeDispatch({
        type: 'SET_SELECTED_TOOL_ID',
        payload: null,
      });
    }
  }, [selectedConversation?.model.id, selectedToolId, homeDispatch]);

  useEffect(() => {
    if (!selectedToolId && isEnabled) {
      homeDispatch({
        type: 'SET_SELECTED_TOOL_ID',
        payload: SEARCH_TOOL_ID,
      });
    } else if (selectedToolId === SEARCH_TOOL_ID && !isEnabled) {
      homeDispatch({
        type: 'SET_SELECTED_TOOL_ID',
        payload: null,
      });
    }
  }, [isEnabled, selectedToolId, homeDispatch]);

  const handleToggleChange = () => {
    if (selectedToolId && selectedToolId !== SEARCH_TOOL_ID) {
      alert(
        t('Cannot enable Search Web plugin while another tool is selected.')
      );
      return;
    }

    if (!isPremium) {
      alert(t('The Search Web plugin is available only for Plus users.'));
      return;
    }

    if (selectedConversation?.model.id !== OpenAIModelID.GPT_4) {
      alert(t('The Search Web plugin is only available with the GPT-4 model.'));
      return;
    }

    setIsEnabled(!isEnabled);
  };

  return (
    <div className="flex w-full flex-row items-center justify-between md:justify-start">
      <label className="mr-2 text-left text-sm text-neutral-700 dark:text-neutral-300">
        {t('Search Web')}
      </label>
      <div className="relative">
        <input
          id="search-toggle"
          type="checkbox"
          className="sr-only"
          checked={isEnabled}
          onChange={handleToggleChange}
        />
        <label
          htmlFor="search-toggle"
          className={`block h-6 w-12 rounded-full transition-colors duration-200 ${
            isEnabled ? 'bg-blue-500' : 'bg-[#555]'
          }`}
        />
        <span
          className={`absolute left-1 top-1 h-4 w-4 transform rounded-full bg-white transition-transform ${
            isEnabled ? 'translate-x-6' : ''
          }`}
        />
      </div>
    </div>
  );
};

export default SearchToggle;
