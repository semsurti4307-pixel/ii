/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    light: '#60A5FA', // Blue-400
                    DEFAULT: '#2563EB', // Blue-600 (Main)
                    dark: '#1E40AF', // Blue-800
                },
                secondary: {
                    light: '#4ADE80', // Green-400
                    DEFAULT: '#16A34A', // Green-600 (Main) 
                    dark: '#15803D', // Green-700
                },
                danger: '#DC2626', // Red-600
                warning: '#F59E0B', // Amber-500
                background: '#F8FAFC', // Slate-50
                surface: '#FFFFFF', // White
                text: {
                    main: '#0F172A', // Slate-900
                    muted: '#64748B', // Slate-500
                }
            },
            fontFamily: {
                sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }
        },
    },
    plugins: [],
}
