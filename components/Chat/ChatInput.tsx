import {
  IconArrowDown,
  IconPlayerStop,
  IconRepeat,
  IconSend,
  IconSettings,
} from '@tabler/icons-react';
import {
  KeyboardEvent,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

import { Message } from '@/types/chat';
import { Plugin } from '@/types/plugin';
import { Prompt } from '@/types/prompt';

import useFocusHandler from '@/hooks/useFocusInputHandler';
import useDisplayAttribute from '@/hooks/useDisplayAttribute';

import HomeContext from '@/pages/api/home/home.context';

import EnhancedMenu from '../EnhancedMenu/EnhancedMenu';

import { VariableModal } from './VariableModal';

interface Props {
  onSend: (message: Message, plugin: Plugin | null) => void;
  onRegenerate: () => void;
  onScrollDownClick: () => void;
  stopConversationRef: MutableRefObject<boolean>;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  showScrollDownButton: boolean;
}

export const ChatInput = ({
  onSend,
  onRegenerate,
  onScrollDownClick,
  stopConversationRef,
  textareaRef,
  showScrollDownButton,
}: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: {
      selectedConversation,
      messageIsStreaming,
      prompts,
      currentMessage,
      selectedToolId,
    },

    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [content, setContent] = useState<string>();
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showPromptList, setShowPromptList] = useState(false);
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [promptInputValue, setPromptInputValue] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [showEnhanceMenu, setShowEnhanceMenu] = useState(true);

  const toggleEnhanceMenu = () => {
    setShowEnhanceMenu(!showEnhanceMenu);
  };

  const { isFocused, setIsFocused, menuRef } = useFocusHandler(textareaRef);

  const promptListRef = useRef<HTMLUListElement | null>(null);

  const enhancedMenuDisplayValue = useDisplayAttribute(menuRef);

  const filteredPrompts = prompts.filter((prompt) =>
    prompt.name.toLowerCase().includes(promptInputValue.toLowerCase()),
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const maxLength = selectedConversation?.model.maxLength;

    if (maxLength && value.length > maxLength) {
      alert(
        t(
          `Message limit is {{maxLength}} characters. You have entered {{valueLength}} characters.`,
          { maxLength, valueLength: value.length },
        ),
      );
      return;
    }

    setContent(value);
    updatePromptListVisibility(value);
  };

  const handleSend = () => {
    if (messageIsStreaming) {
      return;
    }

    if (!content) {
      alert(t('Please enter a message'));
      return;
    }

    onSend({ role: 'user', content }, plugin);
    setContent('');
    setPlugin(null);

    if (window.innerWidth < 640 && textareaRef && textareaRef.current) {
      textareaRef.current.blur();
    }
  };

  const handleStopConversation = () => {
    stopConversationRef.current = true;
    setTimeout(() => {
      stopConversationRef.current = false;
    }, 1000);
  };

  const isMobile = () => {
    const userAgent =
      typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
    return mobileRegex.test(userAgent);
  };

  const handleInitModal = () => {
    const selectedPrompt = filteredPrompts[activePromptIndex];
    if (selectedPrompt) {
      setContent((prevContent) => {
        const newContent = prevContent?.replace(
          /\/\w*$/,
          selectedPrompt.content,
        );
        return newContent;
      });
      handlePromptSelect(selectedPrompt);
    }
    setShowPromptList(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    setIsTyping(e.nativeEvent.isComposing);
    if (showPromptList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < prompts.length - 1 ? prevIndex + 1 : prevIndex,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : prevIndex,
        );
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < prompts.length - 1 ? prevIndex + 1 : 0,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleInitModal();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowPromptList(false);
      } else {
        setActivePromptIndex(0);
      }
    } else if (e.key === 'Enter' && !isTyping && !isMobile() && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === '/' && e.metaKey) {
      e.preventDefault();
    }
  };

  const parseVariables = (content: string) => {
    const regex = /{{(.*?)}}/g;
    const foundVariables = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      foundVariables.push(match[1]);
    }

    return foundVariables;
  };

  const updatePromptListVisibility = useCallback((text: string) => {
    const match = text.match(/\/\w*$/);

    if (match) {
      setShowPromptList(true);
      setPromptInputValue(match[0].slice(1));
    } else {
      setShowPromptList(false);
      setPromptInputValue('');
    }
  }, []);

  const handlePromptSelect = (prompt: Prompt) => {
    const parsedVariables = parseVariables(prompt.content);
    setVariables(parsedVariables);

    if (parsedVariables.length > 0) {
      setIsModalVisible(true);
    } else {
      setContent((prevContent) => {
        const updatedContent = prevContent?.replace(/\/\w*$/, prompt.content);
        return updatedContent;
      });
      updatePromptListVisibility(prompt.content);
    }
  };

  const handleSubmit = (updatedVariables: string[]) => {
    const newContent = content?.replace(/{{(.*?)}}/g, (match, variable) => {
      const index = variables.indexOf(variable);
      return updatedVariables[index];
    });

    setContent(newContent);

    if (textareaRef && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  useEffect(() => {
    if (promptListRef.current) {
      promptListRef.current.scrollTop = activePromptIndex * 30;
    }
  }, [activePromptIndex]);

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
      textareaRef.current.style.overflow = `${
        textareaRef?.current?.scrollHeight > 400 ? 'auto' : 'hidden'
      }`;
    }

    homeDispatch({
      field: 'currentMessage',
      value: {
        ...currentMessage,
        role: 'user',
        content,
      },
    });
  }, [content]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        promptListRef.current &&
        !promptListRef.current.contains(e.target as Node)
      ) {
        setShowPromptList(false);
      }
    };

    window.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const isPhone = window.innerWidth <= 640;

  return (
    <div className="absolute bottom-0 left-0 w-full border-transparent bg-gradient-to-b from-transparent via-white to-white pt-6 md:pt-2 dark:border-white/20 dark:via-[#343541] dark:to-[#343541]">
      <div
        className={` ${
          enhancedMenuDisplayValue === 'none'
            ? 'mt-[1.5rem] md:mt-[3rem]'
            : `${'mt-[8rem] md:mt-[9.5rem]'}`
        } stretch mx-2 mb-4 mt-4 flex flex-row gap-3 transition-all ease-in-out md:mx-4 md:last:mb-6 lg:mx-auto lg:max-w-3xl`}
      >
        {!messageIsStreaming &&
          selectedConversation &&
          selectedConversation.messages.length > 0 && (
            <button
              className="absolute left-0 right-0 top-0 mx-auto mb-3 flex w-fit items-center gap-3 rounded border border-neutral-200 bg-white px-4 py-2 text-black hover:opacity-50 md:mb-0 md:mt-2 dark:border-neutral-600 dark:bg-hgpt-medium-gray dark:text-white"
              onClick={onRegenerate}
            >
              <IconRepeat size={16} /> {t('Regenerate response')}
            </button>
          )}

        <div
          className={`relative mx-2 flex w-full flex-grow flex-col rounded-md 
            border bg-white shadow-[0_0_10px_rgba(0,0,0,0.10)] 
            sm:mx-4 dark:bg-[#40414F] 
            dark:text-white dark:shadow-[0_0_15px_rgba(0,0,0,0.10)] 
            ${
              selectedToolId === null
                ? 'border-black/10 dark:border-gray-900/50'
                : 'border-blue-500 dark:border-blue-500'
            }
          `}
        >
          {showEnhanceMenu && (
            <EnhancedMenu
              ref={menuRef}
              isFocused={isFocused}
              setIsFocused={setIsFocused}
            />
          )}

          <div className="flex items-start">
            <div className="flex items-center pl-2 pt-2">
              <button
                onClick={toggleEnhanceMenu}
                className={`rounded-sm p-1 ${
                  showEnhanceMenu
                    ? 'text-hgpt-dark-gray dark:text-hgpt-hover-white'
                    : 'text-zinc-500 dark:text-zinc-400'
                } cursor-default hover:text-hgpt-dark-gray hover:dark:text-hgpt-hover-white`}
              >
                <IconSettings size={20} />
              </button>
            </div>

            <textarea
              onFocus={() => setIsFocused(true)}
              ref={textareaRef}
              className="m-0 w-full resize-none rounded-md bg-transparent p-0 py-3 pl-3 pr-8 text-black outline-none md:py-3 md:pl-3 dark:text-white"
              style={{
                resize: 'none',
                bottom: `${textareaRef?.current?.scrollHeight}px`,
                maxHeight: isPhone ? '200px' : '400px',
                overflow: `${
                  textareaRef.current && textareaRef.current.scrollHeight > 400
                    ? 'auto'
                    : 'hidden'
                }`,
              }}
              placeholder={t('Type a message ...') || ''}
              value={content}
              rows={1}
              onKeyUp={(e) => setIsTyping(e.nativeEvent.isComposing)}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button
            className={`absolute right-2 top-2 rounded-sm p-1 ${
              messageIsStreaming
                ? 'text-hgpt-dark-gray dark:text-hgpt-hover-white'
                : 'text-zinc-500 dark:text-zinc-400'
            } hover:text-hgpt-dark-gray hover:dark:text-hgpt-hover-white`}
            onClick={messageIsStreaming ? handleStopConversation : handleSend}
          >
            {messageIsStreaming ? (
              <IconPlayerStop size={18} />
            ) : (
              <IconSend size={18} />
            )}
          </button>

          {showScrollDownButton && (
            <div className="absolute bottom-12 right-0 lg:-right-10 lg:bottom-0">
              <button
                className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-300 text-gray-800 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-neutral-200"
                onClick={onScrollDownClick}
              >
                <IconArrowDown size={18} />
              </button>
            </div>
          )}

          {isModalVisible && (
            <VariableModal
              prompt={filteredPrompts[activePromptIndex]}
              variables={variables}
              onSubmit={handleSubmit}
              onClose={() => setIsModalVisible(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
