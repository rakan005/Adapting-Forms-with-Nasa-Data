FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
COPY assets ./assets
RUN mkdir -p data/cache data/observations
ENV PORT=3100
EXPOSE 3100
CMD ["npm", "start"]
