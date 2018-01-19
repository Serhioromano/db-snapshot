# DB Migration Tool

This tool has some advantagies:

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



