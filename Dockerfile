FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    yt-dlp \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV HOST=0.0.0.0
ENV PORT=3007

EXPOSE 3007
CMD ["npm", "start"]
