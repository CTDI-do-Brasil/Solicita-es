# ==============================================================================
# ESTÁGIO 1: Compilação do Frontend Vite e Preparação
# ==============================================================================
FROM node:20-alpine AS build

WORKDIR /app

# Copia arquivos de definição de dependências
COPY package*.json ./

# Instala todas as dependências necessárias para o build
RUN npm install

# Copia todo o código fonte
COPY . .

# Compila o frontend React (gera pasta dist/)
RUN npm run build

# ==============================================================================
# ESTÁGIO 2: Execução em Produção com Node.js + Express
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Copia arquivos de dependência
COPY package*.json ./

# Instala apenas dependências de produção (incluindo tsx)
RUN npm install --omit=dev

# Copia o build estático do frontend e o código do servidor
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/tsconfig.json ./

# Configurações de ambiente para CapRover
EXPOSE 80
ENV PORT=80
ENV NODE_ENV=production

# Inicia o servidor backend Node.js (que serve tanto a API quanto o frontend compilado)
CMD ["npx", "tsx", "server/index.ts"]
