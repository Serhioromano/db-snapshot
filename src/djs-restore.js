var program = require('commander');
var h = require('./lib/helper');
var restore = require('./lib/restore');
var fs = require('fs');

program
    .description("Restore DB from JSON dump")
    .option('-e, --env [env]', 'Connection environment.')
    .option('-f, --file [file]', 'Specific file to load.')
    .option('-p, --new-prefix [prefix]', 'New table prefix.')
    .option('-o, --old-prefix [prefix]', 'Old table prefix to load from.')
    .option('-t, --table-delete', 'Delete tables missed in the dump file.')
    .option('-c, --fields-delete', 'Delete fields missed in table dump.')
    .option('-i, --index-delete', 'Delete indexes missed in table dump.')
    .option('-k, --constraints', 'Check constraints.')
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

restore({
    new_prefix: program.newPrefix || connection.prefix,
    prefix: program.oldPrefix || connection.prefix,
    description: program.description,
    host: connection.host,
    user: connection.user,
    pass: connection.pass,
    name: connection.name,
    port: connection.port,
    charset: connection.collation,
    dir: pwd + '/' + config.directory,
    file: program.file,
    constraints: program.constraints,
    delete: {
        table: program.tableDelete,
        field: program.fieldsDelete,
        index: program.indexDelete
    }
});