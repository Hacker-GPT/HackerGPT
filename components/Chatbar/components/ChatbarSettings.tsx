import {
  IconSettings,
  IconUserCircle,
  IconLogin,
  IconDots,
  IconLockOpen,
  IconInfoCircle,
  IconBrandGithub,
} from '@tabler/icons-react';

import { useState, useContext } from 'react';

import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';

import { SettingDialog } from '@/components/Settings/SettingDialog';

import { SidebarButton } from '../../Sidebar/SidebarButton';
import ChatbarContext from '../Chatbar.context';
import { ClearConversations } from './ClearConversations';

import LoginSignupPopup from '@/components/Authorization/LoginSignupPopup';

import UpgradeToPremiumPopup from '@/components/Payments/UpgradeToPremiumPopup';
import { usePremiumStatusContext } from '@/hooks/PremiumStatusContext';

export const ChatbarSettings = () => {
  const { t } = useTranslation('sidebar');
  const [isSettingDialogOpen, setIsSettingDialog] = useState<boolean>(false);
  const [isUpgradePopupOpen, setIsUpgradePopupOpen] = useState(false);

  const { user, isPremium, checkoutUrl, loading } = usePremiumStatusContext();

  const {
    state: { conversations },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const { handleClearConversations } = useContext(ChatbarContext);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleLoginModalOpen = () => {
    setIsLoginModalOpen(true);
  };

  const handleLoginModalClose = () => {
    setIsLoginModalOpen(false);
  };

  const handleUpgradePopupOpen = () => {
    setIsUpgradePopupOpen(true);
  };

  const handleUpgradePopupClose = () => {
    setIsUpgradePopupOpen(false);
  };

  const displayIdentifier =
    user?.displayName || (user?.email ? user.email.split('@')[0] : null);

  return (
    <div className="">
      {conversations.length > 0 ? (
        <ClearConversations onClearConversations={handleClearConversations} />
      ) : null}
      <div className="flex flex-col items-center space-y-1 border-t border-white/20 pt-1 text-sm">
        {displayIdentifier ? (
          <>
            {user && !isPremium && !loading && (
              <SidebarButton
                text={t('Upgrade to Plus')}
                icon={<IconLockOpen size={18} />}
                onClick={handleUpgradePopupOpen}
              />
            )}

            <UpgradeToPremiumPopup
              isOpen={isUpgradePopupOpen}
              onClose={handleUpgradePopupClose}
              checkoutUrl={checkoutUrl}
            />

            <SidebarButton
              icon={<IconUserCircle size={18} />}
              text={displayIdentifier}
              suffixIcon={<IconDots size={18} strokeWidth={1.5} />}
              onClick={() => setIsSettingDialog(true)}
            />
          </>
        ) : (
          <>
            <SidebarButton
              text={t('Settings')}
              icon={<IconSettings size={18} />}
              onClick={() => setIsSettingDialog(true)}
            />
            <SidebarButton
              text={t('Log in')}
              icon={<IconLogin size={18} />}
              onClick={handleLoginModalOpen}
            />
          </>
        )}
        <div className="flex w-full">
          <SidebarButton
            className="flex-grow"
            text={t('About us')}
            icon={<IconInfoCircle size={18} />}
            onClick={() => {
              window.open('/about-us', '_blank');
            }}
          />
          <SidebarButton
            className="w-min"
            icon={<IconBrandGithub size={18} />}
            onClick={() => {
              window.open('https://github.com/Hacker-GPT/HackerGPT', '_blank');
            }}
          />
          <SidebarButton
            className="w-min"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="icon icon-tabler icon-tabler-brand-x"
                width="18"
                height="18"
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
            }
            onClick={() => {
              window.open('https://twitter.com/thehackergpt', '_blank');
            }}
          />
        </div>

        <SettingDialog
          open={isSettingDialogOpen}
          onClose={() => {
            setIsSettingDialog(false);
          }}
        />

        {isLoginModalOpen && (
          <LoginSignupPopup
            isOpen={isLoginModalOpen}
            onClose={handleLoginModalClose}
          />
        )}
      </div>
    </div>
  );
};
