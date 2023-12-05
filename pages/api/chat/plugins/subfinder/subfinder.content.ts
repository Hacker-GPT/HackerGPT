import { Message } from '@/types/chat';
import endent from 'endent';

const isSubfinderCommand = (message: string) => {
  if (!message.startsWith('/')) return false;

  const commandPattern = /^\/subfinder(?:\s+-[a-z]+|\s+\S+)*$/;
  return commandPattern.test(message);
};

const createAnswerPromptSubfinder = (domain: string, includeSources: boolean, subfinderData: string) => {

    let firstStepInstruction = '1. **Identify and List Subdomains**: Present a clear list of all identified subdomains ';

    if (includeSources) {
        firstStepInstruction += 'with sources like this for example "hackergpt.co,[digitorus,crtsh]" ';
    }

    firstStepInstruction += 'in code block. Just each domain on new line.';

    let additionalNote = '';
    let instructionsForAdditionalNote = '';
    if (subfinderData.length > 5000) {
      subfinderData = subfinderData.slice(0, 5000);
      additionalNote = 'Note: The list of subdomains has been truncated due to length.';
      instructionsForAdditionalNote = '1.1 **Incorporate the Additional Note**: If the list of subdomains is truncated due to its length, include the additional note provided to inform the user.';
    }

    const currentDateTime = new Date();
    const formattedDateTime = currentDateTime.toLocaleDateString() + " " + currentDateTime.toLocaleTimeString();

    const messageContent = endent`
    Generate a comprehensive report for the Subfinder scan conducted on the domain "${domain}". The report should be clear, concise, and user-friendly, highlighting key findings and insights for easy interpretation. Assume that the Subfinder tool has already completed the scan and provided detailed data on subdomains. Your task is to analyze this data and present it in a structured format.
    
    Instructions:
    ${firstStepInstruction}
    ${instructionsForAdditionalNote}
    2. **Highlight Key Observations**: Analyze the subdomains for any notable characteristics or security implications. Focus on aspects like unusual subdomain patterns, potential security risks, or subdomains that may need immediate attention.
    3. **Provide Insightful Analysis**: Offer insights based on the subdomains' structure, naming conventions, and other relevant details derived from the scan.
    4. **Recommend Next Steps**: Outline strategic methods for probing identified subdomains for weaknesses and suggest tools or techniques for deeper assessment.

    Report Template:

    ## [Subfinder](https://github.com/projectdiscovery/subfinder) Scan Summary for "${domain}"
    **Scan Date and Time**: ${formattedDateTime}

    ### Identified Subdomains:
    \`\`\`
    [Extract and list only the subdomain names from ${subfinderData} (Required)]
    \`\`\`
    ${additionalNote}

    ### Key Observations and Insights
    - [Insights and notable observations about the subdomains (Not Required)]

    ### Recommended Actions
    - [Propose methods and tools for investigating the identified subdomains further (Not Required)]
    `;
    
    return messageContent
};

const displayHelpGuide = () => {
    return `
    Usage:
      /subfinder [flags]
  
    Flags:
    INPUT:
      -d, -domain string[]   domains to find subdomains for
  
    FILTER:
      -m, -match string[]   subdomain or list of subdomain to match (comma separated)
      -f, -filter string[]   subdomain or list of subdomain to filter (comma separated)

    OUTPUT:
      -cs, -collect-sources   include all sources in the output (-json only)  `;
};

const parseCommandLine = (input: string) => {
  const args = input.split(' ');
  const params: {
    domain: string[],
    match: string[],
    filter: string[],
    includeSources: boolean,
    error: string | null,
  } = {
    domain: [],
    match: [],
    filter: [],
    includeSources: false,
    error: null,
  };

  const maxDomainLength = 50;
  const maxSubdomainLength = 255;

  const isValidDomain = (domain: string) => /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain);
  const isValidSubdomain = (subdomain: string) => /^[a-zA-Z0-9.-]+$/.test(subdomain);

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '-d':
      case '-domain':
        while (args[i + 1] && !args[i + 1].startsWith('-')) {
          const domain = args[++i];
          if (isValidDomain(domain) && domain.length <= maxDomainLength) {
            params.domain.push(domain);
          } else {
            params.error = `🚨 Invalid or too long domain provided (max ${maxDomainLength} characters)`;
            return params;
          }
        }
        break;
      case '-m':
      case '-match':
        while (args[i + 1] && !args[i + 1].startsWith('-')) {
          const match = args[++i];
          if (isValidSubdomain(match) && match.length <= maxSubdomainLength) {
            params.match.push(match);
          } else {
            params.error = `🚨 Invalid or too long match pattern provided (max ${maxSubdomainLength} characters)`;
            return params;
          }
        }
        break;
      case '-f':
      case '-filter':
        while (args[i + 1] && !args[i + 1].startsWith('-')) {
          const filter = args[++i];
          if (isValidSubdomain(filter) && filter.length <= maxSubdomainLength) {
            params.filter.push(filter);
          } else {
            params.error = `🚨 Invalid or too long filter pattern provided (max ${maxSubdomainLength} characters)`;
            return params;
          }
        }
        break;
      case '-cs':
      case '--collect-sources':
        params.includeSources = true;
        break;
    }
  }

  return params;
};
  
export async function handleSubfinderRequest(lastMessage: Message, corsHeaders: HeadersInit | undefined, enableSubfinderFeature: boolean, OpenAIStream: { (model: string, messages: Message[], answerMessage: Message): Promise<ReadableStream<any>>; (arg0: any, arg1: any, arg2: any): any; }, model: string, messagesToSend: Message[], answerMessage: Message) {
    if (!enableSubfinderFeature) {
      return new Response(
        'The Subfinder feature is disabled.',
        { status: 200, headers: corsHeaders }
      );
    }

    const parts = lastMessage.content.split(" ");
    if (parts.includes("-h")) {
      return new Response(displayHelpGuide(), { status: 200, headers: corsHeaders });
    }

    const params = parseCommandLine(lastMessage.content);

    if (params.error) {
      return new Response(params.error, { status: 200, headers: corsHeaders });
    }
  
    let subfinderUrl = `${process.env.SECRET_SUBFINDER_FUNCTION_URL}/api/chat/plugins/subfinder?`;
    subfinderUrl += params.domain.map(d => `domain=${d}`).join('&');
    subfinderUrl += params.match.map(m => `&match=${m}`).join('');
    subfinderUrl += params.filter.map(f => `&filter=${f}`).join('');
    subfinderUrl += params.includeSources ? '&includeSources=false' : '';
  
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
    
        sendMessage('🚀 Starting the scan. It might take a minute.', true);
    
        const intervalId = setInterval(() => {
          sendMessage('⏳ Still working on it, please hold on...', true);
        }, 5000);

        try {
          const subfinderResponse = await fetch(subfinderUrl, {
            method: 'GET',
            headers: {
              'Authorization': `${process.env.SECRET_AUTH_SUBFINDER}`,
              Header: "example.google.com"
          },
          });

          let subfinderData = await subfinderResponse.text();
                
          subfinderData = processSubfinderData(subfinderData);
          
          if (subfinderData.length === 0) {
            const noDataMessage = `🔍 Didn't find any subdomains for ${params.domain.join(', ')}.`;
            clearInterval(intervalId);
            sendMessage(noDataMessage, true);
            controller.close(); 
            return new Response(noDataMessage, { status: 200, headers: corsHeaders });
          }
    
          clearInterval(intervalId);
          sendMessage('✅ Scan done! Now processing the results...', true);  
 
          const answerPrompt = createAnswerPromptSubfinder(params.domain.join(', '), params.includeSources, subfinderData);
          answerMessage.content = answerPrompt;
    
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
          clearInterval(intervalId);
          let errorMessage = '🚨 There was a problem during the scan. Please try again.';
          if (error instanceof Error) {
            errorMessage = `🚨 Error: ${error.message}`;
          }
          sendMessage(errorMessage, true);
          controller.close();
          return new Response(errorMessage, { status: 200, headers: corsHeaders });
        }
      }
    });      
    
    return new Response(stream, { headers });
  }

const processSubfinderData = (data: string) => {
    return data
      .split('\n')
      .filter(line => line && !line.startsWith('data:') && line.trim() !== '')
      .join(''); 
}
  
export { isSubfinderCommand, createAnswerPromptSubfinder}