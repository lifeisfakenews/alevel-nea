FROM oven/bun:1
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package.json bun.lock ./
RUN FORCE_COLOR=1 bun install

COPY . .

RUN FORCE_COLOR=1 bun run build

ENV HOST=0.0.0.0
ENV PORT=2001

EXPOSE 2001
CMD ["bun", "./dist/server/entry.mjs"]