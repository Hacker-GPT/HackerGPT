import { OpenAIModel } from './openai';
import { ToolID } from '@/types/tool';

export interface Message {
  role: Role;
  content: string;
  toolId?:
    | ToolID.SUBFINDER
    | ToolID.KATANA
    | ToolID.NAABU
    | ToolID.GAU
    | ToolID.ALTERX
    | null;
}

export type Role = 'assistant' | 'user' | 'system';

export interface ChatBody {
  model: OpenAIModel['id'];
  messages: Message[];
  toolId?: string | null;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  model: OpenAIModel;
}
