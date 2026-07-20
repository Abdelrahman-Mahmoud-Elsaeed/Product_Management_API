FROM node:current-alpine3.24

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
