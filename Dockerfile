# Estágio de Build
FROM node:20-alpine AS build

WORKDIR /app

# Copia arquivos de dependência
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia o código fonte do projeto
COPY . .

# Compila o projeto Vite para produção (gera pasta dist)
RUN npm run build

# Estágio de Produção com Nginx
FROM nginx:alpine

# Copia os arquivos compilados da etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Copia a configuração do Nginx (com suporte a SPA / rotas)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Porta HTTP exposta pelo container
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
