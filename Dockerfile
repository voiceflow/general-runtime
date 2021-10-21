FROM node:12-alpine as build

WORKDIR /target

COPY ./backend/ ./backend/
COPY ./lib/ ./lib/
COPY ./runtime/ ./runtime/
COPY ./projects/ ./projects/
COPY ./typings/ ./typings/

COPY *.ts *.js *.json ./
COPY .yarnrc.yml yarn.lock ./
COPY .yarn/ ./.yarn/

RUN yarn install --immutable && \
  yarn build && \
  rm -r node_modules && \
  yarn cache clean

FROM node:12-alpine

ARG build_SEM_VER
ARG build_BUILD_NUM
ARG build_GIT_SHA
ARG build_BUILD_URL

ENV SEM_VER=${build_SEM_VER}
ENV BUILD_NUM=${build_BUILD_NUM}
ENV GIT_SHA=${build_GIT_SHA}
ENV BUILD_URL=${build_BUILD_URL}

WORKDIR /usr/src/app

RUN apk add --no-cache dumb-init

COPY --from=build /target/build/ ./

COPY *.js *.json .yarnrc.yml yarn.lock ./
COPY .yarn/ ./.yarn/

# replicate the old `yarn install --production` https://yarnpkg.com/getting-started/migration/#renamed
RUN yarn workspaces focus --all --production && \
  yarn cache clean

ENTRYPOINT [ "dumb-init" ]
CMD ["node", "."]
