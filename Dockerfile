FROM node:20.10-alpine as base

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

FROM base as builder
ARG NPM_TOKEN

COPY . .

RUN yarn config set -H 'npmRegistries["https://registry.yarnpkg.com"].npmAuthToken' "${NPM_TOKEN#"//registry.npmjs.org/:_authToken="}" && \
  yarn install --immutable && \
  yarn build && \
  yarn config unset -H npmRegistries

FROM base as prod
ARG NPM_TOKEN

COPY --from=builder /usr/src/app/build .
COPY --from=builder /usr/src/app/.yarn ./.yarn
COPY --from=builder /usr/src/app/.yarnrc.yml .

RUN yarn config set -H 'npmRegistries["https://registry.yarnpkg.com"].npmAuthToken' "${NPM_TOKEN#"//registry.npmjs.org/:_authToken="}" && \
  yarn workspaces focus -A --production && \
  yarn config unset -H npmRegistries && \
  yarn cache clean

ENTRYPOINT [ "dumb-init" ]
CMD ["node", "--no-node-snapshot", "start.js"]
