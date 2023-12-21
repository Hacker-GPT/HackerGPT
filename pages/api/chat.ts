import { OpenAIError, OpenAIStream } from '@/pages/api/openaistream';
import { HackerGPTStream } from '@/pages/api/hackergptstream';
import { ChatBody, Message } from '@/types/chat';
import { ToolID } from '@/types/tool';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';

import {
  fetchGoogleSearchResults,
  processGoogleResults,
  createAnswerPromptGoogle,
} from '@/pages/api/chat/plugins/googlesearch';

import {
  toolUrls,
  isCommand,
  handleCommand,
  isToolsCommand,
  displayToolsHelpGuide,
} from '@/pages/api/chat/plugins/tools';

export const config = {
  runtime: 'edge',
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.hackergpt.chat',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

enum ModelType {
  GPT35TurboInstruct = 'gpt-3.5-turbo-instruct',
  GPT4 = 'gpt-4',
}

const getTokenLimit = (model: string) => {
  switch (model) {
    case ModelType.GPT35TurboInstruct:
      return 8000;
    case ModelType.GPT4:
      return 12000;
    default:
      return null;
  }
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const useWebBrowsingPlugin = process.env.USE_WEB_BROWSING_PLUGIN === 'TRUE';

    const authToken = req.headers.get('Authorization');
    let { messages, model, max_tokens, temperature, stream, toolId } =
      (await req.json()) as ChatBody;

    let answerMessage: Message = { role: 'user', content: '' };

    max_tokens = max_tokens || 1000;
    stream = stream || true;

    const defaultTemperature = process.env.HACKERGPT_MODEL_TEMPERATURE
      ? parseFloat(process.env.HACKERGPT_MODEL_TEMPERATURE)
      : 0.4;
    temperature = temperature ?? defaultTemperature;

    const tokenLimit = getTokenLimit(model);

    if (!tokenLimit) {
      return new Response('Error: Model not found', {
        status: 400,
        headers: corsHeaders,
      });
    }

    let reservedTokens = 2000;

    await init((imports) => WebAssembly.instantiate(wasm, imports));
    const encoding = new Tiktoken(
      tiktokenModel.bpe_ranks,
      tiktokenModel.special_tokens,
      tiktokenModel.pat_str
    );

    const promptToSend = () => {
      return process.env.SECRET_OPENAI_SYSTEM_PROMPT || null;
    };

    const prompt_tokens = encoding.encode(promptToSend()!);
    let tokenCount = prompt_tokens.length;

    const lastMessage = messages[messages.length - 1];
    const lastMessageTokens = encoding.encode(lastMessage.content);

    if (lastMessageTokens.length + reservedTokens > tokenLimit) {
      const errorMessage = `This message exceeds the model's maximum token limit of ${tokenLimit}. Please shorten your message.`;
      return new Response(errorMessage, { headers: corsHeaders });
    }

    tokenCount += lastMessageTokens.length;

    let messagesToSend: Message[] = [lastMessage];

    for (let i = messages.length - 2; i >= 0; i--) {
      const message = messages[i];
      const tokens = encoding.encode(message.content);

      if (i !== messages.length - 1) {
        if (tokenCount + tokens.length + reservedTokens <= tokenLimit) {
          tokenCount += tokens.length;
          messagesToSend.unshift(message);
        } else {
          break;
        }
      }
    }

    if (toolId === ToolID.WEBSEARCH && lastMessage.role === 'user') {
      messagesToSend.pop();
    }

    const skipFirebaseStatusCheck =
      process.env.SKIP_FIREBASE_STATUS_CHECK === 'TRUE';

    let userStatusOk = true;

    if (!skipFirebaseStatusCheck) {
      const response = await fetch(
        `${process.env.SECRET_CHECK_USER_STATUS_FIREBASE_FUNCTION_URL}`,
        {
          method: 'POST',
          headers: {
            Authorization: `${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
          }),
        }
      );

      userStatusOk = response.ok;

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(errorText, { headers: corsHeaders });
      }
    }

    if (userStatusOk && toolId === ToolID.WEBSEARCH) {
      if (!useWebBrowsingPlugin) {
        return new Response(
          'The Web Browsing Plugin is disabled. To enable it, please configure the necessary environment variables.',
          { status: 200, headers: corsHeaders }
        );
      }

      const query = lastMessage.content.trim();
      const googleData = await fetchGoogleSearchResults(query);
      const sourceTexts = await processGoogleResults(
        googleData,
        tokenLimit,
        tokenCount
      );

      const answerPrompt = createAnswerPromptGoogle(query, sourceTexts);
      answerMessage.content = answerPrompt;
    }

    encoding.free();

    if (userStatusOk) {
      if (lastMessage.content.startsWith('/')) {
        if (isToolsCommand(lastMessage.content)) {
          return new Response(displayToolsHelpGuide(toolUrls), {
            status: 200,
            headers: corsHeaders,
          });
        }

        const tools = Object.keys(toolUrls);
        for (const tool of tools) {
          if (isCommand(tool.toLowerCase(), lastMessage.content)) {
            if (model !== ModelType.GPT4 && tool.toLowerCase() !== 'tools') {
              const toolUrl = toolUrls[tool];
              return new Response(
                `You can access [${tool}](${toolUrl}) only with GPT-4.`,
                { status: 200, headers: corsHeaders }
              );
            }
            return await handleCommand(
              tool.toLowerCase(),
              lastMessage,
              model,
              messagesToSend,
              answerMessage
            );
          }
        }
      }

      let streamResult;
      if (model === ModelType.GPT35TurboInstruct) {
        streamResult = await HackerGPTStream(
          messagesToSend,
          temperature,
          max_tokens,
          stream
        );
      } else {
        streamResult = await OpenAIStream(
          model,
          messagesToSend,
          answerMessage,
          toolId
        );
      }

      return new Response(streamResult, {
        headers: corsHeaders,
      });
    } else {
      return new Response('An unexpected error occurred', {
        status: 500,
        headers: corsHeaders,
      });
    }
  } catch (error) {
    console.error('An error occurred:', error);
    if (error instanceof OpenAIError) {
      return new Response('OpenAI Error', {
        status: 500,
        statusText: error.message,
        headers: corsHeaders,
      });
    } else {
      return new Response('Internal Server Error', {
        status: 500,
        headers: corsHeaders,
      });
    }
  }
};

export default handler;
