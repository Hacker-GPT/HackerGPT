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
import {
  isHttpxCommand,
  handleHttpxRequest,
} from '@/pages/api/chat/plugins/httpx/httpx.content';
import {
  isNucleiCommand,
  handleNucleiRequest,
} from '@/pages/api/chat/plugins/nuclei/nuclei.content';

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
    `+ [Nuclei](${toolUrls.Nuclei}): ` +
    'Fast and customisable vulnerability scanner. Use /nuclei -h for more details.' +
    '\n\n' +
    `+ [Katana](${toolUrls.Katana}): ` +
    'A web crawling framework designed to navigate and parse for hidden details. Use /katana -h for more details.' +
    '\n\n' +
    `+ [Subfinder](${toolUrls.Subfinder}): ` +
    'A robust discovery tool for passive enumeration on valid subdomains. Use /subfinder -h for more details.' +
    '\n\n' +
    `+ [HttpX](${toolUrls.HttpX}): ` +
    'An HTTP toolkit that probes services, web servers, and other valuable metadata. Use /httpx -h for more details.' +
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
  isNucleiCommand,
  handleNucleiRequest,
  isSubfinderCommand,
  handleSubfinderRequest,
  isKatanaCommand,
  handleKatanaRequest,
  isHttpxCommand,
  handleHttpxRequest,
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
  Nuclei: 'https://github.com/projectdiscovery/nuclei',
  Subfinder: 'https://github.com/projectdiscovery/subfinder',
  Katana: 'https://github.com/projectdiscovery/katana',
  HttpX: 'https://github.com/projectdiscovery/httpx',
  Naabu: 'https://github.com/projectdiscovery/naabu',
  Gau: 'https://github.com/lc/gau',
  Alterx: 'https://github.com/projectdiscovery/alterx',
};

type ToolHandlerFunction = (
  lastMessage: Message,
  corsHeaders: HeadersInit | undefined,
  enableFeature: boolean,
  OpenAIStream: any,
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  authToken: any,
  invokedByToolId: boolean,
) => Promise<any>;

type ToolIdToHandlerMapping = {
  [key: string]: ToolHandlerFunction;
};

export const toolIdToHandlerMapping: ToolIdToHandlerMapping = {
  nuclei: handleNucleiRequest,
  subfinder: handleSubfinderRequest,
  katana: handleKatanaRequest,
  httpx: handleHttpxRequest,
  naabu: handleNaabuRequest,
  gau: handleGauRequest,
  alterx: handleAlterxRequest,
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
  answerMessage: Message,
  authToken: any,
) => {
  const handlerFunction = `handle${capitalize(commandName)}Request`;
  return await commandHandlers[handlerFunction](
    lastMessage,
    corsHeaders,
    process.env[`ENABLE_${commandName.toUpperCase()}_FEATURE`] === 'TRUE',
    OpenAIStream,
    model,
    messagesToSend,
    answerMessage,
    authToken,
  );
};

export async function checkToolRateLimit(authToken: any) {
  try {
    const rateLimitResponse = await fetch(
      `${process.env.SECRET_TOOLS_RATELIMIT_FIREBASE_FUNCTION_URL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `${authToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!rateLimitResponse.ok) {
      const errorText = await rateLimitResponse.text();
      return {
        isRateLimited: true,
        response: new Response(errorText, { headers: corsHeaders }),
      };
    }

    return { isRateLimited: false };
  } catch (error) {
    console.error('Error checking tool rate limit:', error);
    return {
      isRateLimited: true,
      response: new Response('Error checking rate limit', {
        status: 500,
        headers: corsHeaders,
      }),
    };
  }
}

export const isInteger = (value: string) => /^[0-9]+$/.test(value);
