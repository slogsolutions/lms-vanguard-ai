import { franc } from 'franc';
import dotenv from 'dotenv';

dotenv.config();

export const detectLanguage = (text: string): string => {
    const langCode = franc(text, { minLength: 3 });
    // Map franc codes to common codes if necessary
    // franc returns ISO 639-3 (3 chars)
    // 'eng' -> 'en', 'hin' -> 'hi', etc.
    const map: Record<string, string> = {
        'eng': 'en',
        'hin': 'hi',
        'spa': 'es',
        'fra': 'fr',
        'deu': 'de',
        'ara': 'ar'
    };
    return map[langCode] || 'en';
};

export const translateText = async (text: string, target: string = 'en', source: string = 'auto'): Promise<string> => {
    const toolUrl = process.env.LIBRETRANSLATE_URL?.trim();
    if (!toolUrl) return text; // Fallback to original text if no translator

    const endpoint = toolUrl.replace(/\/+$/, "").endsWith("/translate") 
        ? toolUrl 
        : `${toolUrl.replace(/\/+$/, "")}/translate`;

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                q: text,
                source: source,
                target: target,
                format: "text",
            }),
        });

        if (!response.ok) {
            console.error(`Translation error: ${response.status}`);
            return text;
        }

        const data: any = await response.json();
        return data.translatedText || text;
    } catch (err) {
        console.error("Translation failed:", err);
        return text;
    }
};
