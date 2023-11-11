import { Dispatch, createContext } from 'react';

import { ActionType } from '@/hooks/useCreateReducer';

import { Conversation } from '@/types/chat';

import { ChatbarInitialState } from './Chatbar.state';

export interface ChatbarContextProps {
  state: ChatbarInitialState;
  dispatch: Dispatch<ActionType<ChatbarInitialState>>;
  handleDeleteConversation: (conversation: Conversation) => void;
  handleClearConversations: () => void;
}

const ChatbarContext = createContext<ChatbarContextProps>(undefined!);

export default ChatbarContext;
