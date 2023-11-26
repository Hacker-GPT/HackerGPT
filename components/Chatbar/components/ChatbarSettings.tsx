import {
  IconSettings,
  IconUserCircle,
  IconLogin,
  IconDots,
  IconLockOpen,
  IconNews,
  IconInfoCircle,
  IconBrandTwitter,
} from '@tabler/icons-react';

import { getAuth, onAuthStateChanged } from 'firebase/auth';
import firebase from '@/utils/server/firebase-client-init';
import { initFirebaseApp } from '@/utils/server/firebase-client-init';

import { useEffect, useState, useContext } from 'react';

import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';

import { SettingDialog } from '@/components/Settings/SettingDialog';

import { SidebarButton } from '../../Sidebar/SidebarButton';
import ChatbarContext from '../Chatbar.context';
import { ClearConversations } from './ClearConversations';

import LoginSignupPopup from '@/components/Authorization/LoginSignupPopup';

import { getCheckoutUrl } from '@/components/Payments/stripePayments';
import { getPremiumStatus } from '@/components/Payments/getPremiumStatus';
import UpgradeToPremiumPopup from '@/components/Payments/UpgradeToPremiumPopup';

export const ChatbarSettings = () => {
  const { t } = useTranslation('sidebar');
  const [isSettingDialogOpen, setIsSettingDialog] = useState<boolean>(false);
  const [user, setUser] = useState<firebase.User | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgradePopupOpen, setIsUpgradePopupOpen] = useState(false);

  const app = initFirebaseApp();
  const auth = getAuth(app);

  useEffect(() => {
    const checkPremium = async () => {
      const newPremiumStatus = auth.currentUser
        ? await getPremiumStatus(app)
        : false;
      setIsPremium(newPremiumStatus);
    };
    checkPremium();
  }, [app, auth.currentUser?.uid]);

  const {
    state: { conversations },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const { handleClearConversations } = useContext(ChatbarContext);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser as firebase.User | null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

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

  useEffect(() => {
    const fetchCheckoutUrl = async () => {
      if (auth.currentUser) {
        try {
          const url = await getCheckoutUrl(app);
          setCheckoutUrl(url);
          setIsLoading(false);
        } catch (error) {
          console.error('Error fetching Stripe checkout URL:', error);
        }
      }
    };
    fetchCheckoutUrl();
  }, [auth.currentUser?.uid]);

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
            {!isPremium && !isLoading && (
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
