module.exports = (RED) => {
  'use strict';

  // Note: we don't use mysql2/promise because it doesn't catch timeout error and lead to an "Uncaught Exception".
  // A patch has been developed but not published yet: https://github.com/sidorares/node-mysql2/pull/950
  const mysql = require('mysql2');

  function MySQLNode(config) {
    RED.nodes.createNode(this, config);

    this.query = (...args) => new Promise((resolve, reject) => {
      this.pool.query(...args, (err, ...results) => err ? reject(err) : resolve(results));
      this.pingReset(5);
    });

    this.pingReset = (timeout = 30) => {
      if (this.pingTimeout) {
        clearTimeout(this.pingTimeout);
      }
      this.pingTimeout = setTimeout(this.ping, timeout * 1000);
    };

    this.ping = async () => {
      try {
        await this.query('SELECT version();');
        this.emit('state', 'connected');
        this.pingReset();
      }
      catch (error) {
        this.emit('state', 'error',  error.toString());
        this.pingReset(5);
      }
    };

    this.connect = async () => {
      this.emit('state', 'connecting');

      if (this.pool) {
        return;
      }

      // Note: the connection is not done here
      this.pool = mysql.createPool({
        host: config.host,
        port: config.port,
        user: this.credentials.user,
        password: this.credentials.password,
        database: config.database,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        connectTimeout: 1000,
        ssl: config.tls ? {} : false,

        // debug: true,

        // Add support for queries like "WHERE `name` = :name" with payload being "{ name: 'Adrien' }".
        // See https://sidorares.github.io/node-mysql2/docs/documentation/extras#named-placeholders
        namedPlaceholders: true
      });

      // Do a ping that will trigger the connection and check that it is working
      await this.ping();


      // const tests = [
      //   [ 'INSERT INTO `users` SET ?', [{ name: 'Adrien', age: 12 }] ],
      //   [ 'INSERT INTO `users` (`name`, `age`) VALUES (:name, :age)', { name: 'Adrien', age: 12 } ],
      //   [ 'INSERT INTO `users` (`name`, `age`) VALUES (?, ?)', [ 'Adrien', 12 ] ],
      //   [ 'INSERT INTO `users` (`name`, `age`) VALUES ?', [[ [ 'Adrien', 12 ], [ 'Romain', 12 ] ]] ]
      // ];

      // for (const test of tests) {
      //   const [ query, payload ] = test;
      //   console.log(query);
      //   console.log(payload);
      //   const result = await this.query(query, payload);
      //   console.log(result);
      //   console.log();
      //   console.log('-'.repeat(80));
      //   console.log();
      // }
    };

    this.on('close', async done => {
      if (this.pingTimeout) {
        clearTimeout(this.pingTimeout);
      }

      if (this.pool) {
        await this.pool.end();
      }

      this.emit('state');
      done();
    });
  }
  RED.nodes.registerType(
    'Stackhero-MySQL-Server',
    MySQLNode,
    {
      credentials: {
        user: { type: 'text' },
        password: { type: 'password' }
      }
    }
  );



  function MysqlDBNodeIn(config) {
    RED.nodes.createNode(this, config);
    this.serverConfig = RED.nodes.getNode(config.server);

    if (!this.serverConfig) {
      this.error('MySQL database not configured');
      return;
    }

    this.setState = (code, info) => {
      if (code === 'connecting') {
        this.status({ fill: 'grey', shape: 'ring', text: 'connecting...' });
      }
      else if (code === 'connected') {
        this.status({ fill: 'green', shape: 'dot', text: 'connected' });
      }
      else if (code === 'error') {
        this.status({ fill: 'red', shape: 'ring', text: info });
      }
      else if (code === 'queryDone') {
        this.status({ fill: 'blue', shape: 'dot', text: 'query done' });
      }
      else {
        this.status({});
      }
    };

    this.serverConfig.on('state', (code, info) => this.setState(code, info));

    this.on('input', async msg => {
      if (typeof(msg.topic) !== 'string' || !msg.topic) {
        this.error('msg.topic should be a string containing the SQL query.');
        return;
      }

      const isAnObject = value => value === Object(value) && !Array.isArray(value);
      const isAnArray = value => Array.isArray(value);
      if (msg.payload !== undefined && !isAnObject(msg.payload) && !isAnArray(msg.payload)) {
        this.error('msg.payload should be an object or an array containing the query arguments.');
        return;
      }

      try {
        const [ result ] = await this.serverConfig
          .query(
            msg.topic,
            msg.payload
          );
        this.setState('queryDone');
        msg.payload = result;
        this.send(msg);
      }
      catch (error) {
        this.error(error, msg);
        this.setState('error', error.toString());
      }
    });

    this.on('close', async () => {
      this.serverConfig.removeAllListeners();
      this.setState();
    });

    this.serverConfig.connect();
  }
  RED.nodes.registerType('Stackhero-MySQL', MysqlDBNodeIn);
};
