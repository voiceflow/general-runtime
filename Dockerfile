FROM node:16-alpine

RUN apk add --no-cache dumb-init python3 make g++

ARG NPM_TOKEN

ARG build_SEM_VER
ARG build_BUILD_NUM
ARG build_GIT_SHA
ARG build_BUILD_URL

ENV SEM_VER=${build_SEM_VER}
ENV BUILD_NUM=${build_BUILD_NUM}
ENV GIT_SHA=${build_GIT_SHA}
ENV BUILD_URL=${build_BUILD_URL}

WORKDIR /usr/src/app
COPY build ./
COPY package.json ./
COPY yarn.lock ./


RUN echo $NPM_TOKEN > .npmrc && \
  yarn install --production && \
  rm -f .npmrc && \
  yarn cache clean

ENTRYPOINT [ "dumb-init" ]
CMD ["node", "start.js"]
