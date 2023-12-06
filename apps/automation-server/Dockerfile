FROM node:20

WORKDIR /app

# Copy application files and node_modules
COPY apps/automation-server/dist/ ./dist/
COPY apps/automation-server/node_modules/ ./node_modules/

# Copy Prisma schema and any other necessary files from the TurboRepo root
COPY packages/database/prisma/schema.prisma /schema.prisma
COPY packages/database/prisma/schema.prisma /node_modules/.pnpm/@prisma+client@5.5.2_prisma@5.5.2/node_modules/.prisma/client/schema.prisma
COPY packages/database/node_modules/prisma/libquery_engine-linux-arm64-openssl-3.0.x.so.node /node_modules/.pnpm/@prisma+client@5.5.2_prisma@5.5.2/node_modules/.prisma/client/libquery_engine-linux-arm64-openssl-3.0.x.so.node

# Manually install external dependencies
RUN npm install express cors @ffmpeg-installer/ffmpeg fluent-ffmpeg sharp socket.io pino pino-pretty

EXPOSE 8000

CMD ["node", "dist/app.js"]
