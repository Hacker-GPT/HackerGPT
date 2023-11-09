import { Message } from '@/types/chat';

import { createParser } from 'eventsource-parser';
import {OpenAIEmbeddings} from "langchain/embeddings/openai";


class APIError extends Error {
    code: any;
    constructor(message: string | undefined, code: any) {
      super(message);
      this.name = 'APIError';
      this.code = code;
    }
  }

interface ParsedEvent {
    type: 'event';
    data: string;
  }

interface ReconnectInterval {
    type: string;
  }


export const PalmStream = async (messages: Message[],) => { 
    const url = `https://openrouter.ai/api/v1/chat/completions`;
    const headers = {
        'Authorization': `Bearer ${process.env.SECRET_PALM2_CHAT_BISON_API_KEY}`,
        'HTTP-Referer': `https://www.hackergpt.chat`,
        'X-Title': `HackerGPT`,
        'Content-Type': 'application/json'
      };

    let cleanedMessages = [];
    const usageCapMessage = "Hold On! You've Hit Your Usage Cap.";

    for (let i = 0; i < messages.length - 1; i++) { 
        const message = messages[i];
        const nextMessage = messages[i + 1];
        
        if (!message || !nextMessage || typeof message.role === 'undefined' || typeof nextMessage.role === 'undefined') {
          console.error('One of the messages is undefined or does not have a role property');
          continue; 
      }

        if (nextMessage.role === 'assistant' && nextMessage.content.includes(usageCapMessage)) {
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
        
    if (messages[messages.length - 1].role === 'user' && 
            !messages[messages.length - 1].content.includes(usageCapMessage) &&
            (cleanedMessages.length === 0 || cleanedMessages[cleanedMessages.length - 1].role !== 'user')) {
            cleanedMessages.push(messages[messages.length - 1]);
        }
        
    if (cleanedMessages.length % 2 === 0 && cleanedMessages[0]?.role === 'assistant') {
                cleanedMessages.shift();
        }

    const systemMessage: Message = {
        role: 'system', 
        content: `${process.env.SECRET_PALM2_SYSTEM_PROMPT}`
      };
      
    if (cleanedMessages[0]?.role !== 'system') {
        cleanedMessages.unshift(systemMessage);
      }

      const queryPineconeVectorStore = async (question: string) => {
        const embeddingsInstance = new OpenAIEmbeddings({
          openAIApiKey: process.env.SECRET_OPENAI_API_KEY,
        });
      
        const queryEmbedding = await embeddingsInstance.embedQuery(question);
        
        const PINECONE_QUERY_URL = `https://${process.env.SECRET_PINECONE_INDEX}-${process.env.SECRET_PINECONE_PROJECT_ID}.svc.${process.env.SECRET_PINECONE_ENVIRONMENT}.pinecone.io/query`;
      
        const requestBody = {
          topK: 1,
          vector: queryEmbedding,
          includeMetadata: true,
          namespace: `${process.env.SECRET_PINECONE_NAMESPACE}`
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
          if (matches.length > 0 && matches[0].score > 0.82) {
            const results = matches.map((match: { metadata: { text: any; }; }) => match.metadata?.text || "");
            let resultsString = results.join(" ");
      
            if (resultsString.length > 10000) {
              resultsString = resultsString.substring(0, 10000);
            }
      
            return resultsString;
          } else {
            return "None";
          }
        } catch (error) {
          console.error(`Error querying Pinecone: ${error}`);
          return "None";
        }
      };

      const usePinecone = process.env.USE_PINECONE === 'TRUE';

      if (usePinecone && cleanedMessages.length > 0 && cleanedMessages[cleanedMessages.length - 1].role === 'user') {
        const combinedLastMessages = cleanedMessages[cleanedMessages.length - 1].content;
        const pineconeResults = await queryPineconeVectorStore(combinedLastMessages);
        
        if (pineconeResults !== "None") {
            cleanedMessages[cleanedMessages.length - 1].content =
              "Provide a well-informed and accurate response to the " +
              "my question. Utilize your extensive knowledge and " +
              "expertise, and where relevant, incorporate insights from " +
              "the semantic search results to enrich your answer. Do not " +
              "rely on these results as the sole source of information— " +
              "they are supplemental and may not always be perfectly " +
              "accurate. Focus on delivering a precise and comprehensive " +
              "response that is reflective of your own understanding and " +
              "capabilities as HackerGPT. Here is the my question and " +
              "the related semantic search results:\n" +
              `Question: """${combinedLastMessages}"""\n` +
              "Semantic Search Context (Use as reference only): " +
              `"""${pineconeResults}"""\n` +
              "Your response should directly address the my question " +
              "above, with clarity and depth.\n" +
              "Response:";
        }
      }

    try {
        const requestBody = {
          model: "google/palm-2-chat-bison-32k",
          messages: cleanedMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          stream: true,
          temperature: 0.2,
          max_tokens: 1024,
          top_p: 0.8,
          top_k: 40,
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(requestBody),
        });
        
        if (!res.ok) {
          const result = await res.json();
          let errorMessage = result.error?.message || "An unknown error occurred";
      
          switch (res.status) {
            case 400:
              throw new APIError(`Bad Request: ${errorMessage}`, 400);
            case 401:
              throw new APIError(`Invalid Credentials: ${errorMessage}`, 401);
            case 402:
              throw new APIError(`Out of Credits: ${errorMessage}`, 402);
            case 403:
              throw new APIError(`Moderation Required: ${errorMessage}`, 403);
            case 408:
              throw new APIError(`Request Timeout: ${errorMessage}`, 408);
            case 429:
              throw new APIError(`Rate Limited: ${errorMessage}`, 429);
            case 502:
              throw new APIError(`Service Unavailable: ${errorMessage}`, 502);
            default:
              throw new APIError(`HTTP Error: ${errorMessage}`, res.status);
          }
        }

        if (!res.body) {
          throw new Error("Response body is null");
        }

        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            const parser = createParser((event: ParsedEvent | ReconnectInterval) => {
              if ('data' in event) { 
                const data = event.data;
                if (data !== '[DONE]') {
                  try {
                    const json = JSON.parse(data);
                    if (json.choices && json.choices[0].finish_reason != null) {
                      controller.close();
                      return;
                    }
                    const text = json.choices[0].delta.content;
                    const queue = encoder.encode(text);
                    controller.enqueue(queue);
                  } catch (e) {
                    controller.error(`Failed to parse event data: ${e}`);
                  }
                }
              }
            });
      
            for await (const chunk of res.body as any) {
              const content = decoder.decode(chunk);
              parser.feed(content);
              if (content.trim().endsWith("data: [DONE]")) {
                controller.close();
              }
            }
          },
        });
      
        return stream;
      } catch (error) {
        if (error instanceof APIError) {
          console.error(`API Error - Code: ${error.code}, Message: ${error.message}`);
        } else if (error instanceof Error) {
          console.error(`Unexpected Error: ${error.message}`);
        } else {
          console.error(`An unknown error occurred: ${error}`);
        }
      }      
};

  
  