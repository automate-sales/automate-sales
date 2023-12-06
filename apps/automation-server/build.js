const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/app.ts'],
  bundle: true,
  platform: 'node',
  target: ['node20'], // Set a target version for Node.js
  outfile: 'dist/app.js',
  external: [
    'express', 
    'cors', 
    'fluent-ffmpeg', 
    '@ffmpeg-installer/ffmpeg', 
    'sharp', 
    'socket.io',
    'pino',
    'pino-pretty'
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