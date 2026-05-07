/**
 * Generates an image using the NVIDIA NIM qwen/qwen-image model via the
 * OpenAI-compatible images/generations endpoint exposed on the NVIDIA cloud.
 *
 * Endpoint: POST https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev
 * Response: { artifacts: [{ base64: "..." }] }
 *
 * @returns A data-URL string (`data:image/jpeg;base64,…`) ready for an <img> tag.
 */
export async function generateNvidiaImage(
    prompt: string,
    options: {
        signal?: AbortSignal;
        seed?: number;
    } = {},
): Promise<string> {
    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) {
        throw new Error('NVIDIA NIM API key not configured');
    }

    const response = await fetch(
        'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                prompt,
                mode: 'base',
                cfg_scale: 3.5,
                width: 1024,
                height: 1024,
                seed: options.seed ?? Math.floor(Math.random() * 100000),
                steps: 50
            }),
            signal: options.signal,
        },
    );

    if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`NVIDIA image API error (${response.status}): ${errorText}`);
    }

    // NVIDIA GenAI response: { artifacts: [{ base64: "..." }] }
    const data = (await response.json()) as {
        artifacts?: { base64?: string }[];
    };

    const b64 = data.artifacts?.[0]?.base64;
    if (!b64) {
        throw new Error('NVIDIA image API returned no image data');
    }

    return `data:image/jpeg;base64,${b64}`;
}
