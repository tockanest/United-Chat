const isProd = process.env.NODE_ENV === 'production';

const internalHost = process.env.TAURI_DEV_HOST || 'localhost';

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export', images: {
        unoptimized: true, domains: ['cdn.tailwindcss.com'],
    },
};

export default nextConfig;