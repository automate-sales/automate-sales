import dotenv from 'dotenv';
import { removeEmptyFields } from './utils';
dotenv.config();

const OPENAI_API_URL = 'https://api.openai.com/v1/completions';

const getKeysForValues =(stringArray: string[], labelObject: { [key:string]: any})=> {
    return Object.entries(labelObject)
        .filter(([key, value]) => stringArray.includes(value))
        .map(([key]) => Number(key));
}

export async function analyzeSentiment(text: string) {
    const API_KEY = process.env.OPENAI_API_KEY;
    const prompt = `Analyze the following text: "${text}". Determine its language (as an ISO 639-1 code), sentiment (as positive, negative, or neutral), and any additional insights from the following list: sarcasm, sexual language, foul language, slang, gratitude, regret, happiness, anger, sadness, confusion, excitement, fear, love, optimism, pessimism, urgency, relaxation. Messages recieved are from the country of panama so beware of any national slang or foul slang language.
    
    your response must always be a json object in the following format:
    {
        "language":  language_code
        "sentiment": "positive" | "negative" | "neutral"
        "insights": [ insights ]
    }`;
    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo-instruct",
                prompt: prompt,
                temperature: 1,
                max_tokens: 256,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0
            })
        });
        const data = await response.json();
        let result;
        try {
            // Try to parse the text as JSON
            result = JSON.parse(data?.choices[0]?.text?.trim());
        } catch (jsonParseError) {
            // If parsing fails, attempt to extract JSON string using regex
            const regex = /{.*?}/; // Adjust the regex according to expected JSON structure
            const match = data?.choices[0]?.text?.match(regex);
            if (match) {
                result = JSON.parse(match[0]);
            }
        }
        console.info('SENTIMENT ANALYSIS RESULT: ', result);
        if (!result) throw new Error('Incompatible chat gpt response');
        return removeEmptyFields(result);
    } catch(err: any){
        console.error(err)
        //throw new Error(err)
    }
}

export async function extractDemographicData(previousMessage: string, currentMessage: string) {
    const API_KEY = process.env.OPENAI_API_KEY;
    const prompt = `Here are 2 latest messages of a given conversation:
    - Previous Message: "${previousMessage}"
    - Current Message: "${currentMessage}"
    
    Please extract any available personal and demographic information from these chats. Look for name, email, nationality, legal ID, gender, birthdate, company name, job title, and interests. Ineterests is an array of strings that may contain products and categories of products.
    
    your response must always be a json object in the following format:
    {
        "name": "",
        "email": "",
        "nationality": "",
        "legal_id": "",
        "gender": "male" | "female" | "other",
        "birthdate": "DateString",
        "company_name": "",
        "job_title": "",
        "interests": [],
        "address": "",
        "country": ""
    }
    Only include the keys of the data you were able to extract and dont include any keys with empty/blank values. If you were not able to extract any data, return an empty object. If you were able to extract data but it is not in the list above, return an empty object.
    
    Do not include any explanatory text or comments in the response. Only provide the JSON object.`;
    try {
        console.info('PROMPT: ', prompt)
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo-instruct",
                prompt: prompt,
                temperature: 1,
                max_tokens: 256,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0
            })
        });
        const data = await response.json();
        console.info('EXTRACT DATA RESPONSE: ', data);
        let result;
        try {
            // Try to parse the text as JSON
            result = JSON.parse(data?.choices[0]?.text?.trim());
        } catch (jsonParseError) {
            // If parsing fails, attempt to extract and correct the JSON string using regex
            const regex = /\{[\s\S]*?\}/; // Non-greedy match to the closing brace of JSON object
            const match = data?.choices[0]?.text?.match(regex);
            if (match) {
                let correctedJsonString = match[0];

                // Remove newline characters and excessive spaces
                correctedJsonString = correctedJsonString.replace(/\n/g, '');
                correctedJsonString = correctedJsonString.replace(/\s{2,}/g, ' ');

                // Remove any trailing commas before the closing brace
                correctedJsonString = correctedJsonString.replace(/,\s*}/, '}');

                // Correct property names to be double-quoted
                correctedJsonString = correctedJsonString.replace(/(['"])?([a-z0-9A-Z_]+)(['"])?:/g, '"$2": ');

                result = JSON.parse(correctedJsonString);
            }
        }
        console.info('EXTRACT DATA RESULT: ', result);
        if (!result) throw new Error('Incompatible chat gpt response');
        return removeEmptyFields(result);
    } catch(err: any){
        console.error(err)
        //throw new Error(err)
    }
}


