import ollama from "ollama";

/**
 * AI Provider Service
 * Abstracts the AI provider (OpenAI, Groq, Together.ai, Ollama)
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const TOGETHER_BASE_URL = "https://api.together.xyz/v1";

// Models
const OPENAI_CHAT_MODEL = "gpt-4.1-nano";
const OPENAI_EMBED_MODEL = "text-embedding-3-small";

const GROQ_MODEL = "llama3-8b-8192";
const TOGETHER_MODEL = "meta-llama/Llama-3.2-3B-Instruct-Turbo";
const OLLAMA_MODEL = "llama3.2";

const TOGETHER_EMBED_MODEL = "togethercomputer/m2-bert-80M-8k-retrieval";
const OLLAMA_EMBED_MODEL = "mxbai-embed-large";

/**
 * Generate Chat Completion
 */
export const generateChatCompletion = async ({ messages, temperature = 0.7, maxTokens = 500, stream = false }) => {
    // 1. Priority: OpenAI (User Preference)
    if (OPENAI_API_KEY) {
        try {
            const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: OPENAI_CHAT_MODEL,
                    messages: messages,
                    temperature: temperature,
                    max_tokens: maxTokens,
                    stream: stream
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenAI Error: ${response.status} ${errText}`);
            }

            if (stream) {
                return response.body;
            }

            const json = await response.json();
            return json.choices[0]?.message?.content || "";
        } catch (err) {
            console.error("OpenAI Chat Error:", err);
            // Fall through? No, if user provided OpenAI key, they probably want it to work or fail.
            throw err;
        }
    }

    // 2. Priority: Groq (Ultra Fast & Free)
    if (GROQ_API_KEY) {
        try {
            const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: GROQ_MODEL,
                    messages: messages,
                    temperature: temperature,
                    max_tokens: maxTokens,
                    stream: stream
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Groq Error: ${response.status} ${errText}`);
            }

            if (stream) {
                return response.body;
            }

            const json = await response.json();
            return json.choices[0]?.message?.content || "";
        } catch (err) {
            console.error("Groq Chat Error:", err);
        }
    }

    // 3. Priority: Together.ai
    if (TOGETHER_API_KEY) {
        try {
            const response = await fetch(`${TOGETHER_BASE_URL}/chat/completions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${TOGETHER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: TOGETHER_MODEL,
                    messages: messages,
                    temperature: temperature,
                    max_tokens: maxTokens,
                    stream: stream
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Together.ai Error: ${response.status} ${errText}`);
            }

            if (stream) {
                return response.body;
            }

            const json = await response.json();
            return json.choices[0]?.message?.content || "";
        } catch (err) {
            console.error("Together.ai Chat Error:", err);
        }
    }

    // 4. Fallback: Ollama (Local)
    try {
        const response = await ollama.chat({
            model: OLLAMA_MODEL,
            messages: messages,
            stream: stream,
            options: {
                temperature: temperature,
                num_predict: maxTokens
            }
        });

        if (stream) {
            return response; // Ollama returns an async generator
        }

        return response?.message?.content || "";
    } catch (err) {
        console.error("Ollama Chat Error:", err);
        throw err;
    }
};

/**
 * Generate Embeddings
 */
export const generateEmbeddings = async (text) => {
    // 1. Priority: OpenAI
    if (OPENAI_API_KEY) {
        try {
            const response = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: OPENAI_EMBED_MODEL,
                    input: text
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI Embedding Error: ${response.status}`);
            }

            const json = await response.json();
            return json.data[0]?.embedding || [];
        } catch (err) {
            console.error("OpenAI Embedding Error:", err);
            throw err;
        }
    }

    // 2. Use Together.ai if API key is present
    if (TOGETHER_API_KEY) {
        try {
            const response = await fetch(`${TOGETHER_BASE_URL}/embeddings`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${TOGETHER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: TOGETHER_EMBED_MODEL,
                    input: text
                })
            });

            if (!response.ok) {
                throw new Error(`Together.ai Embedding Error: ${response.status}`);
            }

            const json = await response.json();
            return json.data[0]?.embedding || [];
        } catch (err) {
            console.error("Together.ai Embedding Error:", err);
        }
    }

    // 3. Fallback to Ollama
    try {
        const response = await ollama.embeddings({
            model: OLLAMA_EMBED_MODEL,
            input: text
        });
        return response.embedding;
    } catch (err) {
        console.error("Ollama Embedding Error:", err);
        throw err;
    }
};
