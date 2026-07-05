/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },
    async headers() {
        // The /code builder uses StackBlitz WebContainers, which need
        // SharedArrayBuffer and therefore require the document to be
        // cross-origin isolated. We only apply these headers to the
        // builder routes so the rest of the app can keep loading
        // third-party images/embeds normally.
        //
        // We use COEP: credentialless instead of require-corp so that
        // uncredentialed cross-origin subresources (avatars, OG images,
        // etc.) still load without needing CORP headers from the origin.
        return [
            {
                source: '/code/:path*',
                headers: [
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'credentialless',
                    },
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin',
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
