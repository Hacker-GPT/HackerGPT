import { exec } from 'child_process';
import { NextApiRequest, NextApiResponse } from 'next';

export enum Role {
    User = 'user',
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const {
        domain, 
        match, 
        filter, 
        includeIP, 
    } = req.query;

    const authHeader = req.headers.authorization;
    const expectedAuthValue = process.env.SECRET_AUTH_SUBFINDER

    if (!authHeader || authHeader !== expectedAuthValue) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    let subfinderOutput = '';

    let command = `subfinder -d ${domain} -t 30 -json`;

    if (match) {
        command += ` -m ${Array.isArray(match) ? match.join(',') : match}`;
    }
    if (filter) {
        command += ` -f ${Array.isArray(filter) ? filter.join(',') : filter}`;
    }
    if (includeIP === 'true') {
        command += ' -oI';
    }
        
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sendSSEMessage(res, 'Starting subfinder process...');

    const subfinderProcess = exec(command);
    let isTimeout = false;

    const progressInterval = setInterval(() => {
        sendSSEMessage(res, 'Still processing...');
    }, 5000);

    const timeout = setTimeout(() => {
        isTimeout = true;
        subfinderProcess.kill('SIGTERM');
        sendSSEMessage(res, 'Subfinder process timed out.');
        clearInterval(progressInterval);
        res.end();
    }, 35000);

    subfinderProcess.stdout?.on('data', (data) => {
        subfinderOutput += data;
    });

    subfinderProcess.stderr?.on('data', (data) => {
        console.error(data);
    });

    subfinderProcess.on('close', (code) => {
        if (!isTimeout) {
            clearTimeout(timeout);
            clearInterval(progressInterval);
            const domains = processSubfinderOutput(subfinderOutput);
            sendSSEMessage(res, 'Subfinder process completed.');
            sendSSEMessage(res, domains);
            res.end();
        }
    });

    subfinderProcess.on('error', (error) => {
        if (!isTimeout) {
            clearTimeout(timeout);
            clearInterval(progressInterval);
            console.error(`Error executing Docker command: ${error}`);
            sendSSEMessage(res, `Error: ${error.message}`);
            res.end();
        }
    });
}

function sendSSEMessage(res: NextApiResponse, data: string) {
    res.write(`data: ${data}\n\n`);
}

function processSubfinderOutput(output: string): string {
    return output.trim();
}
