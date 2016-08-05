FROM node:6.3-slim

# Add killrvideo group and user
RUN groupadd -r killrvideo --gid=999 \
    && useradd -r -g killrvideo --uid=999 killrvideo

# Default to production environment
ENV NODE_ENV production

# Create directory for app
RUN mkdir -p /opt/killrvideo-generator \
    && chown -R killrvideo:killrvideo /opt/killrvideo-generator

WORKDIR /opt/killrvideo-generator

# Copy package.json for dependencies
COPY package.json /opt/killrvideo-generator/
    
# Add dependencies for node-gyp, then run npm install and remove dependencies
RUN set -x \
    && apt-get update \
    && apt-get install -y python \
                          make \
                          g++ \
    && npm install \
    && apt-get purge -y python \
                        make \
                        g++ \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Copy the app itself
COPY . /opt/killrvideo-generator

# Run the npm start script for the app by default
USER killrvideo
CMD [ "node", "/opt/killrvideo-generator/dist/index.js" ]