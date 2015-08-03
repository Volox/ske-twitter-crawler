FROM node:latest
RUN git clone https://github.com/acerosalazar/ske-twitter-crawler
RUN cd ske-twitter-crawler; npm install
RUN wget https://github.com/eugene1g/phantomjs/releases/download/2.0.0-bin/phantomjs-2.0.0-ubuntu_x86_64.zip
RUN unzip phantomjs-2.0.0-ubuntu_x86_64.zip; mv phantomjs /usr/local/bin
RUN rm phantomjs-2.0.0-ubuntu_x86_64.zip
CMD ["node", "/ske-twitter-crawler/index.js"]
