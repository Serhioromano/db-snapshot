#! /usr/bin/env node

var program = require('commander');

program
	.version("0.0.1")
	.description("DB migration tool")
	.command("env [options]", "Initialize configuration file").alias("i")
	.command("dump [options]", "Create DB dump").alias("d")
	.command("restore [options]", "Restore DB from the dump").alias("r")
	.parse(process.argv);	