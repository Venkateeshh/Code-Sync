import fetch from 'node-fetch'; // Assuming you're using Node.js

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { message } = req.body;

        try {
            const response = await fetch('https://chatgpt-42.p.rapidapi.com/geminipro', {
                method: 'POST',
                headers: {
                    'x-rapidapi-key': '72310cda61msh6785a04bc637e1fp1ada2cjsn4731e20bb28e',
                    'x-rapidapi-host': 'chatgpt-42.p.rapidapi.com',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: message,
                    max_tokens: 150
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.choices || !data.choices[0] || !data.choices[0].text) {
                throw new Error('Invalid response from AI service');
            }

            const aiResponse = data.choices[0].text.trim();
            res.status(200).json({ response: aiResponse });
        } catch (error) {
            console.error('Error fetching AI response:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}
