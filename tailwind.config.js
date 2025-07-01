// This file should be renamed to tailwind.config.cjs
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'gray-850': 'rgb(31, 41, 55)',
            },
        },
    },
    plugins: [],
}