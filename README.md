# DB Migration Tool

Nodejs based CLI tool to synchronize DB.

> Right now only works with MySQL

1. No need to create a lot of boring migration files like in traditional migration tools like Phinx.
2. Use in gulp, webpack to alter your DB to required state.

## How to install

1. Use command

        npm install db-json-sync --save-dev

2. Create `./db` folder in the root of your project

3. Run 

        djs init

    This will create `.djs`


This tool has some advantages:

## Do not have to type anything

In traditional Migration tools like Phinx, you have to create file and define all fields and such. Here is example.

```php 
class InitialDb extends AbstractMigration
{
	public function change()
	{
		$this->table('user', ['id' => FALSE, 'primary_key' => 'id'])
			->addColumn('id', 'integer', ['null' => TRUE, 'signed' => FALSE, 'identity' => TRUE, 'limit' => MysqlAdapter::INT_REGULAR])
			->addColumn('username', 'string', ['null' => FALSE, 'limit' => 45])
			->addColumn('email', 'string', ['null' => FALSE, 'limit' => 150])
			->addColumn('password', 'string', ['null' => FALSE, 'limit' => 32])
            ->save();
    }
}
```

1. This takes a lot of time. 
3. If you want to add changes you have to add new file and keep transforming your DB by altering it and you endup with hundreds of files.

This CLI tool works differently. You run command line and it created JSON snapshot of your DB. With another command you can restore this snapshot into another DB. It will automaticaly compare and create missed tables, fields or change them and delete all that in not in JSON DB Schema.

