FROM node:20

WORKDIR /app

# Copy application files and node_modules
COPY dist/ ./dist/
COPY node_modules/ ./node_modules/

EXPOSE 8000

# Adjust the CMD to run your app appropriately
CMD ["node", "dist/app.js"]