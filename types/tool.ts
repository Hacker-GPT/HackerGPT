import { KeyValuePair } from './data';

export interface Tool {
  id: ToolID;
  name: ToolName;
}

export enum ToolID {
  CYBERCHEF = 'cyberchef',
  CVEMAP = 'cvemap',
  GOLINKFINDER = 'golinkfinder',
  NUCLEI = 'nuclei',
  SUBFINDER = 'subfinder',
  KATANA = 'katana',
  HTTPX = 'httpx',
  NAABU = 'naabu',
  GAU = 'gau',
  ALTERX = 'alterx',
  WEBSEARCH = 'websearch',
  ENHANCEDSEARCH = 'enhancedsearch',
}

export enum ToolName {
  CYBERCHEF = 'cyberchef',
  GOLINKFINDER = 'golinkfinder',
  CVEMAP = 'cvemap',
  NUCLEI = 'nuclei',
  SUBFINDER = 'subfinder',
  KATANA = 'katana',
  HTTPX = 'httpx',
  NAABU = 'naabu',
  GAU = 'gau',
  ALTERX = 'alterx',
  WEBSEARCH = 'websearch',
  ENHANCEDSEARCH = 'enhancedsearch',
}

export const Tools: Record<ToolID, Tool> = {
  [ToolID.CVEMAP]: {
    id: ToolID.CVEMAP,
    name: ToolName.CVEMAP,
  },
  [ToolID.GOLINKFINDER]: {
    id: ToolID.GOLINKFINDER,
    name: ToolName.GOLINKFINDER,
  },
  [ToolID.CYBERCHEF]: {
    id: ToolID.CYBERCHEF,
    name: ToolName.CYBERCHEF,
  },
  [ToolID.NUCLEI]: {
    id: ToolID.NUCLEI,
    name: ToolName.NUCLEI,
  },
  [ToolID.SUBFINDER]: {
    id: ToolID.SUBFINDER,
    name: ToolName.SUBFINDER,
  },
  [ToolID.KATANA]: {
    id: ToolID.KATANA,
    name: ToolName.KATANA,
  },
  [ToolID.HTTPX]: {
    id: ToolID.HTTPX,
    name: ToolName.HTTPX,
  },
  [ToolID.NAABU]: {
    id: ToolID.NAABU,
    name: ToolName.NAABU,
  },
  [ToolID.GAU]: {
    id: ToolID.GAU,
    name: ToolName.GAU,
  },
  [ToolID.ALTERX]: {
    id: ToolID.ALTERX,
    name: ToolName.ALTERX,
  },
  [ToolID.WEBSEARCH]: {
    id: ToolID.WEBSEARCH,
    name: ToolName.WEBSEARCH,
  },
  [ToolID.ENHANCEDSEARCH]: {
    id: ToolID.ENHANCEDSEARCH,
    name: ToolName.ENHANCEDSEARCH,
  },
};

export const ToolList = Object.values(Tools);
