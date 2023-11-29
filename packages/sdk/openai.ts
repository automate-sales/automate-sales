import dotenv from 'dotenv';
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
    
    your response must be a json object in the following format:
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
        console.info(data, 'DATA')
        const result = data?.choices[0]?.text? JSON.parse(data.choices[0].text.trim()) : null;
        if (!result) throw new Error('Incompatible chat gpt response')
        //const insightLabels = chat.insights.labels
        //console.info(insightLabels, 'INSIGHT LABELS')
        //const insights = getKeysForValues(result.insights, insightLabels)
        //console.info(insights, 'INSIGHTS')
        const res = {
            language: result.language,
            sentiment: result.sentiment,
            insights: result.insights
        };
        return res;
    } catch(err: any){
        throw new Error(err)
    }
}