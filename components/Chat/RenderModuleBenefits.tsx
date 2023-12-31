import React, { useState } from 'react';
import UpgradeToPremiumPopup from '@/components/Payments/UpgradeToPremiumPopup';

import { usePremiumStatusContext } from '@/hooks/PremiumStatusContext';

type ModuleBenefits = {
  title: string;
  description: string;
  feature?: string;
  extra?: string;
  buttonText?: string;
  beta?: boolean;
};

export function RenderModuleBenefits(props: { moduleName: string | null }) {
  const [isUpgradePopupOpen, setIsUpgradePopupOpen] = useState(false);

  const { user, isPremium, checkoutUrl, loading } = usePremiumStatusContext();

  let benefits: ModuleBenefits = {
    title: '',
    description: '',
  };

  switch (props.moduleName) {
    case 'HackerGPT':
      benefits = {
        title: 'AI + Hacker Wisdom: Unbeatable Combo',
        feature: 'Constantly updated with fresh hacker knowledge',
        description: 'Available to Free and Plus users',
        extra: 'Unlimited to Plus users',
        beta: true,
      };
      break;
    case 'GPT-4':
      benefits = {
        title: "Hacker's Dream AI",
        feature: 'Ready for complex challenges',
        description: 'Available exclusively to Plus users',
        extra: 'Includes Exclusive Web Browsing plugin',
        buttonText: 'Upgrade to Plus',
      };
      break;
    default:
      benefits = {
        title: 'Unknown Module',
        description: 'This module is not recognized.',
      };
      break;
  }

  const handleUpgradePopupOpen = () => {
    setIsUpgradePopupOpen(true);
  };

  const handleUpgradePopupClose = () => {
    setIsUpgradePopupOpen(false);
  };

  return (
    <div className="group/options shadow-xxs dark:shadow-xs mx-2 flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white text-left sm:mx-1 dark:border-gray-800 dark:bg-hgpt-dark-gray dark:text-gray-100">
      <div className="flex flex-col gap-2.5 whitespace-pre-line px-5 py-4 text-sm sm:text-base">
        <span className="block text-gray-900 dark:text-white">
          {benefits.title}
        </span>
        {benefits.feature && (
          <span className="block text-xs text-gray-500">
            {benefits.feature}
          </span>
        )}
        <span className="block text-xs text-gray-500">
          {benefits.description}
        </span>
        {benefits.extra && (
          <span className="block text-xs text-gray-500">{benefits.extra}</span>
        )}
      </div>
      {(benefits.buttonText && user && !isPremium && !loading) ||
      benefits.beta ? (
        <div
          role="group"
          className="mb-1 max-h-[calc(100vh-300px)] overflow-auto border-t border-gray-200 text-sm dark:border-hgpt-medium-gray"
        >
          {benefits.buttonText && (
            <div className="px-5 py-3">
              <button
                className="rounded bg-green-600 px-4 py-2 font-bold text-white transition duration-200 hover:bg-green-700"
                onClick={handleUpgradePopupOpen}
              >
                {benefits.buttonText}
              </button>
            </div>
          )}
          {benefits.beta && (
            <div className="px-5 py-3">
              <span className="py-0.25 rounded bg-blue-200 px-1 text-sm font-bold capitalize text-blue-500">
                beta
              </span>
            </div>
          )}
        </div>
      ) : null}
      <div className="z-50">
        <UpgradeToPremiumPopup
          isOpen={isUpgradePopupOpen}
          onClose={handleUpgradePopupClose}
          checkoutUrl={checkoutUrl}
        />
      </div>
    </div>
  );
}
