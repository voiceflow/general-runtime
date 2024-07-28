echo "${NPM_TOKEN?}"
echo "TARGET: ${TARGET:=prod}"
echo "IMAGE_TAG: ${IMAGE_TAG:=${TARGET}}"
echo "PLATFORMS: ${PLATFORMS:=linux/amd64}"
echo "DOCKERFILE: ${DOCKERFILE:=Dockerfile}"
echo "NO_CACHE_FILTER: ${NO_CACHE_FILTER-}"
echo "BUILDER: ${BUILDER:=buildy}"

# export NPM_TOKEN=$(cat ~/.npmrc | sed -e 's/^.*authToken=//')

# setup docker-container builder if it doesn't exist
docker buildx inspect "${BUILDER}" >/dev/null 2>&1 || docker buildx create --platform="${PLATFORMS}" --name "${BUILDER}"
docker buildx use "${BUILDER-}"
docker buildx inspect --bootstrap

docker buildx build . \
  -f "${DOCKERFILE}" \
  -t "general-runtime:${IMAGE_TAG}" \
  --secret id=NPM_TOKEN \
  --target "${TARGET}" \
  --platform "${PLATFORMS}" \
  --no-cache-filter "${NO_CACHE_FILTER-}" \
  --load
