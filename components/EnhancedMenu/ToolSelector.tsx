import React, { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ToolID } from '@/types/tool';
import { OpenAIModelID } from '@/types/openai';

import { usePremiumStatusContext } from '@/hooks/PremiumStatusContext';

import HomeContext from '@/pages/api/home/home.context';

const ToolSelector = () => {
  const { t } = useTranslation('tool');
  const {
    state: { selectedToolId, selectedConversation },
    dispatch: homeDispatch,
  } = useContext(HomeContext);
  const { isPremium } = usePremiumStatusContext();

  useEffect(() => {
    if (selectedConversation?.model.id) {
      homeDispatch({
        type: 'SET_SELECTED_TOOL_ID',
        payload: null,
      });
    }
  }, [selectedConversation?.model.id, homeDispatch]);

  const toolOnChange = (toolId: string | null) => {
    if (toolId === 'none') {
      homeDispatch({
        type: 'SET_SELECTED_TOOL_ID',
        payload: null,
      });
      return;
    }

    if (selectedToolId === ToolID.WEBSEARCH) {
      alert(
        t('Please disable Search Web plugin before selecting another tool.')
      );
      return;
    }

    if (!isPremium) {
      alert(t('This tool is available only for Plus users.'));
      return;
    }

    if (selectedConversation?.model.id !== OpenAIModelID.GPT_4) {
      alert(t('This tool is only available with the GPT-4 model.'));
      return;
    }

    homeDispatch({
      type: 'SET_SELECTED_TOOL_ID',
      payload: toolId,
    });
  };

  return (
    <div className="flex flex-row items-center justify-between md:justify-start">
      <label className="mr-2 text-left text-sm text-neutral-700 dark:text-neutral-300">
        {t('Tool')}
      </label>
      <div className="w-fit rounded-lg border border-neutral-200 bg-transparent pr-1 text-neutral-900 focus:outline-none dark:border-neutral-600 dark:text-white">
        <select
          className="w-max-20 bg-transparent p-2 focus:outline-none"
          value={selectedToolId || 'none'}
          onChange={(e) => toolOnChange(e.target.value)}
        >
          <option value={'none'} className="dark:bg-[#343541] dark:text-white">
            {t('None')}
          </option>
          <option
            value={ToolID.SUBFINDER}
            className="dark:bg-[#343541] dark:text-white"
          >
            {t('Subfinder: Locate Subdomains')}
          </option>
          <option
            value={ToolID.KATANA}
            className="dark:bg-[#343541] dark:text-white"
          >
            {t('Katana: Crawl Websites')}
          </option>
          <option
            value={ToolID.NAABU}
            className="dark:bg-[#343541] dark:text-white"
          >
            {t('Naabu: Scan Ports')}
          </option>
          <option
            value={ToolID.GAU}
            className="dark:bg-[#343541] dark:text-white"
          >
            {t('GAU: Fetch URLs')}
          </option>
          <option
            value={ToolID.ALTERX}
            className="dark:bg-[#343541] dark:text-white"
          >
            {t('AlterX: Generate Wordlists')}
          </option>
        </select>
      </div>
    </div>
  );
};

export default ToolSelector;
