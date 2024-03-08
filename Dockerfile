ARG NODE_VERSION=16.20
FROM node:${NODE_VERSION}-alpine as base
WORKDIR /src

RUN \
  --mount=type=cache,id=apk,target=/var/cache/apk,sharing=locked \
  apk add --no-cache dumb-init python3 make g++


## STAGE: deps
FROM base as deps
ARG NPM_TOKEN

COPY --link package.json yarn.lock .yarnrc.yml ./
COPY --link .yarn/ ./.yarn/

RUN \
  --mount=type=secret,id=NPM_TOKEN \
  --mount=type=cache,id=yarn,target=/src/.yarn/cache \
  --mount=type=cache,id=home-yarn,target=/root/.yarn/berry \
  yarn config set -H 'npmRegistries["https://registry.yarnpkg.com"].npmAuthToken' "$(cat /run/secrets/NPM_TOKEN)" && \
  yarn install --immutable


## STAGE: sourced
FROM deps as sourced
COPY --link . ./


## STAGE: build
FROM sourced as build
RUN yarn build

## STAGE: prune
FROM build as prune
RUN \
  --mount=type=cache,id=yarn,target=/src/.yarn/cache \
  yarn config unset -H npmRegistries && \
  yarn cache clean


FROM base as prod
WORKDIR /usr/src/app

ARG build_SEM_VER
ARG build_BUILD_NUM
ARG build_GIT_SHA
ARG build_BUILD_URL

ENV SEM_VER=${build_SEM_VER}
ENV BUILD_NUM=${build_BUILD_NUM}
ENV GIT_SHA=${build_GIT_SHA}
ENV BUILD_URL=${build_BUILD_URL}

COPY --link --from=prune /src/build/ ./
COPY --link --from=prune /src/node_modules ./node_modules/

ENTRYPOINT [ "dumb-init" ]
CMD ["node", "start.js"]
