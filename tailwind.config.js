/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
    theme: {
        extend: {
            screens: {
                'xs': '360px',
            },
            borderRadius: {
                none: '0px',
                sm: '0px',
                DEFAULT: '0px',
                md: '0px',
                lg: '0px',
                xl: '0px',
                '2xl': '0px',
                '3xl': '0px',
                full: '0px',
            },
            boxShadow: {
                'xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
                'sm': '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 8px rgba(0, 0, 0, 0.03)',
                'DEFAULT': '0 2px 6px rgba(0, 0, 0, 0.04), 0 8px 20px -2px rgba(0, 0, 0, 0.07)',
                'md': '0 4px 12px rgba(0, 0, 0, 0.05), 0 16px 32px -4px rgba(0, 0, 0, 0.08)',
                'lg': '0 8px 24px rgba(0, 0, 0, 0.06), 0 24px 48px -6px rgba(0, 0, 0, 0.10)',
                'xl': '0 12px 32px rgba(0, 0, 0, 0.08), 0 32px 64px -8px rgba(0, 0, 0, 0.12)',
                '2xl': '0 20px 50px rgba(0, 0, 0, 0.10), 0 40px 80px -12px rgba(0, 0, 0, 0.15)',
                'card': '0 2px 8px rgba(0, 0, 0, 0.04), 0 12px 28px -4px rgba(0, 0, 0, 0.08)',
                'card-hover': '0 8px 24px rgba(0, 0, 0, 0.06), 0 24px 48px -4px rgba(0, 0, 0, 0.12)',
                'glow': '0 0 24px -2px rgba(0, 0, 0, 0.12)',
                '3d-sm': '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 10px rgba(0, 0, 0, 0.05)',
                '3d': '0 4px 14px rgba(0, 0, 0, 0.06), 0 14px 32px -4px rgba(0, 0, 0, 0.09), 0 28px 56px -12px rgba(0, 0, 0, 0.05)',
                '3d-lg': '0 8px 24px rgba(0, 0, 0, 0.07), 0 24px 48px -6px rgba(0, 0, 0, 0.12), 0 48px 96px -16px rgba(0, 0, 0, 0.08)',
                '3d-modal': '0 20px 48px rgba(0, 0, 0, 0.14), 0 40px 96px -12px rgba(0, 0, 0, 0.24)',
                '3d-press': '0 1px 3px rgba(0, 0, 0, 0.08)',
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))'
                },
                sidebar: {
                    DEFAULT: 'hsl(var(--sidebar-background))',
                    foreground: 'hsl(var(--sidebar-foreground))',
                    primary: 'hsl(var(--sidebar-primary))',
                    'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
                    accent: 'hsl(var(--sidebar-accent))',
                    'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
                    border: 'hsl(var(--sidebar-border))',
                    ring: 'hsl(var(--sidebar-ring))'
                }
            },
            keyframes: {
                'accordion-down': {
                    from: {
                        height: '0'
                    },
                    to: {
                        height: 'var(--radix-accordion-content-height)'
                    }
                },
                'accordion-up': {
                    from: {
                        height: 'var(--radix-accordion-content-height)'
                    },
                    to: {
                        height: '0'
                    }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out'
            }
        }
    },
    plugins: [require("tailwindcss-animate")],
}