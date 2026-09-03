FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose Vite's default port
EXPOSE 5173

# Run vite dev server for demo mode (allows easy reloading if needed)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
