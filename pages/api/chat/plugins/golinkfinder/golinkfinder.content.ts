import { Message } from '@/types/chat';
import endent from 'endent';

import { checkToolRateLimit, toolUrls } from '@/pages/api/chat/plugins/tools';

export const isGoLinkFinderCommand = (message: string) => {
  if (!message.startsWith('/')) return false;

  const trimmedMessage = message.trim();
  const commandPattern = /^\/golinkfinder(?:\s+(-[a-z]+|\S+))*$/;

  return commandPattern.test(trimmedMessage);
};

const displayHelpGuide = () => {
  return `
  [GoLinkFinder](${toolUrls.GoLinkFinder}) is a minimalistic JavaScript endpoint extractor that efficiently pulls endpoints from HTML and embedded JavaScript files. 

    Usage:
       /golinkfinder --domain [domain]

    Flags:
    CONFIGURATION:
       -d --domain string   Input a URL.`;
};

interface GoLinkFinderParams {
  domain: string[];
  error: string | null;
}

const parseGoLinkFinderCommandLine = (input: string): GoLinkFinderParams => {
  const MAX_INPUT_LENGTH = 1000;
  const MAX_ARRAY_SIZE = 1;

  const params: GoLinkFinderParams = {
    domain: [],
    error: null,
  };

  if (input.length > MAX_INPUT_LENGTH) {
    params.error = `🚨 Input command is too long`;
    return params;
  }

  const trimmedInput = input.trim().toLowerCase();
  const args = trimmedInput.split(' ');
  args.shift();

  for (let i = 0; i < args.length; i++) {

    try {
      switch (args[i]) {
        case '--domain':
          params.domain = args[++i].split(',');
          if (params.domain.length > MAX_ARRAY_SIZE) {
            params.error = `🚨 Too many elements in domain array`;
            return params;
          }
          break;
        default:
          params.error = `🚨 Invalid or unrecognized flag: ${args[i]}`;
          break;
      }
    } catch (error) {
      if (error instanceof Error) {
        return { ...params, error: error.message };
      }
    }
  }

  if (!params.domain  || params.domain.length === 0) {
    params.error = `🚨 No target domain/URL provided`;
    return params;
  }

  return params;
};

export async function handleGoLinkFinderRequest(
  lastMessage: Message,
  corsHeaders: HeadersInit | undefined,
  enableGoLinkFinderFeature: boolean,
  OpenAIStream: {
    (
      model: string,
      messages: Message[],
      answerMessage: Message,
      toolId: string,
    ): Promise<ReadableStream<any>>;
    (arg0: any, arg1: any, arg2: any): any;
  },
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  authToken: any,
  invokedByToolId: boolean,
) {
  if (!enableGoLinkFinderFeature) {
    return new Response('The GoLinkFinder is disabled.', {
      status: 200,
      headers: corsHeaders,
    });
  }

  const toolId = 'golinkfinder';
  let aiResponse = '';

  if (invokedByToolId) {
    const answerPrompt = transformUserQueryToGoLinkFinderCommand(lastMessage);
    answerMessage.content = answerPrompt;

    const openAIResponseStream = await OpenAIStream(
      model,
      messagesToSend,
      answerMessage,
      toolId,
    );

    const reader = openAIResponseStream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      aiResponse += new TextDecoder().decode(value, { stream: true });
    }

    try {
      const jsonMatch = aiResponse.match(/```json\n\{.*?\}\n```/s);
      if (jsonMatch) {
        const jsonResponseString = jsonMatch[0].replace(/```json\n|\n```/g, '');
        const jsonResponse = JSON.parse(jsonResponseString);
        lastMessage.content = jsonResponse.command;
      } else {
        return new Response(
          `${aiResponse}\n\nNo JSON command found in the AI response.`,
          {
            status: 200,
            headers: corsHeaders,
          },
        );
      }
    } catch (error) {
      return new Response(
        `${aiResponse}\n\n'Error extracting and parsing JSON from AI response: ${error}`,
        {
          status: 200,
          headers: corsHeaders,
        },
      );
    }
  }

  const parts = lastMessage.content.split(' ');
  if (parts.includes('-h') || parts.includes('-help')) {
    return new Response(displayHelpGuide(), {
      status: 200,
      headers: corsHeaders,
    });
  }

  const params = parseGoLinkFinderCommandLine(lastMessage.content);

  if (params.error && invokedByToolId) {
    return new Response(`${aiResponse}\n\n${params.error}`, {
      status: 200,
      headers: corsHeaders,
    });
  } else if (params.error) {
    return new Response(params.error, { status: 200, headers: corsHeaders });
  }

  if (authToken !== process.env.SECRET_AUTH_PLUGINS_HACKERGPT_V2) {
    const rateLimitCheck = await checkToolRateLimit(authToken, toolId);

    if (rateLimitCheck.isRateLimited) {
      return rateLimitCheck.response;
    }
  }

  let golinkfinderUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/golinkfinder?`;

  if (Array.isArray(params.domain)) {
    const targetsString = params.domain.join(' ');
    golinkfinderUrl += `domain=${encodeURIComponent(targetsString)}`;
  }

  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', 'text/event-stream');
  headers.set('Cache-Control', 'no-cache');
  headers.set('Connection', 'keep-alive');

  const stream = new ReadableStream({
    async start(controller) {
      const sendMessage = (
        data: string,
        addExtraLineBreaks: boolean = false,
      ) => {
        const formattedData = addExtraLineBreaks ? `${data}\n\n` : data;
        controller.enqueue(new TextEncoder().encode(formattedData));
      };

      if (invokedByToolId) {
        sendMessage(aiResponse, true);
      }

      sendMessage('🚀 Starting the scan. It might take a minute.', true);

      const intervalId = setInterval(() => {
        sendMessage('⏳ Still working on it, please hold on...', true);
      }, 20000);

      try {
        const golinkfinderResponse = await fetch(golinkfinderUrl, {
          method: 'GET',
          headers: {
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`,
          },
        });

        let golinkfinderData = await golinkfinderResponse.text();

        let urlsFormatted = processGoLinkFinderData(golinkfinderData);

        if (urlsFormatted.length === 0) {
          const noDataMessage = `🔍 Didn't find any URLs based on the provided command.`;
          clearInterval(intervalId);
          sendMessage(noDataMessage, true);
          controller.close();
          return new Response(noDataMessage, {
            status: 200,
            headers: corsHeaders,
          });
        }

        if (golinkfinderData.length > 50000) {
          golinkfinderData = golinkfinderData.slice(0, 50000);
        }

        clearInterval(intervalId);
        sendMessage('✅ Scan done! Now processing the results...', true);

        const date = new Date();
        const timezone = 'UTC-5';
        const formattedDateTime = date.toLocaleString('en-US', {
          timeZone: 'Etc/GMT+5',
          timeZoneName: 'short',
        });
        const responseString =
          `## [GoLinkFinder](${toolUrls.GoLinkFinder}) Scan Results\n` +
          '**Target**: "' +
          params.domain +
          '"\n\n' +
          '**Scan Date and Time**:' +
          ` ${formattedDateTime} (${timezone}) \n\n` +
          '### Identified Urls:\n' +
          '```\n' +
          urlsFormatted.trim() +
          '\n' +
          '```\n';

        sendMessage(responseString, true);
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

const transformUserQueryToGoLinkFinderCommand = (lastMessage: Message) => {
  const answerMessage = endent`
  Query: "${lastMessage.content}"

  Generate a command for the 'GoLinkFinder' tool, tailored to efficiently extract URLs from HTML content. Ensure to utilize the most pertinent flag, '--domain', to specify the target website. If detailed guidance or a comprehensive list of options is needed, appending the '-help' flag is recommended. The command should be structured as follows for clear understanding and effectiveness:

  **STANDARD COMMAND FORMAT**:
  \`\`\`json
  { "command": "golinkfinder --domain [target-domain]" }
  \`\`\`
  Substitute '[target-domain]' with the actual domain you intend to investigate. It's crucial to directly incorporate the target domain within the command, bypassing the need for external file references.

  **Command Construction Guidelines for GoLinkFinder**:
  1. **Single Domain Focus**: Direct inclusion of the target domain in the command is mandatory. 
      - --domain (string): Specify the target website URL. (required)
  2. **Selective Flag Application**: Choose flags that directly contribute to the scope of your query. The key flags include:
      - --help: Display a help guide or a full list of available commands and flags.
  3. **Limitation on Command and Domain Quantity**: 'GoLinkFinder' is designed to process a single command and a single domain at a time. Should there be attempts to include multiple domains or generate multiple commands by user query, respond back with tool's functionality restricts such operations.  

  **Ensuring Precision and Efficiency**: To guarantee the command's relevance and the scanning process's efficiency, align the chosen flags with the specific needs of your request. The inclusion of any additional or unspecified flags may not be supported.

  **Example Commands**:
  - For extracting URLs from a specific domain:
  \`\`\`json
  { "command": "golinkfinder --domain example.com" }
  \`\`\`

  - For accessing help or viewing all available flags:
  \`\`\`json
  { "command": "golinkfinder --help" }
  \`\`\`

  Please adjust the command based on your specific requirements or inquire further if assistance with additional flags is needed.
  
  Response:`;

  return answerMessage;
};

const processGoLinkFinderData = (data: string): string => {
  const lines = data.split('\n');
  const processedLines = lines
    .filter((line) => !line.includes('Still processing...') && !line.includes('goLinkFinder process completed.') && !line.includes('Starting goLinkFinder process...'))
    .map((line) => {
      if (line.startsWith('data: ')) {
        return line.replace('data: ', '').trim();
      }
      return line.trim();
    })
    .filter((line) => line !== '');

  return processedLines.join('\n');
};


