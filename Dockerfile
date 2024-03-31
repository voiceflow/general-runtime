ARG NODE_VERSION=20.10
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

FROM sourced as testing

FROM testing as linter
RUN yarn lint:report 2>&1 | tee /var/log/eslint.log

FROM testing as dep-check
RUN yarn test:dependencies 2>&1 | tee /var/log/dep-check.log

FROM testing as unit-tests
RUN yarn test:unit:ci 2>&1 | tee /var/log/unit-tests.log

FROM scratch as checks
COPY --link --from=linter /src/reports/eslint.xml /
COPY --link --from=linter /var/log/eslint.log /
COPY --link --from=linter /src/sonar/report.json /
COPY --link --from=dep-check /var/log/dep-check.log /
COPY --link --from=unit-tests /src/reports/mocha/unit-tests.xml /
COPY --link --from=unit-tests /var/log/unit-tests.log /


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
CMD ["node", "--no-node-snapshot", "start.js"]
