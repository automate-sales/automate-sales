FROM cypress/browsers:latest
WORKDIR /app

# Copy only the built Next.js app and any other necessary runtime files
COPY apps/chat-client/test-package.json ./package.json
COPY apps/chat-client/next-env.d.ts ./next-env.d.ts
COPY apps/chat-client/tsconfig.json ./tsconfig.json
COPY apps/chat-client/tailwind.config.js ./tailwind.config.js
COPY apps/chat-client/postcss.config.js ./postcss.config.js
COPY apps/chat-client/.next ./.next
COPY apps/chat-client/public ./public
COPY apps/chat-client/next.config.js ./next.config.js
COPY apps/chat-client/app ./app
COPY apps/chat-client/cypress.config.ts ./cypress.config.ts
COPY apps/chat-client/cypress ./cypress

# Copy Prisma schema and any other necessary files from the TurboRepo root
COPY packages/database/prisma/schema.prisma ./schema.prisma
COPY packages/database/prisma/seed.ts ./seed.ts
COPY packages/database/prisma/schema.prisma ./prisma/schema.prisma
COPY packages/database/prisma/seed.ts ./prisma/seed.ts
COPY packages/database/dist/seed.js ./prisma/seed.js
COPY packages/database/dist/seed.js ./app/prisma/seed.js

COPY packages/database/prisma/media/ ./app/prisma/media/
COPY packages/database/prisma/media/ ./prisma/media/

COPY packages/database/prisma/schema.prisma ./node_modules/.pnpm/@prisma+client@5.5.2_prisma@5.5.2/node_modules/.prisma/client/schema.prisma
COPY packages/database/node_modules/prisma/libquery_engine-linux-arm64-openssl-3.0.x.so.node ./node_modules/.pnpm/@prisma+client@5.5.2_prisma@5.5.2/node_modules/.prisma/client/libquery_engine-linux-arm64-openssl-3.0.x.so.node

#RUN npm install ts-node

# Manually install external dependencies
RUN npm install @ffmpeg-installer/ffmpeg fluent-ffmpeg sharp @prisma/client

RUN npx prisma generate

EXPOSE 3000