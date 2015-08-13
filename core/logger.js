var winston = require('winston');
winston.emitErrs = true;

var logger = new winston.Logger({
    transports: [
        // setup logging to console
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true,
            timestamp:true
        }),
        
        // setup logging to file
        new(winston.transports.File)({
            filename: process.env.PWD+'/logs/crawler.log',
            maxsize: 1024 * 1024 * 10, // 10MB
            level: 'info'
        })
    ],
    exitOnError: false
});

exports = module.exports = logger;