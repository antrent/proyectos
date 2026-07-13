FROM node:20-alpine

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install --production

# Copiar el esquema de prisma y generar el cliente nativo
COPY prisma ./prisma/
RUN npx prisma generate

# Copiar el resto del código del backend
COPY . .

# Comando para arrancar el servidor
CMD ["node", "src/app.js"]
