import { KeyValuePair } from './data';

export interface Tool {
  id: ToolID;
  name: ToolName;
  requiredKeys: KeyValuePair[];
}

export enum ToolID {
  NUCLEI = 'nuclei',
  SUBFINDER = 'subfinder',
  KATANA = 'katana',
  HTTPX = 'httpx',
  NAABU = 'naabu',
  GAU = 'gau',
  ALTERX = 'alterx',
  WEBSEARCH = 'websearch',
}

export enum ToolName {
  NUCLEI = 'nuclei',
  SUBFINDER = 'subfinder',
  KATANA = 'katana',
  HTTPX = 'httpx',
  NAABU = 'naabu',
  GAU = 'gau',
  ALTERX = 'alterx',
  WEBSEARCH = 'websearch',
}

export const Tools: Record<ToolID, Tool> = {
  [ToolID.NUCLEI]: {
    id: ToolID.NUCLEI,
    name: ToolName.NUCLEI,
    requiredKeys: [],
  },
  [ToolID.SUBFINDER]: {
    id: ToolID.SUBFINDER,
    name: ToolName.SUBFINDER,
    requiredKeys: [],
  },
  [ToolID.KATANA]: {
    id: ToolID.KATANA,
    name: ToolName.KATANA,
    requiredKeys: [],
  },
  [ToolID.HTTPX]: {
    id: ToolID.HTTPX,
    name: ToolName.HTTPX,
    requiredKeys: [],
  },
  [ToolID.NAABU]: {
    id: ToolID.NAABU,
    name: ToolName.NAABU,
    requiredKeys: [],
  },
  [ToolID.GAU]: {
    id: ToolID.GAU,
    name: ToolName.GAU,
    requiredKeys: [],
  },
  [ToolID.ALTERX]: {
    id: ToolID.ALTERX,
    name: ToolName.ALTERX,
    requiredKeys: [],
  },
  [ToolID.WEBSEARCH]: {
    id: ToolID.WEBSEARCH,
    name: ToolName.WEBSEARCH,
    requiredKeys: [],
  },
};

export const ToolList = Object.values(Tools);
