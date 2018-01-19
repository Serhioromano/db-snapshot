var program = require('commander');
var h = require('./helper');
var fs = require('fs');
var inq = require('inquirer');

program
    .description("Add connection for environment")
    .option('-d, --dir [directory]', 'Directory where to init configuration file. Default is .')
    .parse(process.argv);

var pwd = program.dir || process.cwd();
var file = pwd + '/djs.json';

inq
    .prompt([
        {
            type: "list",
            name: "env",
            message: "What environment?",
            default: "dev",
            choices: ["dev", "prod", "stage", "test"]
        },
        {
            type: "input",
            name: "directory",
            message: "Where to save migrations?",
            default: "db"
        },
        {
            type: "input",
            name: "host",
            message: "DB host",
            default: "127.0.0.1"
        },
        {
            type: "input",
            name: "port",
            message: "DB port",
            default: "3306"
        },
        {
            type: "input",
            name: "user",
            message: "Username",
            default: "root"
        },
        {
            type: "password",
            name: "password",
            message: "Password",
            default: ""
        },
        {
            type: "input",
            name: "db",
            message: "DB name",
            default: "",
            require: true
        },
        {
            type: "input",
            name: "prefix",
            message: "Table prefix",
            default: ""
        },
        {
            type: "input",
            name: "charset",
            message: "Charset",
            default: "utf8"
        },
        {
            type: "input",
            name: "collation",
            message: "Collation",
            default: "utf8_general_ci"
        },
        {
            type: "confirm",
            name: "conf",
            message: "Do you confirm all data?",
            default: true
        }
    ])
    .then(answers => {
        
        if(!answers.conf) {
            h.warning("Action aborted");
            return;
        }

        if(!answers.db) {
            h.warning("Name of the DB is required. Please edit file.");
        }

        if(!fs.existsSync(file)) {
            fs.writeFileSync(file, '{"env":{}}');
        }

        var config = JSON.parse(fs.readFileSync(file));

        config.directory = answers.directory;
        config.env[answers.env] = {
            "adapter":   "mysql",
            "host":      answers.host,
            "name":      answers.db,
            "user":      answers.user,
            "pass":      answers.password,
            "port":      answers.port,
            "charset":   answers.charset,
            "collation": answers.collation,
            "prefix": answers.prefix
        }
        fs.writeFileSync(file, JSON.stringify(config, null, 4));
        h.message("File " + file.bold + " Was created successfuly!");
    });