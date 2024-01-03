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

  const tools = [
    { name: t('None'), value: 'none', isPremium: false },
    {
      name: t('Subfinder: Locate Subdomains'),
      value: ToolID.SUBFINDER,
      isPremium: false,
    },
    {
      name: t('Nuclei: Discover Vulnerabilities'),
      value: ToolID.NUCLEI,
      isPremium: true,
    },
    {
      name: t('Katana: Crawl Websites'),
      value: ToolID.KATANA,
      isPremium: true,
    },
    { name: t('HttpX: Web Analysis'), value: ToolID.HTTPX, isPremium: true },
    { name: t('Naabu: Scan Ports'), value: ToolID.NAABU, isPremium: true },
  ];

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
        t('Please disable Search Web plugin before selecting another tool.'),
      );
      return;
    }

    if (
      toolId !== ToolID.SUBFINDER &&
      selectedConversation?.model.id !== OpenAIModelID.GPT_4
    ) {
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
      <div className="w-fit rounded-lg border border-neutral-200 bg-transparent pr-1 text-neutral-900 focus:outline-none dark:border-neutral-500 dark:text-white">
        <select
          className="w-max-20 cursor-pointer bg-transparent p-2 focus:outline-none"
          value={selectedToolId || 'none'}
          onChange={(e) => toolOnChange(e.target.value)}
        >
          {tools.map((tool, key) => (
            <option
              key={key}
              value={tool.value}
              disabled={tool.isPremium && !isPremium}
              className="flex justify-between font-sans disabled:!cursor-not-allowed disabled:text-neutral-500 dark:bg-[#343541] dark:text-white"
            >
              {tool.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ToolSelector;
