FROM cypress/browsers:latest
WORKDIR /app

# Copy only the built Next.js app and any other necessary runtime files
COPY apps/chat-client/.next ./.next
COPY apps/chat-client/app ./app
COPY apps/chat-client/public ./public
COPY apps/chat-client/next.config.js ./next.config.js
COPY apps/chat-client/test-package.json ./package.json

# Copy Prisma schema and any other necessary files from the TurboRepo root
COPY packages/database/prisma/schema.prisma ./schema.prisma
COPY packages/database/prisma/seed.ts ./seed.ts
COPY packages/database/prisma/schema.prisma ./node_modules/.pnpm/@prisma+client@5.5.2_prisma@5.5.2/node_modules/.prisma/client/schema.prisma
COPY packages/database/node_modules/prisma/libquery_engine-linux-arm64-openssl-3.0.x.so.node ./node_modules/.pnpm/@prisma+client@5.5.2_prisma@5.5.2/node_modules/.prisma/client/libquery_engine-linux-arm64-openssl-3.0.x.so.node

RUN npm install ts-node

EXPOSE 3000