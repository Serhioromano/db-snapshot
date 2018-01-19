var h = require('./helper');
var fs = require('fs');
var dateFormat = require('dateformat');
var sync = require('synchronize');
var mysql = require('mysql');
var format = require('string-format');

format.extend(String.prototype);

module.exports = function(options) {
    
    let prefix = options.prefix;
    
    let dump = {
        name: options.description,
        created: dateFormat(new Date(), "yyyy-mm-dd h:MM:ss"),
        prefix: options.prefix,
        tables: {}
    };
    
    var con = mysql.createConnection({
        host: options.host,
        user: options.user,
        password: options.pass,
        database: options.name,
        charset: options.collation
    });
    
    sync(con, 'query', 'connect');
    
    
    con.connect(function (err) {
        if (err) {
            h.error("No connection! {0} ({1})".format(err.code, err.sqlMessage));
            return;
        }
    });
    
    con.on('error', function (err) {
        if (err) {
            h.error("No connection! {0} ({1})".format(err.code, err.sqlMessage));
            process.exit(1);
            return;
        }
    });

    if(!fs.existsSync(options.dir)) {
        fs.mkdirSync(options.dir);
    }
    
    return sync.fiber(function () {

        let tables = con.query("SHOW TABLE STATUS LIKE '" + options.prefix + "%'");

        tables.forEach(function (v) {

            let table = v.Name.replace(options.prefix, '');

            dump.tables[table] = {
                Engine: v.Engine,
                Collation: v.Collation,
                Auto_increment: v.Auto_increment,
                Comment: v.Comment,
                Fields: {},
                Indexes: {},
                Constraints: {}
            };

            let fields = con.query('SELECT * FROM `INFORMATION_SCHEMA`.`COLUMNS` WHERE `TABLE_NAME` = \'' + v.Name + "'");

            fields.forEach(function (v) {
                dump.tables[table].Fields[v.COLUMN_NAME] = {
                    Type: v.COLUMN_TYPE,
                    Null: v.IS_NULLABLE,
                    Key: v.COLUMN_KEY,
                    Default: v.COLUMN_DEFAULT,
                    Extra: v.EXTRA,
                    Comment: v.COLUMN_COMMENT
                };
            });


            let indexes = con.query('SHOW INDEXES FROM `' + v.Name + '`');

            indexes.forEach(function (v) {
                if (v.Key_name == 'PRIMARY') {
                    dump.tables[table].Primary = v.Column_name;
                }

                let key_type = 'KEY';
                if (v.Index_type == 'FULLTEXT') {
                    key_type = 'FULLTEXT KEY';
                }

                if (v.Non_unique == 0) {
                    key_type = 'UNIQUE KEY';
                }

                dump.tables[table].Indexes[v.Key_name] = dump.tables[table].Indexes[v.Key_name] || {
                        Type: "",
                        Fields: []
                    };
                dump.tables[table].Indexes[v.Key_name].Type = key_type;
                dump.tables[table].Indexes[v.Key_name].Fields.push('`' + v.Column_name + '`' +
                    (v.Sub_part ? "(" + v.Sub_part + ")" : ""));
            });

            let sql = "SELECT rc.UPDATE_RULE, rc.DELETE_RULE, kc.CONSTRAINT_NAME, \
                kc.COLUMN_NAME, kc.REFERENCED_TABLE_NAME, kc.REFERENCED_COLUMN_NAME \
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE  kc \
            left join INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc ON rc.CONSTRAINT_NAME = kc.CONSTRAINT_NAME \
            WHERE kc.TABLE_NAME = '" + v.Name + "' AND kc.CONSTRAINT_NAME <> 'PRIMARY' AND kc.REFERENCED_TABLE_NAME is not NULL";
            let constrains = con.query(sql);
            dump.tables[table].Constraints = JSON.parse(JSON.stringify(constrains));
        });

        let file = options.dir + '/{0}dump{1}.json'.format(options.prefix, (options.ts ? '_' + new Date().getTime() : ''));
        if (!fs.existsSync(file)) {
            fs.writeFile(file, '{}');
        }

        fs.writeFileSync(file, JSON.stringify(dump, null, 2));
        h.message('Dump was create successfully ' + file.bold);

        con.end();

        process.exit();
    });
}