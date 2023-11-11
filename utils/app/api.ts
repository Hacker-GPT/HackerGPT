import { Plugin } from '@/types/plugin';

export const getEndpoint = (plugin: Plugin | null) => {
  return 'api/chat';
};
