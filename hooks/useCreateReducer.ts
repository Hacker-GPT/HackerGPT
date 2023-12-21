import { useMemo, useReducer } from 'react';
import { ActionType, homeReducer } from './homeReducer';

export const useCreateReducer = <T>({ initialState }: { initialState: T }) => {
  const [state, dispatch] = useReducer(
    (state: T, action: ActionType<T>) => homeReducer(state, action),
    initialState
  );

  return useMemo(() => ({ state, dispatch }), [state, dispatch]);
};
