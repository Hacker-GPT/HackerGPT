import { OpenAIError, OpenAIStream } from '@/pages/api/openaistream';
import { fetchGoogleSearchResults, processGoogleResults, createAnswerPromptGoogle} from '@/pages/api/google';
import { HackerGPTStream } from '@/pages/api/hackergptstream';
import { ChatBody, Message } from '@/types/chat';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import endent from 'endent';

export const config = {
  runtime: 'edge',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.hackergpt.chat',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

enum ModelType {
  GPT35TurboInstruct = 'gpt-3.5-turbo-instruct',
  GoogleBrowsing = 'gpt-3.5-turbo',
  GPT4 = 'gpt-4',
}

const getTokenLimit = (model: string) => {
  switch (model) {
    case ModelType.GPT35TurboInstruct:
      return 8000;
    case ModelType.GoogleBrowsing:
      return 8000;
    case ModelType.GPT4:
      return 8000;
    default:
      return null;
  }
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const useWebBrowsingPlugin = process.env.USE_WEB_BROWSING_PLUGIN === 'TRUE';
    if (!useWebBrowsingPlugin) {
      return new Response(
          'The Web Browsing Plugin is disabled. To enable it, please configure the necessary environment variables.',
          { status: 200, headers: corsHeaders }
      );
    }
    
    const authToken = req.headers.get('Authorization');
    let { messages, model, max_tokens, temperature, stream } =
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
    let messagesToSend: Message[] = [];
    let startIndex = 0; 

    if (model === ModelType.GoogleBrowsing) {
      startIndex = 1; 
    }

    const lastMessage = messages[messages.length - 1];
    const lastMessageTokens = encoding.encode(lastMessage.content);

    if (lastMessageTokens.length + reservedTokens > tokenLimit) {
      const errorMessage = `This message exceeds the model's maximum token limit of ${tokenLimit}. Please shorten your message.`;
      return new Response(errorMessage, { headers: corsHeaders });
    }

    tokenCount += lastMessageTokens.length;

    for (let i = messages.length - 1 - startIndex; i >= 0; i--) {
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

    if (model === ModelType.GoogleBrowsing) {
      const query = lastMessage.content.trim()
      const googleData = await fetchGoogleSearchResults(query);
      const sourceTexts = await processGoogleResults(googleData, tokenLimit, tokenCount);

      const answerPrompt = createAnswerPromptGoogle(query, sourceTexts);
      answerMessage = { role: 'user', content: answerPrompt };
    }

    encoding.free();
    
    if (userStatusOk && lastMessage.content.startsWith("subfinder -d")) {
      // Subfinder command handling
      const parts = lastMessage.content.split(" ");
      const domainIndex = parts.findIndex(part => part === '-d') + 1;
      const domain = parts[domainIndex];
      
      const protocol = req.headers.get('x-forwarded-proto') || 'http';
      const host = req.headers.get('host');
      if (!host) {
        return new Response('Could not determine the request host', { status: 500 });
      }
  
      const subfinderUrl = `${protocol}://${host}/api/subfinder?domain=${domain}&concurrency=30`;  
        
      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', 'text/event-stream');
      headers.set('Cache-Control', 'no-cache');
      headers.set('Connection', 'keep-alive');
  
      const stream = new ReadableStream({
        async start(controller) {
          const sendMessage = (data: string, addExtraLineBreaks: boolean = false) => {
            const formattedData = addExtraLineBreaks ? `${data}\n\n` : data;
            controller.enqueue(new TextEncoder().encode(formattedData));
          };
      
          sendMessage('Starting Subfinder process...', true);
      
          const intervalId = setInterval(() => {
            sendMessage('Still processing. Please wait...', true);
          }, 5000);
      
          try {
            
            const subfinderResponse = await fetch(subfinderUrl);
            let subfinderData = await subfinderResponse.text();
      
            // Process the subfinder data to extract only domain names
            subfinderData = processSubfinderData(subfinderData);
            
            let additionalNote = '';
            if (subfinderData.length > 5000) {
              subfinderData = subfinderData.slice(0, 5000);
              additionalNote = '\n\nNote: The list of subdomains has been truncated due to length.';
            }
            
            clearInterval(intervalId);
            sendMessage('Subfinder process completed.', true);  
      
            const messageContent = endent`
            The list of subdomains identified by the 'subfinder' scan for "${domain}" is provided below. You should provide formatted list in a code block for easy copy-pasting with domains in response is requirement, than as addition to scan facilitating thorough review and further security analysis. 

            ### Subfinder Scan Results for "${domain}"
            **Date and Time of Scan**: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
                        
            Identified Subdomains:
            
            \`\`\`
            ${subfinderData}
            \`\`\`
            ${additionalNote}

            ### Key Highlights
            
            While the list is extensive, here are a few subdomains that may warrant special attention based on their names or presumed functions. These highlights are not exhaustive and are provided to assist in prioritizing initial areas of focus:
            
            - [List a few subdomains from "Identified Subdomain" that stand out, if any, and briefly mention why they might be particularly noteworthy or warrant further investigation.]            
            
            This analysis should serve as an initial guide for subsequent in-depth security evaluations of the listed subdomains.
            `;
            answerMessage.content = messageContent;
      
            const openAIResponseStream = await OpenAIStream(model, messagesToSend, answerMessage);
            const reader = openAIResponseStream.getReader();
      
            // @ts-expect-error
            reader.read().then(function processText({ done, value }) {
              if (done) {
                controller.close();
                return;
              }
      
              const decodedValue = new TextDecoder().decode(value, { stream: true });
              sendMessage(decodedValue);
      
              return reader.read().then(processText);
            });
      
          } catch (error) {
            console.error('Error fetching from subfinder:', error);
            clearInterval(intervalId);

            const errorMessage = (error as Error).message;
            sendMessage(`Error: ${errorMessage}`, true);
          }
        }
      });      
      
      return new Response(stream, { headers });
    } else {
    
      if (userStatusOk) {
        let streamResult;
        if (model === ModelType.GPT35TurboInstruct) {
          streamResult = await HackerGPTStream(
            messagesToSend,
            temperature,
            max_tokens,
            stream
          );
        } else {
          streamResult = await OpenAIStream(model, messagesToSend, answerMessage);
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

function processSubfinderData(data: string): string {
  return data
    .split('\n')
    .filter(line => line && !line.startsWith('data:') && line.trim() !== '')
    .join(''); 
}


export default handler;
