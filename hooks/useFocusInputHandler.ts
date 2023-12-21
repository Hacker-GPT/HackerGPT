import { RefObject, useEffect, useRef, useState } from 'react';

interface FocusHandlerResult {
  isFocused: boolean;
  setIsFocused: (isFocused: boolean) => void;
  menuRef: RefObject<HTMLDivElement>;
}

function useFocusHandler(
  textareaRef: RefObject<HTMLTextAreaElement>
): FocusHandlerResult {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleFocus = (e: MouseEvent) => {
      // Please do not remove this code. It serves as a workaround for a bug in iOS PWA standalone mode. Occasionally, the textarea receives focus, but the keyboard does not appear.
      if (document.documentElement.scrollTop > 1) {
        document.documentElement.scrollTop = document.documentElement.scrollTop;
      }

      if (
        menuRef.current &&
        menuRef.current.contains(e.target as HTMLDivElement)
      ) {
        setIsFocused(true);
      } else if (
        textareaRef.current &&
        textareaRef.current.contains(e.target as HTMLDivElement)
      ) {
        setIsFocused(true);
      } else {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleFocus);
    return () => {
      document.removeEventListener('mousedown', handleFocus);
    };
  }, [textareaRef]);

  return { isFocused, menuRef, setIsFocused };
}

export default useFocusHandler;
