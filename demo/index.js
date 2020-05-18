const websql = require('../dist/websql');

const identifier = "aaaaa";
const db = new websql.Database('../dist/websql-worker-debug.js');

const log = (functionName, text) => console.log(`${functionName}: ${text}`)
const timer = () => {
  const start = new Date();
  return {
    stop: () => {
      const end = new Date();
      return end.getTime() - start.getTime();
    }
  };
};
const formatBytes = (a, b) => {
  if (0 == a) return "0 Bytes";
  const c = 1024,
    d = b || 2,
    e = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
    f = Math.floor(Math.log(a) / Math.log(c));
  return `${parseFloat((a / Math.pow(c, f)).toFixed(d))} ${e[f]}`;
};

async function main() {
  var bench = timer();
  try {
    await db.mount({ key: "supersecurepassword" }, identifier, '../.tmp/');
    log(
      "db.mount",
      `Took ${bench.stop()}ms to mount the encrypted database`
    );
  } catch (error) {
    if (error.name === "DatabaseAlreadyMountedError") {
      log(
        "db.mount",
        `Database is already mounted (took ${bench.stop()}ms)`
      );
    } else if (error.name === "InvalidEncryptionKeyError") {
      log(
        "db.mount",
        `Could not mount the database, encryption key is invalid`
      );
      throw error;
    } else {
      throw error;
    }
  }

  // Create the table (note run does not return anything)
  await db.run("CREATE TABLE IF NOT EXISTS test (key, value);");

  var bench = timer();
  for (let i = 0; i < 1000; i++) {
    await db.run(`INSERT INTO test VALUES ${', (?,?)'.repeat(100).substr(2)}`, [
      ...new Array(50).fill(Math.random()),
      ...new Array(50).fill("hello world"),
      ...new Array(50).fill(1),
      ...new Array(50).fill(new Uint8Array(25)),
    ]);
  }
  log("db.run", `Took ${bench.stop()}ms to add 100 000 entries`);

  var bench = timer();
  var query = await db.execute("SELECT * FROM test;");
  log(
    "db.execute",
    `Took ${bench.stop()}ms to get the rows in the test table`
  );
  //console.log(query);

  var bench = timer();
  await db.saveChanges();
  log("db.saveChanges", `Took ${bench.stop()}ms to save the changes`);

  // Prepare a statement
  var bench = timer();
  const statement = await db.prepare(
    "SELECT * FROM test"
  );
  const statementResults = await statement.getAsObject();
  log(
    "db.prepare",
    `Took ${bench.stop()}ms to get the rows in the test table`
  );
  statement.free();
  var bench = timer();
  const statementCount = await db.prepare(
    "SELECT COUNT(*) as count FROM test"
  );
  const statementCountResult = (await statementCount.getAsObject())[0].count;
  log("db.prepare(count)", `Took ${bench.stop()}ms to count the items`);
  log("db.prepare(count)", `There is ${statementCountResult} items in the table`);
  statementCount.free();

  var bench = timer();
  const exportDatabase = await db.export("binary");
  log("db.export", `Took ${bench.stop()}ms to export the database.`);
  log(
    "db.export",
    `Size of the encrypted file is ${formatBytes(
      exportDatabase.byteLength
    )}`
  );
  //console.log(exportDatabase);

  try {
    var bench = timer();
    await db.close();
    log("db.close", `Took ${bench.stop()}ms to close the database`);
  } catch (error) {
    log("db.close", `Database already closed (${error.message})`);
  }

  var bench = timer();
  try {
    await db.wipe(identifier);
    log("db.wipe", `Took ${bench.stop()}ms to wipe the database`);
  } catch (error) {
    log("db.wipe", `Wipe was not successful (${error.message})`);
  }

  log("db._getWorkerInstance(terminate)", "Terminating the worker so we can exit the main thread...");
  await (await db._getWorkerInstance()).terminate();
}

main().catch((err)=>{
  console.log(err)
})
