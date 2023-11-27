import { OpenAIError, OpenAIStream } from '@/pages/api/openaistream';
import { HackerGPTStream } from '@/pages/api/hackergptstream';
import { ChatBody, Message } from '@/types/chat';

// @ts-expect-error
import wasm from '../../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';

export const config = {
  runtime: 'edge',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

enum ModelType {
  HACKERGPT = 'hackergpt',
}

const getTokenLimit = (model: string) => {
  switch (model) {
    case ModelType.HACKERGPT:
      return 8000;
    default:
      return null;
  }
};

const handler = async (req: Request): Promise<Response> => {
  try {
    if (!req.headers.has('Authorization')) {
      return new Response('Authorization header is missing', {
        status: 400,
        headers: corsHeaders,
      });
    }

    const authToken = req.headers.get('Authorization');
    const chatBody = (await req.json()) as ChatBody;
    const allowedKeys = [
      'messages',
      'model',
      'max_tokens',
      'temperature',
      'stream',
    ];
    const providedKeys = Object.keys(chatBody);

    const unrecognizedKeys = providedKeys.filter(
      (key) => !allowedKeys.includes(key)
    );
    if (unrecognizedKeys.length > 0) {
      return new Response(
        `Unrecognized parameters: ${unrecognizedKeys.join(', ')}`,
        { status: 400, headers: corsHeaders }
      );
    }

    if (
      !chatBody.model ||
      !Array.isArray(chatBody.messages) ||
      chatBody.messages.length === 0
    ) {
      return new Response(
        'The "model" and "messages" parameters are required and cannot be empty',
        { status: 400, headers: corsHeaders }
      );
    }

    const { messages, model, max_tokens = 800, temperature } = chatBody;
    let { stream } = chatBody;

    if (stream === undefined) {
      stream = false;
    }

    if (stream !== true && stream !== false) {
      return new Response(
        'The "stream" parameter must be a boolean (true or false)',
        { status: 400, headers: corsHeaders }
      );
    }

    const defaultTemperature = parseFloat(
      process.env.HACKERGPT_MODEL_TEMPERATURE || '0.4'
    );
    const temp = temperature ?? defaultTemperature;

    if (
      temperature !== undefined &&
      (typeof temperature !== 'number' || temperature < 0 || temperature > 2)
    ) {
      return new Response(
        'The "temperature" parameter must be a number between 0 and 2',
        { status: 400, headers: corsHeaders }
      );
    }

    if (
      max_tokens !== undefined &&
      (typeof max_tokens !== 'number' || max_tokens < 1 || max_tokens > 2000)
    ) {
      return new Response(
        'The "max_tokens" parameter must be a number between 1 and 2000',
        { status: 400, headers: corsHeaders }
      );
    }

    const tokenLimit = getTokenLimit(model);
    if (!tokenLimit) {
      return new Response(
        'Error: Model not found. Only "hackergpt" model is supported',
        { status: 400, headers: corsHeaders }
      );
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
    let messagesToSend: Message[] = [];

    const lastMessage = messages[messages.length - 1];
    const lastMessageTokens = encoding.encode(lastMessage.content);

    if (lastMessageTokens.length + reservedTokens > tokenLimit) {
      const errorMessage = `This message exceeds the model's maximum token limit of ${tokenLimit}. Please shorten your message.`;
      return new Response(errorMessage, { headers: corsHeaders });
    }

    tokenCount += lastMessageTokens.length;

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const tokens = encoding.encode(message.content);

      if (tokenCount + tokens.length + reservedTokens <= tokenLimit) {
        tokenCount += tokens.length;
        messagesToSend.unshift(message);
      } else {
        break;
      }
    }

    const skipFirebaseStatusCheck =
      process.env.SKIP_FIREBASE_STATUS_CHECK === 'TRUE';

    let userStatusOk = true;

    if (!skipFirebaseStatusCheck) {
      try {
        const response = await fetch(
          `${process.env.SECRET_CHECK_API_STATUS_FIREBASE_FUNCTION_URL}`,
          {
            method: 'POST',
            headers: {
              Authorization: `${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model: model }),
          }
        );

        userStatusOk = response.ok;
        if (!response.ok) {
          const errorText = await response.text();
          return new Response(errorText, { headers: corsHeaders });
        }
      } catch (firebaseError) {
        console.error('Firebase call failed:', firebaseError);
        return new Response('Error communicating with Firebase', {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    encoding.free();

    if (userStatusOk) {
      let streamResult;
      if (model === ModelType.HACKERGPT) {
        streamResult = await HackerGPTStream(
          messagesToSend,
          temp,
          max_tokens,
          stream
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
