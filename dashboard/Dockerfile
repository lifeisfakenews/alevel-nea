FROM oven/bun:1
WORKDIR /usr/src/app

COPY package.json bun.lock ./
RUN FORCE_COLOR=1 bun install

COPY . .

RUN FORCE_COLOR=1 bun run build

EXPOSE 2001
CMD ["bun", "./dist/server/entry.mjs"]