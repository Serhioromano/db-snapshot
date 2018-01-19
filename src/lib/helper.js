/**
 * Created by Sergey on 10/8/15.
 */

var fs = require('fs');
var colors = require('colors');
var path = require('path');
var docs = path.normalize(__dirname + '/../docs');



module.exports = {
	showman: function(name) {
		fs.readFile(docs + '/' + name, 'utf-8', function(err, data) {
			if(err) {
				return;
			}
			console.log(data.yellow);
		});
	},
	warning: function(msg){
		msg = 'INFO! '.bold + msg;
		console.log(msg.bgBlue.white);
	},
	error: function(msg){
		msg = 'ERROR! '.bold + msg;
		console.log(msg.bgRed.white);
	},
	message: function(msg){
		console.log(msg.bgGreen.white);
	}
};