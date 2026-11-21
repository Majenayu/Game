# Build context is the repository root:  docker build -f server/Dockerfile .
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production PORT=2567

COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
COPY e2e/package.json e2e/
# Only the server and shared workspaces are needed at runtime.
RUN npm ci --workspace=@orb/server --workspace=@orb/shared --include-workspace-root=false

COPY shared shared
COPY server server

EXPOSE 2567
WORKDIR /app/server
CMD ["npx", "tsx", "src/index.ts"]
