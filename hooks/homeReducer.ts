export type ActionType<T> =
  | { type?: 'change'; field: keyof T; value: any }
  | { type: 'SET_SELECTED_TOOL_ID'; payload: string | null }
  | { type: 'reset' };

export const homeReducer = <T>(state: T, action: ActionType<T>) => {
  if (action.type === undefined && action.field !== undefined) {
    return { ...state, [action.field]: action.value };
  }

  switch (action.type) {
    case 'SET_SELECTED_TOOL_ID':
      return { ...state, selectedToolId: action.payload };
    default:
      console.error(`Unhandled action type: ${action.type}`, action);
      return state;
  }
};
