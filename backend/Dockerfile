FROM node:20

WORKDIR /usr/src/app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma:generate

RUN pnpm build

EXPOSE 3001

# Apply pending migrations before accepting requests with the new Prisma client.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && exec node dist/src/main"]
