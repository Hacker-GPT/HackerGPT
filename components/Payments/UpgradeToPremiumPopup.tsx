import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import { IconX, IconCircleCheck } from '@tabler/icons-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  checkoutUrl: string | null;
}

const UpgradeToPremiumPopup: React.FC<Props> = ({
  isOpen,
  onClose,
  checkoutUrl,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const upgradeToPremium = () => {
    if (checkoutUrl) {
      router.push(checkoutUrl);
    }
  };

  return (
    <>
      {isOpen
        ? createPortal(
            <div className="inset-negative-5 fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="fixed inset-0 z-10 overflow-hidden">
                <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div
                    className="hidden sm:inline-block sm:h-screen sm:align-middle"
                    aria-hidden="true"
                  ></div>
                  <div
                    ref={modalRef}
                    className="inline-block transform overflow-y-auto rounded-lg border border-gray-300 bg-hgpt-dark-gray px-4 pt-5 pb-4 text-left align-bottom shadow-xl sm:my-8 sm:w-full sm:max-w-3xl sm:p-6 sm:align-middle"
                    role="dialog"
                  >
                    <div
                      className="absolute top-2 right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full"
                      onClick={onClose}
                    >
                      <IconX color={'gray'} size={22} strokeWidth={2} />
                    </div>
                    <div className="flex items-center justify-between text-white">
                      <div className="text-md pb-4 font-bold">Your Plan</div>
                    </div>

                    {/* Container for both plans */}
                    <div className="flex flex-col text-white sm:flex-row">
                      {/* User Plan */}
                      <div className="mb-4 flex-1 rounded-lg bg-hgpt-dark-gray sm:mb-0">
                        <h3 className="mb-2 text-lg font-bold">Free plan</h3>
                        <button
                          className="mb-4 w-full rounded bg-[#8e8ea0] px-4 py-2 text-hgpt-dark-gray"
                          disabled
                        >
                          Your current plan
                        </button>
                        <div className="mb-2 flex items-center">
                          <div className="icon-container mr-2">
                            <IconCircleCheck
                              color={'#8e8ea0'}
                              size={22}
                              strokeWidth={2}
                            />
                          </div>
                          <div className="text-container flex-1">
                            <p className="overflow-hidden truncate whitespace-nowrap">
                              Access to our HackerGPT model
                            </p>
                          </div>
                        </div>
                        <div className="mb-2 flex items-center">
                          <div className="icon-container mr-2">
                            <IconCircleCheck
                              color={'#8e8ea0'}
                              size={22}
                              strokeWidth={2}
                            />
                          </div>
                          <div className="text-container">
                            <p>Regular model updates</p>
                          </div>
                        </div>
                        <div className="mb-2 flex items-center">
                          <div className="icon-container mr-2">
                            <IconCircleCheck
                              color={'#8e8ea0'}
                              size={22}
                              strokeWidth={2}
                            />
                          </div>
                          <div className="text-container">
                            <p>Standard response speed</p>
                          </div>
                        </div>
                      </div>

                      {/* Vertical Divider for larger screens */}
                      <div className="my-2 mx-4 hidden w-px bg-gray-300 sm:block"></div>

                      {/* Premium Plan */}
                      <div className="mb-4 flex-1 rounded-lg bg-hgpt-dark-gray sm:mb-0">
                        <div className="flex items-center justify-between">
                          <h3 className="mb-2 text-lg font-bold">
                            HackerGPT Plus
                          </h3>
                          <div className="mb-2 text-lg text-[#8e8ea0]">
                            USD $29/mo
                          </div>
                        </div>
                        <button
                          onClick={upgradeToPremium}
                          className="mb-4 w-full rounded bg-green-600 px-4 py-2 font-bold text-white transition duration-200 hover:bg-green-700"
                        >
                          Upgrade to Plus
                        </button>
                        <div className="mb-2 flex items-center">
                          <div className="icon-container mr-2">
                            <IconCircleCheck
                              color={'#43A047'}
                              size={22}
                              strokeWidth={2}
                            />
                          </div>
                          <div className="text-container flex-1">
                            <p className="overflow-hidden truncate whitespace-nowrap">
                              Unlimited access to our HackerGPT model
                            </p>
                          </div>
                        </div>
                        <div className="mb-2 flex items-center">
                          <div className="icon-container mr-2">
                            <IconCircleCheck
                              color={'#43A047'}
                              size={22}
                              strokeWidth={2}
                            />
                          </div>
                          <div className="text-container">
                            <p>Access to GPT-4 Turbo model</p>
                          </div>
                        </div>
                        <div className="mb-2 flex items-center">
                          <div className="icon-container mr-2">
                            <IconCircleCheck
                              color={'#43A047'}
                              size={22}
                              strokeWidth={2}
                            />
                          </div>
                          <div className="text-container">
                            <p>Access to Web Browsing plugin</p>
                          </div>
                        </div>
                        <div className="mb-2 flex items-center">
                          <div className="icon-container mr-2">
                            <IconCircleCheck
                              color={'#43A047'}
                              size={22}
                              strokeWidth={2}
                            />
                          </div>
                          <div className="text-container">
                            <p>Faster response speed</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.getElementById('__next') as HTMLElement
          )
        : null}
    </>
  );
};

export default UpgradeToPremiumPopup;
