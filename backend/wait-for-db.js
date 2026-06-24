const mysql = require('mysql2/promise');

const [,, host, portArg, timeoutArg] = process.argv;
const port = parseInt(portArg, 10) || 3306;
const timeoutSeconds = parseInt(timeoutArg, 10) || 120;

async function waitForDb() {
  const user = process.env.DB_USERNAME || process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'retail_db';

  for (let second = 1; second <= timeoutSeconds; second += 1) {
    try {
      const connection = await mysql.createConnection({
        host,
        port,
        user,
        password,
        database,
        connectTimeout: 5000,
      });
      await connection.query('SELECT 1');
      await connection.end();
      console.log(`Database reachable at ${host}:${port}`);
      return;
    } catch (error) {
      process.stdout.write('.');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.error(`Database did not become available after ${timeoutSeconds} seconds`);
  process.exit(1);
}

waitForDb();
