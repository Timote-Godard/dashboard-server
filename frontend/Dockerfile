# Étape 1 : Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Étape 2 : Service
FROM node:20-slim
WORKDIR /app
RUN npm install -g serve
# On récupère seulement le dossier compilé (dist ou build)
COPY --from=builder /app/dist ./dist 
EXPOSE 8084
# On lance sur le port 8084
CMD ["serve", "-s", "dist", "-l", "8084"]