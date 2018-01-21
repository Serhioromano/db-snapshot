var h = require('./helper');
var fs = require('fs');
var dateFormat = require('dateformat');
var sync = require('synchronize');
var mysql = require('mysql');
var format = require('string-format');

format.extend(String.prototype);

module.exports = function(options) {
    
    let prefix = options.new_prefix;
    
    var con = mysql.createConnection({
        host: options.host,
        user: options.user,
        password: options.pass,
        database: options.name,
        charset: options.collation
    });
    
    sync(con, 'query', 'connect', 'end');
    
    
    con.on('error', function (err) {
        if (err) {
            h.error("No connection! {0} ({1})".format(err.code, err.sqlMessage));
            process.exit(1);
            return;
        }
    });
    
    return sync.fiber(function () {
        
        con.connect(function (err) {
            if (err) {
                h.error("No connection! {0} ({1})".format(err.code, err.sqlMessage));
                return;
            }
        });

        let file = options.file ? options.file :  options.dir + '/{0}dump.json'.format(options.prefix);

        if (!fs.existsSync(file)) {
            h.error('Could not find file: ' + file.bold);
            return;
        }

        let dump = JSON.parse(fs.readFileSync(file));

        con.query("SET @@session.sql_mode =\"ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION\"");

        let tables = con.query("SHOW TABLE STATUS LIKE '" + prefix + "%'");
        let t_array = [];
        let db_tables = [];
        tables.forEach(function (v) {
            db_tables[v.Name] = v;
            t_array.push(v.Name);
        });

        for (var table_name in dump.tables) {

            let new_table_name = prefix + table_name;

            let dump_table = dump.tables[table_name];
            let db_table = db_tables[new_table_name];


            // Update table
            if (t_array.indexOf(new_table_name) != -1) {
                if (
                    db_table.Engine != dump_table.Engine ||
                    db_table.Comment != dump_table.Comment
                ) {
                    let sql = "ALTER TABLE `{0}` ENGINE = {1} COMMENT='{2}'".format(
                        new_table_name, dump_table.Engine, dump_table.Comment);
                    con.query(sql);
                    h.message('Alter table: ' + sql.bold);

                }

                let fields = con.query(
                    "SELECT * FROM `INFORMATION_SCHEMA`.`COLUMNS` WHERE `TABLE_NAME` = '{0}'".format(new_table_name)
                );
                let db_fields = [];
                fields.forEach(function (field) {
                    db_fields[field.COLUMN_NAME] = field;
                });


                for (var field_name in dump_table.Fields) {
                    let dump_field = dump_table.Fields[field_name];
                    let db_field = db_fields[field_name] || {};

                    if (db_field.COLUMN_NAME == 'id') {
                        delete db_fields[field_name];
                        continue;
                    }

                    let update = "`{0}` {1} {2} {3} COMMENT '{4}'".format(
                        field_name, dump_field.Type, (dump_field.Null == "YES" ? 'NULL' : 'NOT NULL'),
                        get_default(dump_field), dump_field.Comment
                    );


                    // Update field
                    if (typeof db_field.COLUMN_NAME != 'undefined') {
                        if (
                            db_field.IS_NULLABLE != dump_field.Null ||
                            db_field.COLUMN_TYPE != dump_field.Type ||
                            //db_field.COLUMN_DEFAULT != dump_field.Default ||
                            db_field.COLUMN_COMMENT != dump_field.Comment
                        ) {
                            let sql = "ALTER TABLE `{0}` CHANGE COLUMN `{1}` {2}".format(new_table_name, field_name, update);
                            con.query(sql);
                            h.message('Change column: ' + sql.bold);

                        }
                        delete db_fields[field_name];
                    }
                    // create field
                    else {
                        let sql = "ALTER TABLE `{0}` ADD COLUMN {1}".format(new_table_name, update);
                        con.query(sql);
                        h.message('Add column: ' + sql.bold);

                    }
                }

                if (options.delete.field && Object.keys(db_fields).length > 0) {
                    for (let dc in db_fields) {
                        let sql = "ALTER TABLE `{0}` DROP COLUMN `{1}`".format(new_table_name, dc);
                        con.query(sql);
                        h.message('Drop Columns: ' + sql.bold);

                    }
                }

                let indexes = con.query('SHOW INDEXES FROM `{0}`'.format(new_table_name));
                let db_indexes = [];
                indexes.forEach(function (index) {
                    db_indexes[index.Key_name] = index;
                });

                for (var index_name in dump_table.Indexes) {
                    let dump_index = dump_table.Indexes[index_name];
                    let db_index = db_indexes[index_name] || {};

                    if (typeof db_index.Key_name == 'undefined') {
                        let add = "ALTER TABLE `{0}` ADD INDEX `{1}` ({2} ASC)".format(
                            new_table_name, index_name, dump_index.Fields.join(' ASC, ')
                        );
                        con.query(add);
                        h.message('Add Index: ' + add.bold);

                    }
                    delete db_indexes[index_name];
                }

                if (options.delete.index && Object.keys(db_indexes).length > 0) {
                    for (let di in db_indexes) {
                        let sql = "DROP INDEX `{1}` ON {0}".format(new_table_name, di);
                        con.query(sql);
                        h.message('Alter table: ' + sql.bold);

                    }
                }

            }
            // Create table
            else {

                let sql = [];

                if (dump_table.Primary) {
                    sql.push("`" + dump_table.Primary + "` int(10) unsigned NOT NULL AUTO_INCREMENT");
                }

                for (var field_name in dump_table.Fields) {
                    if (dump_table.Primary == field_name) {
                        continue;
                    }

                    let field = dump_table.Fields[field_name];

                    sql.push("`" + field_name + "` " + field.Type.toUpperCase() + " " +
                        (field.Null == "YES" ? 'NULL' : 'NOT NULL') + " " + get_default(field) + " COMMENT '" + field.Comment + "'");


                }

                if (dump_table.Indexes) {
                    for (var index_name in dump_table.Indexes) {
                        let index = dump_table.Indexes[index_name];
                        if (index_name == 'PRIMARY') {
                            sql.push("PRIMARY KEY ({0})".format(index.Fields.join(',')));
                        } else {
                            sql.push(index.Type + " `" + index_name + "` (" + index.Fields.join(',') + ")");
                        }
                    }
                }


                let query = "CREATE TABLE IF NOT EXISTS `" + new_table_name + "` \n (" + sql.join(",\n") + ")\n ENGINE=" +
                    dump_table.Engine + "  DEFAULT CHARSET=utf8;";
                con.query(query);
                h.message('Add table: ' + query.bold);

            }

            delete db_tables[new_table_name];
        }

        if (options.delete.table && Object.keys(db_tables).length > 0) {
            for (let dt in db_tables) {
                let sql = "DROP TABLE IF EXISTS `{0}`".format(dt);
                con.query(sql);
                h.message('Drop table: ' + sql.bold);
            }
        }

        
        // Check constraints
        if(options.constraints) {
            for (var table_name in dump.tables) {
                let new_table_name = prefix + table_name;
                
                let dump_table = dump.tables[table_name];
                let db_table = db_tables[new_table_name];
                
                let sql = "SELECT rc.UPDATE_RULE, rc.DELETE_RULE, kc.CONSTRAINT_NAME, \
                kc.COLUMN_NAME, kc.REFERENCED_TABLE_NAME, kc.REFERENCED_COLUMN_NAME \
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE  kc \
                left join INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc ON rc.CONSTRAINT_NAME = kc.CONSTRAINT_NAME \
                WHERE kc.TABLE_NAME = '" + new_table_name + "' AND kc.CONSTRAINT_NAME <> 'PRIMARY' \
                AND kc.REFERENCED_TABLE_NAME is not NULL";
                let constrains = con.query(sql);
                
                constrains.forEach(function (constrain) {
                    let sql = "ALTER TABLE `{0}` DROP FOREIGN KEY `{1}`".format(new_table_name, constrain.CONSTRAINT_NAME);
                    con.query(sql);
                });
                
                if (dump_table.Constraints) {
                    dump_table.Constraints.forEach(function (v) {
                        let sql = "ALTER TABLE `{0}` ADD CONSTRAINT `{1}` FOREIGN KEY (`{2}`) REFERENCES `{3}` (`{4}`) ON DELETE {5} ON UPDATE {6}".
                        format(new_table_name,
                            (prefix == dump.prefix ? v.CONSTRAINT_NAME : v.CONSTRAINT_NAME.replace(dump.prefix, prefix)),
                            v.COLUMN_NAME,
                            (prefix == dump.prefix ? v.REFERENCED_TABLE_NAME : v.REFERENCED_TABLE_NAME.replace(dump.prefix, prefix)),
                            v.REFERENCED_COLUMN_NAME, v.DELETE_RULE, v.UPDATE_RULE
                        );
                        con.query(sql);
                        h.message('New constraint: ' + sql.bold);
                        
                    });
                }
                
                con.query("OPTIMIZE TABLE `{0}`".format(new_table_name));
            }
        }
            
        h.message('Finished!');
        
        con.end();
    });
}

function get_default(field) {
    let field_default = field.Default || '';

    if (field.Type.substr(0, 3) == 'int' && !field_default) {
        field_default = '0';
    }

    if (field_default.length > 0) {
        field_default = "DEFAULT '" + field_default + "'";
    }

    if ([
            'text', 'mediumtext',
            'longtext', 'tinytext',
            'blob', 'tinyblob',
            'mediumblob', 'longblob'
        ].indexOf(field.Type) != -1) {
        field_default = '';
    }

    return field_default;
}
