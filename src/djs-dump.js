var program = require('commander');
var h = require('./lib/helper');
var dump = require('./lib/dump');
var fs = require('fs');

program
    .description("Dump DB into JSON file")
    .option('-t, --timestamp', 'Attach timestamp to the name of the file.')
    .option('-e, --env [env]', 'What environment connection to use.')
    .option('-d, --description [description]', 'Description of the dump.')
    .option('-p, --prefix [prefix]', 'Table prefix.')
    .parse(process.argv);

var pwd = process.cwd();
var file = pwd + '/djs.json';

if(!fs.existsSync(file)) {
    h.error("Cannot find configuration file. Please run djs init.");
    return;
}

var config = JSON.parse(fs.readFileSync(file));

if(typeof config.env[program.env] === 'undefined') {
    h.error("Configuration file does not contain this environment");
    return;
}

var connection = config.env[program.env];

dump({
    prefix: program.prefix || connection.prefix,
    description: program.description,
    host: connection.host,
    user: connection.user,
    pass: connection.pass,
    name: connection.name,
    port: connection.port,
    charset: connection.collation,
    dir: pwd + '/' + config.directory,
    ts: program.timestamp
});