const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');

async function getAocChallenge() {
    const sessionCookie = fs.readFileSync('session.txt', 'utf8').trim();
    const now = new Date();
    const year = 2023;
    const day = now.getDate();
    
    if (now.getMonth() !== 11) {
        console.log('Advent of Code is only in December!');
        return null;
    }

    const baseUrl = `https://adventofcode.com/${year}/day/${day}`;
    const options = {
        headers: {
            'Cookie': `session=${sessionCookie}`
        }
    };

    try {
        const descResponse = await fetch(baseUrl, options);
        if (!descResponse.ok) {
            throw new Error(`Failed to fetch challenge: ${descResponse.status}`);
        }
        const description = await descResponse.text();
        
        const challengeMatch = description.match(/<article class="day-desc">([\s\S]*?)<\/article>/g);
        const challengeText = challengeMatch
            ? challengeMatch.map(article => article.replace(/<[^>]*>/g, ''))
            : ['Challenge text not found'];

        const inputResponse = await fetch(`${baseUrl}/input`, options);
        if (!inputResponse.ok) {
            throw new Error(`Failed to fetch input: ${inputResponse.status}`);
        }
        const input = await inputResponse.text();

        return {
            description: challengeText.join('\n\n'),
            input: input.trim()
        };
    } catch (error) {
        console.error('Error fetching AOC challenge:', error);
        return null;
    }
}

function splitIntoChunks(text, maxLength) {
    const chunks = [];
    let currentChunk = '';
    const words = text.split(' ');
    
    for (const word of words) {
        if ((currentChunk + word).length > maxLength) {
            chunks.push(currentChunk);
            currentChunk = word + ' ';
        } else {
            currentChunk += word + ' ';
        }
    }
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    return chunks;
}

async function postToDiscord(webhookUrl, challenge) {
    try {
        const chunks = splitIntoChunks(`**Advent of Code ${new Date().getFullYear()} - Day ${new Date().getDate()}**\n\n${challenge.description}`, 1900);
        
        for (const chunk of chunks) {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: chunk })
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const formData = new FormData();
        const buffer = Buffer.from(challenge.input);
        formData.append('file', buffer, { filename: 'input.txt' });
        formData.append('payload_json', JSON.stringify({
            content: '**Input File:**'
        }));

        await fetch(webhookUrl, {
            method: 'POST',
            body: formData
        });

    } catch (error) {
        console.error(`Error posting to webhook ${webhookUrl}:`, error);
    }
}

async function main() {
    const webhooks = fs.readFileSync('webhook.txt', 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const challenge = await getAocChallenge();
    if (!challenge) {
        return;
    }

    for (const webhook of webhooks) {
        await postToDiscord(webhook, challenge);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

main().catch(console.error);