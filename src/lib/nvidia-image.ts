/**
 * Generates an image using the NVIDIA NIM qwen/qwen-image model via the
 * OpenAI-compatible images/generations endpoint exposed on the NVIDIA cloud.
 *
 * Endpoint: POST https://integrate.api.nvidia.com/v1/images/generations
 * Response: OpenAI-compatible → data[0].b64_json (base64-encoded PNG)
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

    const response = await fetch(
        'https://integrate.api.nvidia.com/v1/images/generations',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                model: 'qwen/qwen-image-2512',
                prompt,
                n: 1,
                response_format: 'b64_json',
            }),
            signal: options.signal,
        },
    );

    if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`NVIDIA image API error (${response.status}): ${errorText}`);
    }

    // OpenAI-compatible response: { data: [{ b64_json: "..." }] }
    const data = (await response.json()) as {
        data?: { b64_json?: string }[];
    };

    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
        throw new Error('NVIDIA image API returned no image data');
    }

    return `data:image/png;base64,${b64}`;
}
