FROM acerosalazar/ubuntu-node

# deploy the code 
RUN git clone https://github.com/acerosalazar/ske-twitter-crawler

# install the nodejs dependencies
RUN cd ske-twitter-crawler; npm install

# install phantomjs
RUN wget https://github.com/eugene1g/phantomjs/releases/download/2.0.0-bin/phantomjs-2.0.0-ubuntu_x86_64.zip
RUN unzip phantomjs-2.0.0-ubuntu_x86_64.zip; mv phantomjs /usr/local/bin
RUN rm phantomjs-2.0.0-ubuntu_x86_64.zip

#install missing phantomjs dependencies
RUN apt-get install -y libfontconfig libjpeg-turbo8 libicu52

CMD ["node", "/ske-twitter-crawler/index.js"]