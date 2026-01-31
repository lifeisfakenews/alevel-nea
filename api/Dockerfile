FROM oven/bun:1
WORKDIR /usr/src/app

COPY package.json bun.lock ./
RUN FORCE_COLOR=1 bun install

COPY . .

EXPOSE 2000
CMD ["bun", "run", "index.ts"]