import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: 'class',
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: [
                    'var(--font-geist-sans)',
                    'ui-sans-serif',
                    'system-ui',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'sans-serif',
                ],
                mono: [
                    'var(--font-geist-mono)',
                    'ui-monospace',
                    'SFMono-Regular',
                    'Menlo',
                    'monospace',
                ],
            },
            colors: {
                background: 'hsl(var(--background))',
                surface: {
                    DEFAULT: 'hsl(var(--surface))',
                    2: 'hsl(var(--surface-2))',
                    3: 'hsl(var(--surface-3))',
                },
                foreground: {
                    DEFAULT: 'hsl(var(--foreground))',
                    muted: 'hsl(var(--foreground-muted))',
                    subtle: 'hsl(var(--foreground-subtle))',
                },
                border: {
                    DEFAULT: 'hsl(var(--border))',
                    subtle: 'hsl(var(--border-subtle))',
                    strong: 'hsl(var(--border-strong))',
                },
                brand: {
                    DEFAULT: 'hsl(var(--brand))',
                    foreground: 'hsl(var(--brand-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                success: 'hsl(var(--success))',
                warning: 'hsl(var(--warning))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                editor: {
                    bg: 'hsl(var(--editor-bg))',
                    'bg-2': 'hsl(var(--editor-bg-2))',
                    'bg-3': 'hsl(var(--editor-bg-3))',
                    fg: 'hsl(var(--editor-fg))',
                    'fg-muted': 'hsl(var(--editor-fg-muted))',
                    'fg-subtle': 'hsl(var(--editor-fg-subtle))',
                    border: 'hsl(var(--editor-border))',
                    'border-strong': 'hsl(var(--editor-border-strong))',
                    'active-line': 'hsl(var(--editor-active-line))',
                    selection: 'hsl(var(--editor-selection))',
                    cursor: 'hsl(var(--editor-cursor))',
                    accent: {
                        DEFAULT: 'hsl(var(--editor-accent))',
                        foreground: 'hsl(var(--editor-accent-fg))',
                    },
                    'gutter-bg': 'hsl(var(--editor-gutter-bg))',
                    'gutter-fg': 'hsl(var(--editor-gutter-fg))',
                    'tab-active': 'hsl(var(--editor-tab-active))',
                    'tab-inactive': 'hsl(var(--editor-tab-inactive))',
                    'tab-bar': 'hsl(var(--editor-tab-bar))',
                    status: {
                        DEFAULT: 'hsl(var(--editor-status-bg))',
                        foreground: 'hsl(var(--editor-status-fg))',
                    },
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            boxShadow: {
                'subtle': '0 1px 0 0 hsl(var(--border) / 0.6)',
                'elevated':
                    '0 1px 0 0 hsl(var(--border-subtle)), 0 8px 24px -8px hsl(var(--background) / 0.4), 0 4px 12px -4px hsl(var(--background) / 0.3)',
                'overlay':
                    '0 12px 40px -8px rgb(0 0 0 / 0.25), 0 2px 8px -2px rgb(0 0 0 / 0.15)',
            },
        },
    },
    plugins: [require('@tailwindcss/typography')],
};

export default config;
