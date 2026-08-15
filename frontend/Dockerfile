FROM node:22-alpine AS build

WORKDIR /app/frontend

COPY frontend/package.json /app/frontend/package.json
RUN npm install

COPY frontend /app/frontend

ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

RUN npx vite build --outDir /dist

FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /dist /usr/share/nginx/html

EXPOSE 80
