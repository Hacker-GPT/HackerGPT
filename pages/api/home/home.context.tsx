import React, { createContext, Dispatch } from 'react';
import { HomeInitialState, initialState } from './home.state';
import { ActionType } from '@/hooks/homeReducer';
import { useCreateReducer } from '@/hooks/useCreateReducer';
import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';

// Extend ActionType to include SET_SELECTED_TOOL_ID
export type ExtendedActionType =
  | ActionType<HomeInitialState>
  | { type: 'SET_SELECTED_TOOL_ID'; payload: string | null };

export interface HomeContextProps {
  state: HomeInitialState;
  dispatch: Dispatch<ExtendedActionType>;
  handleNewConversation: () => void;
  handleSelectConversation: (conversation: Conversation) => void;
  handleUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair
  ) => void;
}

const defaultContextValue: HomeContextProps = {
  state: initialState,
  dispatch: () => {},
  handleNewConversation: () => {},
  handleSelectConversation: () => {},
  handleUpdateConversation: () => {},
};

export const HomeContext = createContext<HomeContextProps>(defaultContextValue);

interface HomeProviderProps {
  children: React.ReactNode;
}

export const HomeProvider: React.FC<HomeProviderProps> = ({ children }) => {
  const { state, dispatch } = useCreateReducer<HomeInitialState>({
    initialState,
  });

  const extendedDispatch = (action: ExtendedActionType) => {
    // Handle SET_SELECTED_TOOL_ID action or delegate to existing reducer
    if (action.type === 'SET_SELECTED_TOOL_ID') {
      dispatch({
        type: 'change',
        field: 'selectedToolId',
        value: action.payload,
      });
    } else {
      dispatch(action);
    }
  };

  return (
    <HomeContext.Provider
      value={{
        state,
        dispatch: extendedDispatch,
        handleNewConversation: () => {},
        handleSelectConversation: () => {},
        handleUpdateConversation: () => {},
      }}
    >
      {children}
    </HomeContext.Provider>
  );
};

export default HomeContext;
