import React, {
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import HomeContext from '@/pages/api/home/home.context';

import ToolSelector from './ToolSelector';
import SearchToggle from './SearchWeb';

import PropTypes from 'prop-types';

type EnhancedMenuProps = {
  isFocused: boolean;
  setIsFocused: (isFocused: boolean) => void;
};

const EnhancedMenu = forwardRef<HTMLDivElement, EnhancedMenuProps>(
  ({ isFocused, setIsFocused }, ref) => {
    const {
      state: { messageIsStreaming },
    } = useContext(HomeContext);

    const shouldShow = useMemo(() => {
      return isFocused && !messageIsStreaming;
    }, [isFocused, messageIsStreaming]);

    const [showMenuDisplay, setShowMenuDisplay] = useState(false);
    const [showMenuAnimation, setShowMenuAnimation] = useState(false);

    useEffect(() => {
      if (shouldShow) {
        setShowMenuDisplay(true);
        setTimeout(() => {
          setShowMenuAnimation(true);
        }, 1);
      } else {
        setShowMenuAnimation(false);
        setTimeout(() => {
          setShowMenuDisplay(false);
        }, 1);
      }
    }, [shouldShow]);

    return (
      <div
        ref={ref}
        className={`absolute left-0 z-10 h-fit w-full
          -translate-y-[100%] overflow-hidden rounded-md border 
          bg-white text-black shadow-[0_0_10px_rgba(0,0,0,0.10)]
          transition-all ease-in-out dark:border-gray-900/50 dark:bg-hgpt-chat-gray
          dark:text-white dark:shadow-[0_0_15px_rgba(0,0,0,0.10)] ${
            showMenuAnimation ? '-top-2 opacity-95' : 'top-8 opacity-0'
          }`}
        style={{
          display: showMenuDisplay ? 'flex' : 'none',
        }}
      >
        <div className="relative flex w-full flex-col px-4 py-2">
          <div className="mobile:!flex-col mb-2 flex w-full flex-row items-center justify-start gap-4 border-b pb-2 dark:border-gray-900/50">
            <SearchToggle />
          </div>
          <div className="flex w-full flex-col justify-between md:flex-row">
            <ToolSelector />
          </div>
        </div>
      </div>
    );
  }
);

EnhancedMenu.propTypes = {
  isFocused: PropTypes.bool.isRequired,
  setIsFocused: PropTypes.func.isRequired,
};

EnhancedMenu.displayName = 'EnhancedMenu';

export default EnhancedMenu;
