/**
 * Generates an image using the NVIDIA NIM qwen/qwen-image model.
 *
 * The endpoint returns a JSON body with an `artifacts` array where each
 * element carries a `base64` field containing the PNG-encoded image.
 *
 * @returns A data-URL string (`data:image/png;base64,…`) ready for an <img> tag.
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

    const response = await fetch('https://integrate.api.nvidia.com/v1/infer', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
            model: 'qwen/qwen-image',
            prompt,
            seed: options.seed ?? 0,
        }),
        signal: options.signal,
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`NVIDIA image API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
        artifacts?: { base64?: string }[];
        seed?: number;
    };

    const base64 = data.artifacts?.[0]?.base64;
    if (!base64) {
        throw new Error('NVIDIA image API returned no image data');
    }

    return `data:image/png;base64,${base64}`;
}
