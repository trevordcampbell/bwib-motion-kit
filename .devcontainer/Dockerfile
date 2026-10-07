FROM node:22-bookworm-slim
ARG HYPERFRAMES_VERSION=0.8.114
ENV DEBIAN_FRONTEND=noninteractive \
    HYPERFRAMES_BROWSER_PATH=/usr/local/bin/chrome-headless-shell \
    HYPERFRAMES_NO_UPDATE_CHECK=1 \
    HYPERFRAMES_EXTRACT_CACHE_DIR=/home/node/.cache/hyperframes/frames \
    PRODUCER_LOW_MEMORY_MODE=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates chromium-headless-shell ffmpeg python3 tini fonts-liberation fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/chromium-headless-shell /usr/local/bin/chrome-headless-shell \
    && npm install --global "hyperframes@${HYPERFRAMES_VERSION}" \
    && npm cache clean --force \
    && mkdir -p /home/node/.cache/hyperframes/frames \
    && chown -R node:node /home/node/.cache
# Warm the pinned npm cache at image-build time, including the native esbuild
# package for this platform. A fresh checkout can then install without network.
COPY package.json package-lock.json /opt/bwib-deps/
RUN npm ci --prefix /opt/bwib-deps --no-audit --no-fund \
    && cp -R /root/.npm /home/node/.npm \
    && chown -R node:node /home/node/.npm
USER node
WORKDIR /workspace
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sleep", "infinity"]
