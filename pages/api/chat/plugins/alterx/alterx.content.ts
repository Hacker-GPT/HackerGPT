import { Message } from '@/types/chat';
import endent from 'endent';

export const isAlterxCommand = (message: string) => {
  if (!message.startsWith('/')) return false;

  const trimmedMessage = message.trim();
  const commandPattern = /^\/alterx(?:\s+(-[a-z]+|\S+))*$/;

  return commandPattern.test(trimmedMessage);
};

const displayHelpGuide = () => {
  return `
  [Alterx](https://github.com/projectdiscovery/alterx) is a fast and customizable subdomain wordlist generator using DSL.

    Usage:
       /alterx [flags]

    Flags:
    INPUT:
       -l, -list string[]      subdomains to use when creating permutations (stdin, comma-separated, file)
       -p, -pattern string[]   custom permutation patterns input to generate (comma-seperated, file)

    CONFIGURATION:
       -en, -enrich   enrich wordlist by extracting words from input
       -limit int     limit the number of results to return (default 0)`;
};

interface AlterxParams {
  list: string[];
  pattern: string[];
  enrich: boolean;
  limit: number;
  payload: Map<string, string>;
  error: string | null;
}

const parseAlterxCommandLine = (input: string): AlterxParams => {
  const MAX_INPUT_LENGTH = 2000;
  const MAX_PARAM_LENGTH = 100;
  const MAX_PARAMETER_COUNT = 15;
  const MAX_ARRAY_SIZE = 50;

  const params: AlterxParams = {
    list: [],
    pattern: [],
    enrich: false,
    limit: 0,
    payload: new Map(),
    error: null,
  };

  if (input.length > MAX_INPUT_LENGTH) {
    params.error = `🚨 Input command is too long`;
    return params;
  }

  const sanitizedInput = input.replace(/[^a-zA-Z0-9,.\-\s]/g, '');

  const args = sanitizedInput.split(' ');
  args.shift();
  if (args.length > MAX_PARAMETER_COUNT) {
    params.error = `🚨 Too many parameters provided`;
    return params;
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-l':
      case '-list':
        if (i + 1 < args.length) {
          const listInput = args[++i];
          if (listInput.length > MAX_PARAM_LENGTH) {
            params.error = `🚨 List parameter is too long`;
            return params;
          }
          params.list = listInput.split(',').slice(0, MAX_ARRAY_SIZE);
        } else {
          params.error = `🚨 List flag provided without value`;
          return params;
        }
        break;
      case '-p':
      case '-pattern':
        if (i + 1 < args.length) {
          const patternInput = args[++i];
          if (patternInput.length > MAX_PARAM_LENGTH) {
            params.error = `🚨 Pattern parameter is too long`;
            return params;
          }
          params.pattern = patternInput.split(',').slice(0, MAX_ARRAY_SIZE);
        } else {
          params.error = `🚨 Pattern flag provided without value`;
          return params;
        }
        break;
      case '-en':
      case '-enrich':
        params.enrich = true;
        break;
      case '-limit':
        if (i + 1 < args.length && !isNaN(parseInt(args[i + 1]))) {
          params.limit = parseInt(args[++i]);
        } else {
          params.error = `🚨 Invalid limit value`;
          return params;
        }
        break;
      default:
        params.error = `🚨 Invalid or unrecognized flag: ${args[i]}`;
        return params;
    }
  }

  if (!params.list.length || params.list.length === 0) {
    params.error = `🚨 Error: -l/-list parameter is required.`;
    return params;
  }

  return params;
};

export async function handleAlterxRequest(
  lastMessage: Message,
  corsHeaders: HeadersInit | undefined,
  enableAlterxFeature: boolean,
  OpenAIStream: {
    (model: string, messages: Message[], answerMessage: Message): Promise<
      ReadableStream<any>
    >;
    (arg0: any, arg1: any, arg2: any): any;
  },
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  invokedByToolId: boolean
) {
  if (!enableAlterxFeature) {
    return new Response('The Alterx is disabled.', {
      status: 200,
      headers: corsHeaders,
    });
  }

  let aiResponse = '';

  if (invokedByToolId) {
    const answerPrompt = transformUserQueryToAlterxCommand(lastMessage);
    answerMessage.content = answerPrompt;

    const openAIResponseStream = await OpenAIStream(
      model,
      messagesToSend,
      answerMessage
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
          }
        );
      }
    } catch (error) {
      return new Response(
        `${aiResponse}\n\n'Error extracting and parsing JSON from AI response: ${error}`,
        {
          status: 200,
          headers: corsHeaders,
        }
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

  const params = parseAlterxCommandLine(lastMessage.content);
  if (params.error) {
    return new Response(params.error, { status: 200, headers: corsHeaders });
  }

  let alterxUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/alterx?`;

  if (params.list.length > 0) {
    alterxUrl += `&list=${encodeURIComponent(params.list.join(','))}`;
  }
  if (params.pattern.length > 0) {
    alterxUrl += `&pattern=${encodeURIComponent(params.pattern.join(','))}`;
  }
  if (params.enrich) {
    alterxUrl += `&enrich=true`;
  }
  if (params.limit > 0) {
    alterxUrl += `&limit=${encodeURIComponent(params.limit.toString())}`;
  }

  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', 'text/event-stream');
  headers.set('Cache-Control', 'no-cache');
  headers.set('Connection', 'keep-alive');

  const stream = new ReadableStream({
    async start(controller) {
      const sendMessage = (data: string, addExtraLineBreaks = false) => {
        const formattedData = addExtraLineBreaks ? `${data}\n\n` : data;
        controller.enqueue(new TextEncoder().encode(formattedData));
      };

      if (invokedByToolId) {
        sendMessage(aiResponse, true);
      }

      sendMessage('🚀 Starting the scan. It might take a minute.', true);

      let isFetching = true;

      const intervalId = setInterval(() => {
        if (isFetching) {
          sendMessage('⏳ Still working on it, please hold on...', true);
        }
      }, 10000);

      try {
        const alterxResponse = await fetch(alterxUrl, {
          method: 'GET',
          headers: {
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`,
            Host: 'plugins.hackergpt.co',
          },
        });

        isFetching = false;

        const jsonResponse = await alterxResponse.json();
        const outputString = jsonResponse.output;

        if (!outputString || outputString.length === 0) {
          const noDataMessage = `🔍 Unable to generate wordlist for "${params.list.join(
            ', '
          )}"`;
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

        const subdomains = processSubdomains(outputString);
        const formattedResponse = formatResponseString(subdomains, params);
        sendMessage(formattedResponse, true);

        controller.close();
      } catch (error) {
        isFetching = false;
        clearInterval(intervalId);
        console.error('Error:', error);
        const errorMessage =
          error instanceof Error
            ? `🚨 Error: ${error.message}`
            : '🚨 There was a problem during the scan. Please try again.';
        sendMessage(errorMessage, true);
        controller.close();
      }
    },
  });

  return new Response(stream, { headers });
}

const transformUserQueryToAlterxCommand = (lastMessage: Message) => {
  const answerMessage = endent`
  Query: "${lastMessage.content}"

  Based on this query, generate a command for the 'Alterx' tool, a customizable subdomain wordlist generator. The command should use the most relevant flags, with '-l' or '-list' being essential for specifying subdomains to use when creating permutations. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:
  
  ALWAYS USE THIS FORMAT:
  \`\`\`json
  { "command": "alterx [flags]" }
  \`\`\`
  Replace '[flags]' with the actual flags and values. Include additional flags only if they are specifically relevant to the request. Ensure the command is properly escaped to be valid JSON.

  Command Construction Guidelines:
  1. **Selective Flag Use**: Carefully choose flags that are pertinent to the task. The available flags for the 'katana' tool include:
    - -l, -list: Specify subdomains to use when creating permutations (required).
    - -p, -pattern: Custom permutation patterns input to generate (optional).
    - -en, -enrich: Enrich wordlist by extracting words from input (optional).
    - -limit: Limit the number of results to return, with the default being 0 (optional).
    - -help: Display help and all available flags. (optional)
    Use these flags to align with the request's specific requirements or when '-help' is requested for help.
  2. **Relevance and Efficiency**: Ensure that the selected flags are relevant and contribute to an effective and efficient wordlist generation process.

  Example Commands:
  For generating a wordlist with specific subdomains:
  \`\`\`json
  { "command": "alterx -l subdomain1.com,subdomain2.com -en" }
  \`\`\`
  
  For a request for help or to see all flags:
  \`\`\`json
  { "command": "alterx -help" }
  \`\`\`
  
  Response:`;

  return answerMessage;
};

function processSubdomains(outputString: string) {
  return outputString
    .split('\n')
    .filter((subdomain) => subdomain.trim().length > 0);
}

function formatResponseString(subdomains: any[], params: AlterxParams) {
  const urlsFormatted = subdomains.join('\n');
  return (
    '## [Alterx](https://github.com/projectdiscovery/alterx) Results\n' +
    '**Input Domain**: "' +
    params.list +
    '"\n\n' +
    '### Generated Subdomains:\n' +
    '```\n' +
    urlsFormatted +
    '\n' +
    '```\n'
  );
}
