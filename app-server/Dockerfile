FROM node
WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install
EXPOSE 3000
COPY . .
RUN npm run build:css
CMD ["npm", "run", "docker"]
