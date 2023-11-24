import { Message } from '@/types/chat';
import { OpenAIError } from '@/pages/api/openaistream';

import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';

export const HackerGPTStream = async (
  messages: Message[],
  modelTemperature: number,
  maxTokens: number,
  enableStream: boolean
) => {
  const openAIUrl = `https://api.openai.com/v1/chat/completions`;
  const openRouterUrl = `https://openrouter.ai/api/v1/chat/completions`;

  const openAIHeaders = {
    Authorization: `Bearer ${process.env.SECRET_OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  };

  let cleanedMessages = [];

  const MESSAGE_USAGE_CAP_WARNING = "Hold On! You've Hit Your Usage Cap.";
  const MIN_LAST_MESSAGE_LENGTH = 30;
  const MAX_LAST_MESSAGE_LENGTH = 3000;

  for (let i = 0; i < messages.length - 1; i++) {
    const message = messages[i];
    const nextMessage = messages[i + 1];

    if (
      !message ||
      !nextMessage ||
      typeof message.role === 'undefined' ||
      typeof nextMessage.role === 'undefined'
    ) {
      console.error(
        'One of the messages is undefined or does not have a role property'
      );
      continue;
    }

    if (
      nextMessage.role === 'assistant' &&
      nextMessage.content.includes(MESSAGE_USAGE_CAP_WARNING)
    ) {
      if (message.role === 'user') {
        i++;
        continue;
      }
    } else if (nextMessage.role === 'user' && message.role === 'user') {
      continue;
    } else {
      cleanedMessages.push(message);
    }
  }

  if (
    messages[messages.length - 1].role === 'user' &&
    !messages[messages.length - 1].content.includes(
      MESSAGE_USAGE_CAP_WARNING
    ) &&
    (cleanedMessages.length === 0 ||
      cleanedMessages[cleanedMessages.length - 1].role !== 'user')
  ) {
    cleanedMessages.push(messages[messages.length - 1]);
  }

  if (
    cleanedMessages.length % 2 === 0 &&
    cleanedMessages[0]?.role === 'assistant'
  ) {
    cleanedMessages.shift();
  }

  const queryPineconeVectorStore = async (question: string) => {
    const embeddingsInstance = new OpenAIEmbeddings({
      openAIApiKey: process.env.SECRET_OPENAI_API_KEY,
    });

    const queryEmbedding = await embeddingsInstance.embedQuery(question);

    const PINECONE_QUERY_URL = `https://${process.env.SECRET_PINECONE_INDEX}-${process.env.SECRET_PINECONE_PROJECT_ID}.svc.${process.env.SECRET_PINECONE_ENVIRONMENT}.pinecone.io/query`;

    const requestBody = {
      topK: 5,
      vector: queryEmbedding,
      includeMetadata: true,
      namespace: `${process.env.SECRET_PINECONE_NAMESPACE}`,
    };

    try {
      const response = await fetch(PINECONE_QUERY_URL, {
        method: 'POST',
        headers: {
          'Api-Key': `${process.env.SECRET_PINECONE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const matches = data.matches || [];

      const minimumContextCount = 3;
      if (matches.length < minimumContextCount) {
        return 'None';
      }

      const filteredMatches = matches.filter(
        (match: { score: number }) => match.score > 0.8
      );

      if (filteredMatches.length > 0) {
        let formattedResults = filteredMatches
          .map((match: { metadata: { text: string } }, index: any) => {
            const contextText = match.metadata?.text || '';
            return `[CONTEXT ${index}]:\n${contextText}\n[END CONTEXT ${index}]\n\n`;
          })
          .join('');

        while (formattedResults.length > 7500) {
          let lastContextIndex = formattedResults.lastIndexOf('[CONTEXT ');
          if (lastContextIndex === -1) {
            break;
          }
          formattedResults = formattedResults
            .substring(0, lastContextIndex)
            .trim();
        }

        return formattedResults || 'None';
      } else {
        return 'None';
      }
    } catch (error) {
      console.error(`Error querying Pinecone: ${error}`);
      return 'None';
    }
  };

  const usePinecone = process.env.USE_PINECONE === 'TRUE';

  let systemMessage: Message = {
    role: 'system',
    content: `${process.env.SECRET_OPENAI_SYSTEM_PROMPT}`,
  };

  const translateToEnglish = async (text: any) => {
    const requestBody = {
      model: [`${process.env.SECRET_OPENROUTER_MODEL}`],
      messages: [
        {
          role: 'system',
          content:
            'You are a translation AI. ' +
            'Your task is to translate user input text into English accurately. ' +
            'Focus on providing a clear and direct translation. ' +
            'Do not add any additional comments or information.',
        },
        {
          role: 'user',
          content:
            'Translate the provided text into English. ' +
            'Focus on accuracy and clarity. ' +
            'Ensure the translation is direct and concise. ' +
            'Add no comments, opinions, or extraneous information. ' +
            'Accurately convey the original meaning and context in English. ' +
            'Avoid engaging in discussions or providing interpretations beyond the translation.' +
            'Translate: ' +
            text,
        },
      ],
      temperature: 0.1,
      route: 'fallback',
    };

    try {
      const request = await fetch(openRouterUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SECRET_OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://www.hackergpt.chat',
          'X-Title': 'HackerGPT',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!request.ok) {
        const response = await request.json();
        console.error('Error Code:', response.error?.code);
        console.error('Error Message:', response.error?.message);
        throw new Error(`OpenRouter error: ${response.error?.message}`);
      }

      const data = await request.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error(`Error during translation: ${error}`);
      return '';
    }
  };

  const isEnglish = async (text: string, threshold = 20) => {
    const combinedEnglishAndCybersecurityWords = new Set([
      'the',
      'be',
      'to',
      'of',
      'and',
      'a',
      'in',
      'that',
      'have',
      'I',
      'it',
      'for',
      'not',
      'on',
      'with',
      'he',
      'as',
      'you',
      'do',
      'at',
      'this',
      'but',
      'his',
      'by',
      'from',
      'they',
      'we',
      'say',
      'her',
      'she',
      'or',
      'an',
      'will',
      'my',
      'one',
      'all',
      'would',
      'there',
      'their',
      'what',
      'so',
      'up',
      'out',
      'if',
      'about',
      'who',
      'get',
      'which',
      'go',
      'me',
      'hack',
      'security',
      'vulnerability',
      'exploit',
      'code',
      'system',
      'network',
      'attack',
      'password',
      'access',
      'breach',
      'firewall',
      'malware',
      'phishing',
      'encryption',
      'SQL',
      'injection',
      'XSS',
      'script',
      'website',
      'server',
      'protocol',
      'port',
      'scanner',
      'tool',
      'pentest',
      'payload',
      'defense',
      'patch',
      'update',
      'compliance',
      'audit',
      'brute',
      'force',
      'DDoS',
      'botnet',
      'ransomware',
      'Trojan',
      'spyware',
      'keylogger',
      'rootkit',
      'VPN',
      'proxy',
      'SSL',
      'HTTPS',
      'session',
      'cookie',
      'authentication',
      'authorization',
      'certificate',
      'domain',
      'DNS',
      'IP',
      'address',
      'log',
      'monitor',
      'traffic',
      'data',
      'leak',
      'sensitive',
      'user',
      'admin',
      'credential',
      'privilege',
      'escalation',
      'reverse',
      'shell',
      'command',
      'control',
    ]);

    const words = text.toLowerCase().split(/\s+/);
    const relevantWordCount = words.filter((word) =>
      combinedEnglishAndCybersecurityWords.has(word)
    ).length;
    return relevantWordCount / words.length >= threshold / 100;
  };

  if (
    usePinecone &&
    cleanedMessages.length > 0 &&
    cleanedMessages[cleanedMessages.length - 1].role === 'user'
  ) {
    let lastMessageContent =
      cleanedMessages[cleanedMessages.length - 1].content;

    if (
      lastMessageContent.length > MIN_LAST_MESSAGE_LENGTH &&
      lastMessageContent.length < MAX_LAST_MESSAGE_LENGTH &&
      (await isEnglish(lastMessageContent)) === false
    ) {
      const translatedContent = await translateToEnglish(lastMessageContent);
      lastMessageContent = translatedContent;
    }

    const pineconeResults = await queryPineconeVectorStore(lastMessageContent);

    if (pineconeResults !== 'None') {
      systemMessage.content =
        `${process.env.SECRET_OPENAI_SYSTEM_PROMPT} ` +
        `${process.env.SECRET_PINECONE_SYSTEM_PROMPT}` +
        `Context:\n ${pineconeResults}`;
    }
  }

  if (cleanedMessages[0]?.role !== 'system') {
    cleanedMessages.unshift(systemMessage);
  }

  const requestBody = {
    model: `${process.env.SECRET_HACKERGPT_MODEL}`,
    messages: cleanedMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    max_tokens: maxTokens,
    n: 1,
    stream: enableStream,
    temperature: modelTemperature,
  };

  const res = await fetch(openAIUrl, {
    method: 'POST',
    headers: openAIHeaders,
    body: JSON.stringify(requestBody),
  });

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

  if (!enableStream) {
    const data = await res.json();
    const messages = data.choices.map(
      (choice: { message: { content: any } }) => choice.message.content
    );
    return messages.join('\n');
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const streamResult = new ReadableStream({
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

  return streamResult;
};
