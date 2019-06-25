FROM node:6.11-slim

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
COPY npm-shrinkwrap.json /opt/killrvideo-generator/

# Add dependencies for node-gyp, then run npm install and remove dependencies
RUN set -x \
    && printf "deb http://archive.debian.org/debian/ jessie main\ndeb-src http://archive.debian.org/debian/ jessie main\ndeb http://security.debian.org jessie/updates main\ndeb-src http://security.debian.org jessie/updates main" > /etc/apt/sources.list \
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

# Allow YouTube API Key to be passed in via build arguments and set an environment 
# variable based on it (Note: This is NOT a best practice to include API keys in 
# the build since they'll be exposed, but for our reference app purposes, this is
# preferrable to making every user that wants to try KillrVideo sign up for a key)
ARG KILLRVIDEO_YOUTUBE_API_KEY
ENV KILLRVIDEO_YOUTUBE_API_KEY ${KILLRVIDEO_YOUTUBE_API_KEY}

# Run the npm start script for the app by default
USER killrvideo
CMD [ "node", "/opt/killrvideo-generator/dist/index.js" ]
