import { Message } from '@/types/chat';
import { OpenAIStream } from '@/pages/api/openaistream';

import {
  isSubfinderCommand,
  handleSubfinderRequest,
} from '@/pages/api/chat/plugins/subfinder/subfinder.content';
import {
  isAlterxCommand,
  handleAlterxRequest,
} from '@/pages/api/chat/plugins/alterx/alterx.content';
import {
  isGauCommand,
  handleGauRequest,
} from '@/pages/api/chat/plugins/gau/gau.content';
import {
  isKatanaCommand,
  handleKatanaRequest,
} from '@/pages/api/chat/plugins/katana/katana.content';
import {
  isNaabuCommand,
  handleNaabuRequest,
} from '@/pages/api/chat/plugins/naabu/naabu.content';

import { corsHeaders } from '@/pages/api/chat';

type CommandHandler = {
  [key: string]: (...args: any[]) => any;
};

type ToolUrls = {
  [key: string]: string;
};

export const isToolsCommand = (message: string) => {
  if (!message.startsWith('/')) return false;

  const trimmedMessage = message.trim();
  const commandPattern = /^\/tools$/;
  return commandPattern.test(trimmedMessage);
};

export const displayToolsHelpGuide = (toolUrls: {
  [x: string]: string;
  Katana?: any;
}) => {
  return (
    'Tools available in HackerGPT:' +
    '\n\n' +
    `+ [Katana](${toolUrls.Katana}): ` +
    'A fast crawler for automation pipelines. Use /katana -h for more details.' +
    '\n\n' +
    `+ [Subfinder](${toolUrls.Subfinder}): ` +
    'A powerful subdomain discovery tool. Use /subfinder -h for more details.' +
    '\n\n' +
    `+ [Naabu](${toolUrls.Naabu}): ` +
    'A port scanning tool. Use /naabu -h for more details.' +
    '\n\n' +
    `+ [GAU (Get All URLs)](${toolUrls.Gau}): ` +
    'A tool for fetching known URLs from multiple sources. Use /gau -h for more details.' +
    '\n\n' +
    `+ [Alterx](${toolUrls.Alterx}): ` +
    'A fast and customizable subdomain wordlist generator. Use /alterx -h for more details.' +
    '\n\n' +
    "To use these tools, type the tool's command followed by -h to see specific instructions and options for each tool."
  );
};

const commandHandlers: CommandHandler = {
  isKatanaCommand,
  handleKatanaRequest,
  isSubfinderCommand,
  handleSubfinderRequest,
  isNaabuCommand,
  handleNaabuRequest,
  isGauCommand,
  handleGauRequest,
  isAlterxCommand,
  handleAlterxRequest,
  isToolsCommand,
  displayToolsHelpGuide,
};

export const toolUrls: ToolUrls = {
  Katana: 'https://github.com/projectdiscovery/katana',
  Subfinder: 'https://github.com/projectdiscovery/subfinder',
  Naabu: 'https://github.com/projectdiscovery/naabu',
  Gau: 'https://github.com/lc/gau',
  Alterx: 'https://github.com/projectdiscovery/alterx',
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const isCommand = (commandName: string, message: string) => {
  const checkFunction = `is${capitalize(commandName)}Command`;
  return commandHandlers[checkFunction](message);
};

export const handleCommand = async (
  commandName: string,
  lastMessage: Message,
  model: string,
  messagesToSend: Message[],
  answerMessage: Message
) => {
  const handlerFunction = `handle${capitalize(commandName)}Request`;
  return await commandHandlers[handlerFunction](
    lastMessage,
    corsHeaders,
    process.env[`ENABLE_${commandName.toUpperCase()}_FEATURE`] === 'TRUE',
    OpenAIStream,
    model,
    messagesToSend,
    answerMessage
  );
};
