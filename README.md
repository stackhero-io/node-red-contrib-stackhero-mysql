# node-red-contrib-stackhero-mysql

[Node-RED](https://nodered.org) node to read and write to a MySQL or a MariaDB database.

It uses TLS (SSL) encryption and is compatible with "Caching SHA2 password" authentication method (MySQL >= 8).

**Remember: if you like it, please star it! 🥰**

Official repository: [https://github.com/stackhero-io/node-red-contrib-stackhero-mysql](https://github.com/stackhero-io/node-red-contrib-stackhero-mysql)

![Example of use](https://raw.githubusercontent.com/stackhero-io/node-red-contrib-stackhero-mysql/master/assets/screenshot.png)


## Sponsors

`node-red-contrib-stackhero-mysql` is developed by [Stackhero](https://www.stackhero.io/).
If you are looking for powerful managed services, like Node-RED, MySQL or MariaDB, you should seriously consider Stackhero 🤓

- [Managed MySQL databases](https://www.stackhero.io/services/MySQL)
- [Managed MariaDB databases](https://www.stackhero.io/services/MariaDB)
- [Managed Node-RED service](https://www.stackhero.io/services/Node-RED)


## Usage

This node is really simple.

Put your query in the `topic` variable and, if you have arguments, put them in an object in the `payload` variable.
You will get the result in the `payload` output variable.

Example:

```javascript
msg.topic = 'SELECT * FROM `users` WHERE `name` = :name AND `age` > :age;';
msg.payload = { name: 'Adrien', age: 30 };
return msg;
```

> Avoid SQL injections!!
>
> Do not NEVER EVER put variables content in `topic` directly!
> Always use the `payload` variable to pass your arguments.


## Troubleshooting


### Error "Connections using insecure transport are prohibited while --require_secure_transport=ON"

You have to connect using TLS encryption. Simply check the box in this node configuration.


### Error "ER_NOT_SUPPORTED_AUTH_MODE: Client does not support authentication protocol requested by server; consider upgrading MySQL client"

You are probably using another node than `node-red-contrib-stackhero-mysql` and tryin to connect to a MySQL >= 8 server using "Caching SHA2 password" authentication method.

To resolve that issue, simply use this node `node-red-contrib-stackhero-mysql`.