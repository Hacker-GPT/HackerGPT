import { Message } from '@/types/chat';

export const isNaabuCommand = (message: string) => {
  if (!message.startsWith('/')) return false;

  const trimmedMessage = message.trim();
  const commandPattern = /^\/naabu(?:\s+(-[a-z]+|\S+))*$/;

  return commandPattern.test(trimmedMessage);
};

const displayHelpGuide = () => {
  return `
  [Naabu](https://github.com/projectdiscovery/naabu) is a port scanning tool written in Go that allows you to enumerate valid ports for hosts in a fast and reliable manner. It is a really simple tool that does fast SYN/CONNECT/UDP scans on the host/list of hosts and lists all ports that return a reply. 

    Usage:
       /naabu [flags]

    Flags:
    INPUT:
       -host string[]   hosts to scan ports for (comma-separated)

    PORT:
       -port, -p string             ports to scan (80,443, 100-200)
       -top-ports, -tp string       top ports to scan (default 100) [full,100,1000]
       -exclude-ports, -ep string   ports to exclude from scan (comma-separated)
       -port-threshold, -pts int    port threshold to skip port scan for the host
       -exclude-cdn, -ec            skip full port scans for CDN/WAF (only scan for port 80,443)
       -display-cdn, -cdn           display cdn in use    

    CONFIGURATION:
       -scan-all-ips, -sa   scan all the IP's associated with DNS record
       -timeout int         millisecond to wait before timing out (default 1000)
    
    HOST-DISCOVERY:
       -sn, -host-discovery            Perform Only Host Discovery
       -Pn, -skip-host-discovery       Skip Host discovery
       -pe, -probe-icmp-echo           ICMP echo request Ping (host discovery needs to be enabled)
       -pp, -probe-icmp-timestamp      ICMP timestamp request Ping (host discovery needs to be enabled)
       -pm, -probe-icmp-address-mask   ICMP address mask request Ping (host discovery needs to be enabled)
       -arp, -arp-ping                 ARP ping (host discovery needs to be enabled)
       -nd, -nd-ping                   IPv6 Neighbor Discovery (host discovery needs to be enabled)
       -rev-ptr                        Reverse PTR lookup for input ips

    OUTPUT:
       -j, -json   write output in JSON lines format`;
};

interface NaabuParams {
  host: string[] | string;
  port: string;
  topPorts: string;
  excludePorts: string;
  portThreshold: number;
  excludeCDN: boolean;
  displayCDN: boolean;
  scanAllIPs: boolean;
  hostDiscovery: boolean;
  skipHostDiscovery: boolean;
  probeIcmpEcho: boolean;
  probeIcmpTimestamp: boolean;
  probeIcmpAddressMask: boolean;
  arpPing: boolean;
  ndPing: boolean;
  revPtr: boolean;
  timeout: number;
  outputJson: boolean;
  error: string | null;
}

const parseNaabuCommandLine = (input: string): NaabuParams => {
  const MAX_INPUT_LENGTH = 2000;
  const MAX_PARAM_LENGTH = 100;
  const MAX_PARAMETER_COUNT = 15;
  const MAX_ARRAY_SIZE = 50;

  const params: NaabuParams = {
    host: [],
    port: '',
    topPorts: '',
    excludePorts: '',
    portThreshold: 0,
    excludeCDN: false,
    displayCDN: false,
    scanAllIPs: false,
    hostDiscovery: false,
    skipHostDiscovery: false,
    probeIcmpEcho: false,
    probeIcmpTimestamp: false,
    probeIcmpAddressMask: false,
    arpPing: false,
    ndPing: false,
    revPtr: false,
    timeout: 10000,
    outputJson: false,
    error: null,
  };

  if (input.length > MAX_INPUT_LENGTH) {
    params.error = `🚨 Input command is too long`;
    return params;
  }

  const args = input.split(' ');
  args.shift();

  if (args.length > MAX_PARAMETER_COUNT) {
    params.error = `🚨 Too many parameters provided`;
    return params;
  }

  const isValidHostnameOrIP = (value: string) => {
    return (
      /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/.test(
        value
      ) || /^(\d{1,3}\.){3}\d{1,3}$/.test(value)
    );
  };
  const isInteger = (value: string) => /^[0-9]+$/.test(value);
  const isValidPortRange = (port: string) => {
    return port.split(',').every((p) => {
      const range = p.split('-');
      return range.every(
        (r) =>
          /^\d+$/.test(r) && parseInt(r, 10) >= 1 && parseInt(r, 10) <= 65535
      );
    });
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (args[i + 1] && args[i + 1].length > MAX_PARAM_LENGTH) {
      params.error = `🚨 Parameter value too long for '${arg}'`;
      return params;
    }

    switch (arg) {
      case '-host':
        const hosts = args[++i].split(',');
        if (
          hosts.some((host) => !isValidHostnameOrIP(host)) ||
          hosts.length > MAX_ARRAY_SIZE
        ) {
          params.error = '🚨 Invalid host format or too many hosts provided';
          return params;
        }
        params.host = hosts;
        break;
      case '-port':
      case '-p':
        const portArg = args[++i];
        if (!isValidPortRange(portArg)) {
          params.error = '🚨 Invalid port range';
          return params;
        }
        params.port = portArg;
        break;
      case '-top-ports':
      case '-tp':
        const topPortsArg = args[++i];
        if (!['100', '1000', '-'].includes(topPortsArg)) {
          params.error = '🚨 Invalid top-ports value';
          return params;
        }
        params.topPorts = topPortsArg;
        break;
      case '-exclude-ports':
      case '-ep':
        const excludePortsArg = args[++i];
        if (!isValidPortRange(excludePortsArg)) {
          params.error = '🚨 Invalid exclude-ports range';
          return params;
        }
        params.excludePorts = excludePortsArg;
        break;
      case '-port-threshold':
      case '-pts':
        if (isInteger(args[i + 1])) {
          params.portThreshold = parseInt(args[++i], 10);
        } else {
          params.error = '🚨 Invalid port-threshold value';
          return params;
        }
        break;
      case '-exclude-cdn':
      case '-ec':
        params.excludeCDN = true;
        break;
      case '-display-cdn':
      case '-cdn':
        params.displayCDN = true;
        break;
      case '-sa':
      case '-scan-all-ips':
        params.scanAllIPs = true;
        break;
      case '-sn':
      case '-host-discovery':
        params.hostDiscovery = true;
        break;
      case '-Pn':
      case '-skip-host-discovery':
        params.skipHostDiscovery = true;
        break;
      case '-pe':
      case '-probe-icmp-echo':
        params.probeIcmpEcho = true;
        break;
      case '-pp':
      case '-probe-icmp-timestamp':
        params.probeIcmpTimestamp = true;
        break;
      case '-pm':
      case '-probe-icmp-address-mask':
        params.probeIcmpAddressMask = true;
        break;
      case '-arp':
      case '-arp-ping':
        params.arpPing = true;
        break;
      case '-nd':
      case '-nd-ping':
        params.ndPing = true;
        break;
      case '-rev-ptr':
        params.revPtr = true;
        break;
      case '-timeout':
        if (args[i + 1] && isInteger(args[i + 1])) {
          let timeoutValue = parseInt(args[++i]);
          if (timeoutValue > 90000) {
            params.error = `🚨 Timeout value exceeds the maximum limit of 90 seconds`;
            return params;
          }
          params.timeout = timeoutValue;
        } else {
          params.error = `🚨 Invalid timeout value for '${args[i]}' flag`;
          return params;
        }
        break;
      case '-j':
      case '-json':
        params.outputJson = true;
        break;
      default:
        params.error = `🚨 Invalid or unrecognized flag: ${arg}`;
        return params;
    }
  }

  if (!params.host) {
    params.error = `🚨 No host provided`;
  }

  return params;
};

export async function handleNaabuRequest(
  lastMessage: Message,
  corsHeaders: HeadersInit | undefined,
  enableNaabuFeature: boolean,
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
  if (!enableNaabuFeature) {
    return new Response('The Naabu feature is disabled.', {
      status: 200,
      headers: corsHeaders,
    });
  }

  const parts = lastMessage.content.split(' ');
  if (parts.includes('-h')) {
    return new Response(displayHelpGuide(), {
      status: 200,
      headers: corsHeaders,
    });
  }

  const params = parseNaabuCommandLine(lastMessage.content);

  if (params.error) {
    return new Response(params.error, { status: 200, headers: corsHeaders });
  }

  let naabuUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/naabu?`;

  const formatHostParam = (host: string[] | string) => {
    return Array.isArray(host)
      ? host.map((h) => `host=${encodeURIComponent(h)}`).join('&')
      : `host=${encodeURIComponent(host)}`;
  };

  naabuUrl += formatHostParam(params.host);

  if (params.port.length > 0) {
    naabuUrl += `&port=${params.port}`;
  }
  if (params.timeout && params.timeout !== 10000) {
    naabuUrl += `&timeout=${params.timeout}`;
  }
  if (params.scanAllIPs) {
    naabuUrl += `&scanAllIPs=${params.scanAllIPs}`;
  }
  if (params.outputJson) {
    naabuUrl += `&outputJson=${params.outputJson}`;
  }
  if (params.topPorts) {
    naabuUrl += `&topPorts=${encodeURIComponent(params.topPorts)}`;
  }
  if (params.excludePorts) {
    naabuUrl += `&excludePorts=${encodeURIComponent(params.excludePorts)}`;
  }
  if (params.portThreshold && params.portThreshold > 0) {
    naabuUrl += `&portThreshold=${params.portThreshold}`;
  }
  if (params.excludeCDN) {
    naabuUrl += `&excludeCDN=true`;
  }
  if (params.displayCDN) {
    naabuUrl += `&displayCDN=true`;
  }
  if (params.hostDiscovery) {
    naabuUrl += `&hostDiscovery=true`;
  }
  if (params.skipHostDiscovery) {
    naabuUrl += `&skipHostDiscovery=true`;
  }
  if (params.probeIcmpEcho) {
    naabuUrl += `&probeIcmpEcho=true`;
  }
  if (params.probeIcmpTimestamp) {
    naabuUrl += `&probeIcmpTimestamp=true`;
  }
  if (params.probeIcmpAddressMask) {
    naabuUrl += `&probeIcmpAddressMask=true`;
  }
  if (params.arpPing) {
    naabuUrl += `&arpPing=true`;
  }
  if (params.ndPing) {
    naabuUrl += `&ndPing=true`;
  }
  if (params.revPtr) {
    naabuUrl += `&revPtr=true`;
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
        const naabuResponse = await fetch(naabuUrl, {
          method: 'GET',
          headers: {
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`,
            Host: 'plugins.hackergpt.co',
          },
        });

        if (!naabuResponse.ok) {
          throw new Error(`HTTP error! status: ${naabuResponse.status}`);
        }

        const jsonResponse = await naabuResponse.json();

        const outputString = jsonResponse.output;

        if (
          outputString &&
          outputString.includes('Error executing Naabu command') &&
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
          const noDataMessage = `🔍 Didn't find any valid ports for ${params.host}.`;
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

        const portsFormatted = processPorts(outputString);
        const formattedResponse = formatResponseString(portsFormatted, params);
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

function processPorts(outputString: string) {
  return outputString
    .split('\n')
    .filter((subdomain) => subdomain.trim().length > 0);
}

function formatResponseString(ports: any[], params: NaabuParams) {
  const date = new Date();
  const timezone = 'UTC-5';
  const formattedDateTime = date.toLocaleString('en-US', {
    timeZone: 'Etc/GMT+5',
    timeZoneName: 'short',
  });

  const portsFormatted = ports.join('\n');

  return (
    '## [Naabu](https://github.com/lc/naabu) Scan Results\n' +
    '**Target**: "' +
    params.host +
    '"\n\n' +
    '**Scan Date and Time**:' +
    ` ${formattedDateTime} (${timezone}) \n\n` +
    '### Identified Ports:\n' +
    '```\n' +
    portsFormatted +
    '\n' +
    '```\n'
  );
}
