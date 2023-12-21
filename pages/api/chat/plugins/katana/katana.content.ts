import { Message } from '@/types/chat';
import endent from 'endent';

export const isKatanaCommand = (message: string) => {
  if (!message.startsWith('/')) return false;

  const trimmedMessage = message.trim();
  const commandPattern = /^\/katana(?:\s+(-[a-z]+|\S+))*$/;

  return commandPattern.test(trimmedMessage);
};

type SectionKey = 'input' | 'configuration' | 'headless' | 'scope' | 'filter';

const displayHelpGuide = (section: string | null) => {
  const helpPrefix = '```\nUsage:\n' + '   katana [flags]\n\n' + 'Flags:\n';

  const sections = {
    input: 'INPUT:\n' + '  -u, -list string[]  target url / list to crawl\n',
    configuration:
      'CONFIGURATION:\n' +
      '  -jc, -js-crawl               enable endpoint parsing / crawling in javascript file\n' +
      '  -iqp, -ignore-query-params   Ignore crawling same path with different query-param values\n' +
      '  -timeout int                 time to wait for request in seconds (default 10)\n',
    headless:
      'HEADLESS:\n' +
      // '  -hl, -headless          enable headless hybrid crawling (experimental)\n' +
      '  -xhr, -xhr-extraction   extract xhr request url,method in jsonl output\n',
    scope:
      'SCOPE:\n' +
      '  -cs, -crawl-scope string[]        in scope url regex to be followed by crawler\n' +
      '  -cos, -crawl-out-scope string[]   out of scope url regex to be excluded by crawler\n' +
      '  -do, -display-out-scope           display external endpoint from scoped crawling\n',
    filter:
      'FILTER:\n' +
      '  -mr, -match-regex string[]        regex or list of regex to match on output url (cli, file)\n' +
      '  -fr, -filter-regex string[]       regex or list of regex to filter on output url (cli, file)\n' +
      '  -em, -extension-match string[]    match output for given extension (eg, -em php,html,js)\n' +
      '  -ef, -extension-filter string[]   filter output for given extension (eg, -ef png,css)\n' +
      '  -mdc, -match-condition string     match response with dsl based condition\n' +
      '  -fdc, -filter-condition string    filter response with dsl based condition\n',
  };

  const fullHelpGuide =
    '[Katana](https://github.com/projectdiscovery/katana) is a fast crawler focused on execution in automation pipelines offering both headless and non-headless crawling.\n\n' +
    helpPrefix +
    sections.input +
    '\n' +
    sections.configuration +
    '\n' +
    sections.headless +
    '\n' +
    sections.scope +
    '\n' +
    sections.filter +
    '\n```';

  const sectionKey = section ? section.toLowerCase() : null;

  if (sectionKey && sectionKey in sections) {
    return helpPrefix + sections[sectionKey as SectionKey];
  }

  return fullHelpGuide;
};

interface KatanaParams {
  urls: string[];
  depth: number;
  jsCrawl: boolean;
  ignoreQueryParams: boolean;
  headless: boolean;
  xhrExtraction: boolean;
  crawlScope: string[];
  crawlOutScope: string[];
  displayOutScope: boolean;
  matchRegex: string[];
  filterRegex: string[];
  extensionMatch: string[];
  extensionFilter: string[];
  matchCondition: string;
  filterCondition: string;
  timeout: number;
  error: string | null;
  help?: string;
}

const parseKatanaCommandLine = (input: string): KatanaParams => {
  const MAX_INPUT_LENGTH = 2000;
  const MAX_PARAM_LENGTH = 100;
  const MAX_PARAMETER_COUNT = 15;

  if (input.length > MAX_INPUT_LENGTH) {
    return { error: 'Input command is too long' } as KatanaParams;
  }

  const args = input.split(' ');
  if (args.length > MAX_PARAMETER_COUNT) {
    return { error: 'Too many parameters provided' } as KatanaParams;
  }

  const params: KatanaParams = {
    urls: [],
    depth: 3,
    jsCrawl: false,
    ignoreQueryParams: false,
    headless: false,
    xhrExtraction: false,
    crawlScope: [],
    crawlOutScope: [],
    displayOutScope: false,
    matchRegex: [],
    filterRegex: [],
    extensionMatch: [],
    extensionFilter: [],
    matchCondition: '',
    filterCondition: '',
    timeout: 10,
    error: null,
    help: undefined,
  };

  const helpIndex = args.indexOf('-h');
  if (helpIndex !== -1) {
    const nextArg = args[helpIndex + 1];
    const helpSection = nextArg && !nextArg.startsWith('-') ? nextArg : null;
    params.help = displayHelpGuide(helpSection);
    return params;
  }

  const isInteger = (value: string) => /^[0-9]+$/.test(value);
  const isWithinLength = (value: string) => value.length <= MAX_PARAM_LENGTH;
  const isValidUrl = (url: string) =>
    /^https?:\/\/[^\s]+$/.test(url) || /^[^\s]+\.[^\s]+$/.test(url);

  const isValidRegex = (pattern: string) => {
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  };

  for (let i = 0; i < args.length; i++) {
    if (!isWithinLength(args[i])) {
      return { error: `Parameter value too long: ${args[i]}` } as KatanaParams;
    }

    switch (args[i]) {
      case '-u':
      case '-list':
        while (args[i + 1] && !args[i + 1].startsWith('-')) {
          const url = args[++i];
          if (!isValidUrl(url)) {
            params.error = `🚨 Invalid URL provided for '${
              args[i - 1]
            }' flag: ${url}`;
            return params;
          }
          params.urls.push(url);
        }
        if (params.urls.length === 0) {
          params.error = `🚨 No URL provided for '${args[i]}' flag`;
          return params;
        }
        break;
      case '-d':
      case '-depth':
        if (args[i + 1] && isInteger(args[i + 1])) {
          params.depth = parseInt(args[++i]);
        } else {
          params.error = `🚨 Invalid depth value for '${args[i]}' flag`;
          return params;
        }
        break;
      case '-jc':
      case '-js-crawl':
        params.jsCrawl = true;
        break;
      case '-iqp':
      case '-ignore-query-params':
        params.ignoreQueryParams = true;
        break;
      // case '-hl':
      // case '-headless':
      //   params.headless = true;
      //   break;
      case '-xhr':
      case '-xhr-extraction':
        params.xhrExtraction = true;
        break;
      case '-cs':
      case '-crawl-scope':
        while (args[i + 1] && !args[i + 1].startsWith('-')) {
          const scope = args[++i];
          if (!isValidRegex(scope)) {
            params.error = `🚨 Invalid crawl scope regex pattern for '${
              args[i - 1]
            }' flag: ${scope}`;
            return params;
          }
          params.crawlScope.push(scope);
        }
        if (params.crawlScope.length === 0) {
          params.error = `🚨 No crawl scope regex pattern provided for '${args[i]}' flag`;
          return params;
        }
        break;
      case '-cos':
      case '-crawl-out-scope':
        while (args[i + 1] && !args[i + 1].startsWith('-')) {
          const outScope = args[++i];
          if (!isValidRegex(outScope)) {
            params.error = `🚨 Invalid crawl out-scope regex pattern for '${
              args[i - 1]
            }' flag: ${outScope}`;
            return params;
          }
          params.crawlOutScope.push(outScope);
        }
        if (params.crawlOutScope.length === 0) {
          params.error = `🚨 No crawl out-scope regex pattern provided for '${args[i]}' flag`;
          return params;
        }
        break;
      case '-do':
      case '-display-out-scope':
        params.displayOutScope = true;
        break;
      case '-mr':
      case '-match-regex':
        while (args[i + 1] && !args[i + 1].startsWith('-')) {
          const regex = args[++i];
          if (!isValidRegex(regex)) {
            params.error = `🚨 Invalid match regex for '${
              args[i - 1]
            }' flag: ${regex}`;
            return params;
          }
          params.matchRegex.push(regex);
        }
        if (params.matchRegex.length === 0) {
          params.error = `🚨 No match regex provided for '${args[i]}' flag`;
          return params;
        }
        break;
      case '-fr':
      case '-filter-regex':
        while (args[i + 1] && !args[i + 1].startsWith('-')) {
          const regex = args[++i];
          if (!isValidRegex(regex)) {
            params.error = `🚨 Invalid filter regex for '${
              args[i - 1]
            }' flag: ${regex}`;
            return params;
          }
          params.filterRegex.push(regex);
        }
        if (params.filterRegex.length === 0) {
          params.error = `🚨 No filter regex provided for '${args[i]}' flag`;
          return params;
        }
        break;
      case '-em':
      case '-extension-match':
        while (args[i + 1] && !args[i + 1].startsWith('-')) {
          const ext = args[++i];
          params.extensionMatch.push(ext);
        }
        if (params.extensionMatch.length === 0) {
          params.error = `🚨 No extension match provided for '${args[i]}' flag`;
          return params;
        }
        break;
      case '-ef':
      case '-extension-filter':
        while (args[i + 1] && !args[i + 1].startsWith('-')) {
          const ext = args[++i];
          params.extensionFilter.push(ext);
        }
        if (params.extensionFilter.length === 0) {
          params.error = `🚨 No extension filter provided for '${args[i]}' flag`;
          return params;
        }
        break;
      case '-mdc':
      case '-match-condition':
        if (args[i + 1] && !args[i + 1].startsWith('-')) {
          params.matchCondition = args[++i];
        } else {
          params.error = `🚨 No match condition provided for '${args[i]}' flag`;
          return params;
        }
        break;
      case '-fdc':
      case '-filter-condition':
        if (args[i + 1] && !args[i + 1].startsWith('-')) {
          params.filterCondition = args[++i];
        } else {
          params.error = `🚨 No filter condition provided for '${args[i]}' flag`;
          return params;
        }
        break;
      case '-timeout':
        if (args[i + 1] && isInteger(args[i + 1])) {
          let timeoutValue = parseInt(args[++i]);
          if (timeoutValue > 90) {
            params.error = `🚨 Timeout value exceeds the maximum limit of 90 seconds`;
            return params;
          }
          params.timeout = timeoutValue;
        } else {
          params.error = `🚨 Invalid timeout value for '${args[i]}' flag`;
          return params;
        }
        break;
    }
  }

  if (!params.urls.length || params.urls.length === 0) {
    params.error = '🚨 Error: -u parameter is required.';
  }

  return params;
};

export async function handleKatanaRequest(
  lastMessage: Message,
  corsHeaders: HeadersInit | undefined,
  enableKatanaFeature: boolean,
  OpenAIStream: {
    (model: string, messages: Message[], answerMessage: Message): Promise<
      ReadableStream<any>
    >;
    (arg0: any, arg1: any, arg2: any): any;
  },
  model: string,
  messagesToSend: Message[],
  answerMessage: Message
) {
  if (!enableKatanaFeature) {
    return new Response('The Katana feature is disabled.', {
      status: 200,
      headers: corsHeaders,
    });
  }

  const params = parseKatanaCommandLine(lastMessage.content);

  if (params.help) {
    return new Response(params.help, { status: 200, headers: corsHeaders });
  }

  if (params.error) {
    return new Response(params.error, { status: 200, headers: corsHeaders });
  }

  let katanaUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/katana?`;

  if (params.urls.length > 0) {
    katanaUrl += params.urls
      .map((u) => `urls=${encodeURIComponent(u)}`)
      .join('&');
  }
  if (params.depth !== 3) {
    katanaUrl += `&depth=${params.depth}`;
  }
  if (params.jsCrawl) {
    katanaUrl += `&jsCrawl=${params.jsCrawl}`;
  }
  if (params.ignoreQueryParams) {
    katanaUrl += `&ignoreQueryParams=${params.ignoreQueryParams}`;
  }
  if (params.headless) {
    katanaUrl += `&headless=${params.headless}`;
  }
  if (params.xhrExtraction) {
    katanaUrl += `&xhrExtraction=${params.xhrExtraction}`;
  }
  if (params.crawlScope.length > 0) {
    katanaUrl += `&crawlScope=${params.crawlScope
      .map((cs) => encodeURIComponent(cs))
      .join(',')}`;
  }
  if (params.crawlOutScope.length > 0) {
    katanaUrl += `&crawlOutScope=${params.crawlOutScope
      .map((cos) => encodeURIComponent(cos))
      .join(',')}`;
  }
  if (params.displayOutScope) {
    katanaUrl += `&displayOutScope=${params.displayOutScope}`;
  }
  if (params.matchRegex.length > 0) {
    katanaUrl += `&matchRegex=${params.matchRegex
      .map((mr) => encodeURIComponent(mr))
      .join(',')}`;
  }
  if (params.filterRegex.length > 0) {
    katanaUrl += `&filterRegex=${params.filterRegex
      .map((fr) => encodeURIComponent(fr))
      .join(',')}`;
  }
  if (params.extensionMatch.length > 0) {
    katanaUrl += `&extensionMatch=${params.extensionMatch
      .map((em) => encodeURIComponent(em))
      .join(',')}`;
  }
  if (params.extensionFilter.length > 0) {
    katanaUrl += `&extensionFilter=${params.extensionFilter
      .map((ef) => encodeURIComponent(ef))
      .join(',')}`;
  }
  if (params.matchCondition) {
    katanaUrl += `&matchCondition=${encodeURIComponent(params.matchCondition)}`;
  }
  if (params.filterCondition) {
    katanaUrl += `&filterCondition=${encodeURIComponent(
      params.filterCondition
    )}`;
  }
  if (params.timeout !== 10) {
    katanaUrl += `&timeout=${params.timeout}`;
  }

  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', 'text/event-stream');
  headers.set('Cache-Control', 'no-cache');
  headers.set('Connection', 'keep-alive');

  const stream = new ReadableStream({
    async start(controller) {
      const sendMessage = (
        data: string,
        addExtraLineBreaks: boolean = false
      ) => {
        const formattedData = addExtraLineBreaks ? `${data}\n\n` : data;
        controller.enqueue(new TextEncoder().encode(formattedData));
      };

      sendMessage('🚀 Starting the scan. It might take a minute.', true);

      const intervalId = setInterval(() => {
        sendMessage('⏳ Still working on it, please hold on...', true);
      }, 15000);

      try {
        const katanaResponse = await fetch(katanaUrl, {
          method: 'GET',
          headers: {
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`,
            Host: 'plugins.hackergpt.co',
          },
        });

        if (!katanaResponse.ok) {
          throw new Error(`HTTP error! status: ${katanaResponse.status}`);
        }

        const jsonResponse = await katanaResponse.json();

        const outputString = jsonResponse.output;

        if (
          outputString &&
          outputString.includes('Error executing Katana command') &&
          outputString.includes('Error reading output file')
        ) {
          const errorMessage = `🚨 An error occurred while running your query. Please try again or check your input.`;
          clearInterval(intervalId);
          sendMessage(errorMessage, true);
          controller.close();
          return new Response(errorMessage, {
            status: 200,
            headers: corsHeaders,
          });
        }

        if (!outputString && outputString.length === 0) {
          const noDataMessage = `🔍 Didn't find anything for ${params.urls.join(
            ', '
          )}.`;
          clearInterval(intervalId);
          sendMessage(noDataMessage, true);
          controller.close();
          return new Response(noDataMessage, {
            status: 200,
            headers: corsHeaders,
          });
        }

        clearInterval(intervalId);
        sendMessage('✅ Scan done! Now processing the results...', true);

        const urls = processurls(outputString);
        const formattedResponse = formatResponseString(urls, params);
        sendMessage(formattedResponse, true);

        controller.close();
      } catch (error) {
        clearInterval(intervalId);
        let errorMessage =
          '🚨 There was a problem during the scan. Please try again.';
        if (error instanceof Error) {
          errorMessage = `🚨 Error: ${error.message}`;
        }
        sendMessage(errorMessage, true);
        controller.close();
        return new Response(errorMessage, {
          status: 200,
          headers: corsHeaders,
        });
      }
    },
  });

  return new Response(stream, { headers });
}

function processurls(outputString: string) {
  return outputString
    .split('\n')
    .filter((subdomain) => subdomain.trim().length > 0);
}

function formatResponseString(urls: any[], params: KatanaParams) {
  const date = new Date();
  const timezone = 'UTC-5';
  const formattedDateTime = date.toLocaleString('en-US', {
    timeZone: 'Etc/GMT+5',
    timeZoneName: 'short',
  });

  const urlsFormatted = urls.join('\n');
  return (
    '## [Katana](https://github.com/projectdiscovery/katana) Scan Results\n' +
    '**Target**: "' +
    params.urls +
    '"\n\n' +
    '**Scan Date and Time**:' +
    ` ${formattedDateTime} (${timezone}) \n\n` +
    '### Identified Urls:\n' +
    '```\n' +
    urlsFormatted +
    '\n' +
    '```\n'
  );
}
