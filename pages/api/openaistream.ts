import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';

export class OpenAIError extends Error {
  type: string;
  param: string;
  code: string;

  constructor(message: string, type: string, param: string, code: string) {
    super(message);
    this.name = 'OpenAIError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

export const OpenAIStream = async (
  model: OpenAIModel['id'],
  messages: Message[],
  answerMessage: Message
) => {
  const systemPrompt = process.env.SECRET_OPENAI_SYSTEM_PROMPT;
  const openaiKey = process.env.SECRET_OPENAI_API_KEY;

  const commonBody = {
    model: '',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages,
    ],
    max_tokens: 1000,
    temperature: 0.4,
    stream: true,
  };

  let url: string;
  let headers: Record<string, string>;

  if (model === 'gpt-3.5-turbo') {
    url = `https://api.openai.com/v1/chat/completions`;
    commonBody['model'] = `gpt-4-1106-preview`;
    (commonBody['messages'] = [
      {
        role: 'system',
        content: process.env.SECRET_OPENAI_GOOGLE_SEARCH_SYSTEM_PROMPT,
      },
      ...messages,
      answerMessage,
    ]),
      (headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      });
  } else if (model === 'gpt-4') {
    url = `https://api.openai.com/v1/chat/completions`;
    commonBody['model'] = `gpt-4-1106-preview`;
    (commonBody['messages'] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages,
    ]),
      (headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      });
  } else {
    url = `https://api.openai.com/v1/chat/completions`;
    commonBody['model'] = `gpt-3.5-turbo`;
    headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    };
  }

  const requestOptions = {
    headers,
    method: 'POST',
    body: JSON.stringify(commonBody),
  };

  const res = await fetch(url, requestOptions);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const result = await res.json();
    if (result.error) {
      throw new OpenAIError(
        result.error.message,
        result.error.type,
        result.error.param,
        result.error.code
      );
    } else {
      throw new Error(`OpenAI API returned an error: ${result.statusText}`);
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data;
          if (data !== '[DONE]') {
            try {
              const json = JSON.parse(data);
              if (json.choices[0].finish_reason != null) {
                controller.close();
                return;
              }
              const text = json.choices[0].delta.content;
              const queue = encoder.encode(text);
              controller.enqueue(queue);
            } catch (e) {
              controller.error(e);
            }
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        const content = decoder.decode(chunk);
        if (content.trim() === 'data: [DONE]') {
          controller.close();
        } else {
          parser.feed(content);
        }
      }
    },
  });

  return stream;
};
