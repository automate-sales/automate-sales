const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['prisma/seed.ts'],
  bundle: true,
  platform: 'node',
  target: ['node20'], // Set a target version for Node.js
  outfile: 'dist/seed.js',
  external: [
    '@prisma/client',
    'fluent-ffmpeg', 
    '@ffmpeg-installer/ffmpeg', 
    'sharp' 
  ],
  loader: { '.node': 'file' },
  format: 'cjs', // Set the format to CommonJS
  minify: false, // Disable minification for debugging
  sourcemap: true, // Include source maps for debugging
  logLevel: 'info' // Set log level to info for more detailed build information
})
.catch((error) => {
  console.error(error);
  process.exit(1);
});