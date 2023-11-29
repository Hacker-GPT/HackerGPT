import { exec } from 'child_process';
import { NextApiRequest, NextApiResponse } from 'next';

export enum Role {
    User = 'user',
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const { domain, concurrency } = req.query;

    if (typeof domain !== 'string' || !domain) {
        res.status(400).json({ error: 'Invalid or no domain provided' });
        return;
    }

    const validConcurrency = Number(concurrency) || 30;
    let subfinderOutput = '';

    const command = `docker run --rm subfinder-docker -d ${domain} -t ${validConcurrency} -json`;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sendSSEMessage(res, 'Starting subfinder process...');

    const subfinderProcess = exec(command);

    const progressInterval = setInterval(() => {
        sendSSEMessage(res, 'Still processing...');
    }, 5000);

    subfinderProcess.stdout?.on('data', (data) => {
        subfinderOutput += data;
    });

    subfinderProcess.stderr?.on('data', (data) => {
        console.error(data);
    });

    subfinderProcess.on('close', (code) => {
        clearInterval(progressInterval);

        // Process the output to extract domains
        const domains = processSubfinderOutput(subfinderOutput);

        sendSSEMessage(res, 'Subfinder process completed.');
        sendSSEMessage(res, domains); // Send consolidated domains
        res.end();
    });

    subfinderProcess.on('error', (error) => {
        clearInterval(progressInterval);
        console.error(`Error executing Docker command: ${error}`);
        sendSSEMessage(res, `Error: ${error.message}`);
        res.end();
    });
}

function sendSSEMessage(res: NextApiResponse, data: string) {
    res.write(`data: ${data}\n\n`);
}

function processSubfinderOutput(output: string): string {
    // Process the raw output to extract and format the domain list
    // This might involve filtering, removing duplicates, etc.
    // For simplicity, just trimming and returning the output here:
    return output.trim();
}
