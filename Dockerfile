ARG NODE_VERSION=20.10
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /src

RUN \
  --mount=type=cache,id=apk,target=/var/cache/apk,sharing=locked \
  apk add --no-cache dumb-init python3 make g++


## STAGE: deps
FROM base AS deps

COPY --link package.json yarn.lock .yarnrc.yml ./
COPY --link .yarn/ ./.yarn/

RUN \
  --mount=type=secret,id=NPM_TOKEN \
  --mount=type=cache,id=yarn,target=/src/.yarn/cache \
  --mount=type=cache,id=home-yarn,target=/root/.yarn/berry \
  yarn config set -H 'npmRegistries["https://registry.yarnpkg.com"].npmAuthToken' "$(cat /run/secrets/NPM_TOKEN)" && \
  yarn install --immutable


## STAGE: sourced
FROM deps AS sourced
COPY --link . ./

FROM sourced AS testing

FROM testing AS linter
RUN yarn lint:report >/var/log/eslint.log 2>&1

FROM testing AS dep-check
RUN yarn test:dependencies >/var/log/dep-check.log 2>&1

FROM testing AS unit-tests
RUN yarn test:unit:ci >/var/log/unit-tests.log 2>&1 \
  || mkdir -p ./reports/mocha/ && touch ./reports/mocha/unit-tests.xml

FROM scratch AS checks
COPY --link --from=linter /src/reports/eslint.xml /
COPY --link --from=linter /var/log/eslint.log /
COPY --link --from=linter /src/sonar/report.json /
COPY --link --from=dep-check /var/log/dep-check.log /
COPY --link --from=unit-tests /src/reports/mocha/unit-tests.xml /
COPY --link --from=unit-tests /var/log/unit-tests.log /


## STAGE: build
FROM sourced AS build
RUN yarn build

## STAGE: prune
FROM build AS prune
RUN \
  --mount=type=cache,id=yarn,target=/src/.yarn/cache \
  yarn config unset -H npmRegistries && \
  yarn cache clean


FROM base AS prod
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
CMD ["node", "--no-node-snapshot", "start.js"]
