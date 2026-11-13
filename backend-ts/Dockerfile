FROM node:22-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
CMD ["node", "--experimental-strip-types", "src/index.ts"]
