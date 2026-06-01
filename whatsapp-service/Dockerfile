# Multi-arch: roda na VM ARM Ampere (always-free) da OCI e em x86.
# Imagem completa (não slim): traz git + toolchain que o baileys precisa
# (dependência `libsignal` via git + possíveis módulos nativos).
FROM node:20

WORKDIR /app

# Instala só deps de produção (tsx está em dependencies — rodamos TS direto).
COPY package.json ./
RUN npm install --omit=dev

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
# Sessão persistente: monte um volume aqui (ex: -v /data/wa-auth:/data/auth).
ENV WA_AUTH_DIR=/data/auth
ENV PORT=9173
EXPOSE 9173

CMD ["npx", "tsx", "src/server.ts"]
