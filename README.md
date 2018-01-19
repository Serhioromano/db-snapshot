# DB Migration Tool

Nodejs based CLI tool to synchronize DB.

> Right now only works with MySQL

1. No need to create a lot of boring migration files like in traditional migration tools like Phinx.
2. Use in gulp, webpack to alter your DB to required state.

## How to install

1. Use command

        npm install serhioromano/db-snapshot --save-dev

2. Run 

        djs env

    Select dev environment. Please do not forget DB name and table prefix. 
	
	This will create `djs.json` file with configuration

## Make dump

Run

	djs dump -e dev

## Restore 

Run

	djs restore -e dev -tci -p np_

where `np_` is a new prefix. It will create another set of tables.

