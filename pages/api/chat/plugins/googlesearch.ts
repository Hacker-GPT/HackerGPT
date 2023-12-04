import { GoogleSource } from '@/types/google';
import cheerio from 'cheerio';
import endent from 'endent';

// @ts-expect-error
import wasm from '../../../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';

const GOOGLE_API_KEY = process.env.SECRET_GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.SECRET_GOOGLE_CSE_ID;

const fetchGoogleSearchResults = async (query: string) => {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://customsearch.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodedQuery}&num=5`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch Google Search Results');
  }

  return response.json();
};

const processGoogleResults = async (
  googleData: {
    items: {
      title: any;
      link: any;
      displayLink: any;
      snippet: any;
      pagemap: { cse_image: { src: any }[] };
    }[];
  },
  tokenLimit: number,
  tokenCount: number
) => {
  await init((imports) => WebAssembly.instantiate(wasm, imports));
  const encoding = new Tiktoken(
    tiktokenModel.bpe_ranks,
    tiktokenModel.special_tokens,
    tiktokenModel.pat_str
  );

  let googleSources: GoogleSource[] = [];
  let sourceTexts: string[] = [];
  let tokenSizeTotalForGoogle = 0;

  if (googleData && googleData.items) {
    googleSources = googleData.items.map(
      (item: {
        title: any;
        link: any;
        displayLink: any;
        snippet: any;
        pagemap: { cse_image: { src: any }[] };
      }) => ({
        title: item.title,
        link: item.link,
        displayLink: item.displayLink,
        snippet: item.snippet,
        image: item.pagemap?.cse_image?.[0]?.src,
        text: '',
      })
    );
  }

  const textDecoder = new TextDecoder();

  const sourcesWithText: any = await Promise.all(
    googleSources.map(async (source) => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out')), 5000)
        );

        const res = (await Promise.race([
          fetch(source.link),
          timeoutPromise,
        ])) as Response;

        if (!res || !res.ok) {
          console.error('Invalid response:', res);
          throw new Error('Invalid response');
        }

        const textData = await res.text();
        const $ = cheerio.load(textData);
        const sourceText = $('body').text().trim();

        let encodedText = encoding.encode(sourceText);
        if (encodedText.length > 400) {
          encodedText = encodedText.slice(0, 400);
        }

        return {
          ...source,
          text: textDecoder.decode(encoding.decode(encodedText)),
        };
      } catch (error) {
        console.error(`Error processing source link ${source.link}:`, error);
        return null;
      }
    })
  );

  const filteredSources = sourcesWithText.filter(Boolean);

  const availableTokens = tokenLimit - tokenCount - 2000;

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
      break;
    }
  }

  return sourceTexts;
};

const createAnswerPromptGoogle = (query: string, sourceTexts: string[]) => {
  return endent`
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
};

export {
  fetchGoogleSearchResults,
  processGoogleResults,
  createAnswerPromptGoogle,
};
