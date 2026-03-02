FROM node:20-alpine

WORKDIR /app

# Install dependencies (include dev for build)
COPY package*.json ./
RUN npm ci

# Prisma + build
COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

# Create uploads dir
RUN mkdir -p uploads

EXPOSE 8080
ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
