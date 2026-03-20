FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    ffmpeg \
 && rm -rf /var/lib/apt/lists/*

RUN curl -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux" -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV HOST=0.0.0.0
ENV PORT=3007

EXPOSE 3007
CMD ["npm", "start"]
