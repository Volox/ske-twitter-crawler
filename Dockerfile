# uses a container that has all the phantom dependencies installed
FROM node:argon

# sets the workindig directory
WORKDIR /src

# sets environment varialbles
ENV SKE_DATABASE_NAME ske
# Debug config level for application
ENV DEBUG *

# deploys the code and installs the dependencies
RUN git clone https://github.com/Volox/ske-twitter-crawler . ; npm install

# makes sure the latest version of the code is being used, and starts the application
CMD git pull origin master; npm run crawler
