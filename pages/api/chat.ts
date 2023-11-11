import { OpenAIError, OpenAIStream } from '@/pages/api/openaistream';
import { PalmStream } from '@/pages/api/palmstream';
import { ChatBody, Message } from '@/types/chat';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import { GoogleSource } from '@/types/google';

import endent from 'endent';

// @ts-ignore
import cheerio from 'cheerio';

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
      return 4000;
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
    const authToken = req.headers.get('Authorization');
    let { model, messages } = (await req.json()) as ChatBody;
    const tokenLimit = getTokenLimit(model);

    if (!tokenLimit) {
      return new Response('Error: Model not found', {
        status: 400,
        headers: corsHeaders,
      });
    }

    let reservedTokens = 1500;
    if (model === 'gpt-3.5-turbo') {
      reservedTokens = 2000;
    }

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

    let googleSources: GoogleSource[] = [];
    let answerMessage: Message = { role: 'user', content: '' };

    const useWebBrowsingPlugin = process.env.USE_WEB_BROWSING_PLUGIN === 'TRUE';

    if (model === ModelType.GoogleBrowsing && !useWebBrowsingPlugin) {
      return new Response(
        'The Web Browsing Plugin is disabled. To enable it, please configure the necessary environment variables.',
        { status: 200, headers: corsHeaders }
      );
    }

    if (model === ModelType.GoogleBrowsing) {
      const query = encodeURIComponent(
        messagesToSend[messagesToSend.length - 1].content.trim()
      );

      const googleRes = await fetch(
        `https://customsearch.googleapis.com/customsearch/v1?key=${process.env.SECRET_GOOGLE_API_KEY}&cx=${process.env.SECRET_GOOGLE_CSE_ID}&q=${query}&num=5`
      );

      if (!googleRes.ok) {
        console.error('Error from Google API:', await googleRes.text());
        return new Response('Google API returned an error.', {
          headers: corsHeaders,
        });
      }

      const googleData = await googleRes.json();

      if (googleData && googleData.items) {
        googleSources = googleData.items.map((item: any) => ({
          title: item.title,
          link: item.link,
          displayLink: item.displayLink,
          snippet: item.snippet,
          image: item.pagemap?.cse_image?.[0]?.src,
          text: '',
        }));
      } else {
        googleSources = [];
      }

      const textDecoder = new TextDecoder();

      const sourcesWithText: any = await Promise.all(
        googleSources.map(async (source) => {
          try {
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Request timed out')), 5000)
            );

            const res = (await Promise.race([
              fetch(source.link), // <-- Replaced axios.get with fetch
              timeoutPromise,
            ])) as Response;

            if (!res || !res.ok) {
              // <-- Check if response is okay
              console.error('Invalid response:', res);
              throw new Error('Invalid response');
            }

            const textData = await res.text(); // <-- Extract text from response
            const $ = cheerio.load(textData); // <-- Load text into cheerio
            const sourceText = $('body').text().trim();

            // Limit the text to 400 tokens
            let encodedText = encoding.encode(sourceText);
            if (encodedText.length > 400) {
              encodedText = encodedText.slice(0, 400);
            }

            return {
              ...source,
              text: textDecoder.decode(encoding.decode(encodedText)),
            } as GoogleSource;
          } catch (error) {
            console.error('Caught an error:', error);
            return null;
          }
        })
      );

      // Filter out null sources
      const filteredSources: GoogleSource[] = sourcesWithText.filter(Boolean);

      let sourceTexts: string[] = [];
      let tokenSizeTotalForGoogle = 0;

      // Calculate available tokens for Google Sources and completion
      const availableTokens = tokenLimit - tokenCount - reservedTokens; // 2000 for completion

      // Loop through each Google source and add it if it doesn't exceed the available tokens
      for (const source of filteredSources) {
        const decodedLink = decodeURIComponent(source.link);
        const text = endent`
            ${source.title} (${decodedLink}):
            ${source.snippet}
            `;
        const tokenSize = encoding.encode(text).length;

        if (tokenSizeTotalForGoogle + tokenSize <= availableTokens) {
          sourceTexts.push(text);
          tokenSizeTotalForGoogle += tokenSize;
        } else {
          break; // Stop adding more Google sources if it exceeds the available tokens
        }
      }

      const answerPrompt = endent`
          Answer the following questions as best you can. Pretend to utilize a "Programmable Search Engine" functionality to fetch and verify data from the web. Use the provided "sources" to give an accurate, role-played response. Respond in markdown format. Cite the "sources" you "used" as a markdown link at the end of each sentence by the number of the "source" (ex: [[1]](link.com)). Provide an accurate role-played response and then stop. Today's date is ${new Date().toLocaleDateString()}.
          
          Example Input:
          What's the weather in San Francisco today?
          
          Example "Sources":
          [Weather in San Francisco](https://www.google.com/search?q=weather+san+francisco)
          
          Example Role-played Response:
          It's 70 degrees and sunny in San Francisco today. [[1]](https://www.google.com/search?q=weather+san+francisco)
          
          Input:
          ${query.trim()}
          
          "Sources":
          ${sourceTexts}
          
          Role-played Response:
          `;

      answerMessage = { role: 'user', content: answerPrompt };
    }

    encoding.free();

    if (userStatusOk) {
      let stream;
      if (model === ModelType.GPT35TurboInstruct) {
        stream = await PalmStream(messagesToSend);
      } else {
        stream = await OpenAIStream(model, messagesToSend, answerMessage);
      }

      return new Response(stream, {
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
