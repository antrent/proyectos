FROM node:20-alpine

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install --production

# Copiar el resto del código del backend
COPY . .

# Exponer el puerto del servidor
EXPOSE 5000
ENV PORT=5000

# Comando para arrancar el servidor
CMD ["node", "src/app.js"]
