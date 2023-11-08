/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["ui", "database"],
  images: {
    remotePatterns: [
        { 
            protocol: 'http',
            hostname: 'localhost',
        },
        {
          protocol: 'https',
          hostname: '**',
        }
    ]
  }
};

module.exports = nextConfig;
