const mysql = require("mysql2/promise");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const mysqlConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "techflex",
    port: Number(process.env.DB_PORT) || 3306,
};

const mongoUri = process.env.MONGO_URI;
const mongoDbName = process.env.MONGO_DB_NAME || "techflex";
const mongoCollectionName = process.env.MONGO_COLLECTION || "contacts";

function safeDbName(name) {
    return name.replace(/`/g, "``");
}

async function createMysqlDatabaseAndTable(connection) {
    const dbName = mysqlConfig.database;
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${safeDbName(dbName)}\``);
    await connection.query(`USE \`${safeDbName(dbName)}\``);
    await connection.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      company VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      interest VARCHAR(255),
      message TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'New',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function migrate() {
    if (!mongoUri) {
        throw new Error("MONGO_URI environment variable is required to migrate from MongoDB.");
    }

    const mongoClient = new MongoClient(mongoUri);
    let mysqlConnection;

    try {
        console.log("Connecting to MongoDB...");
        await mongoClient.connect();
        const mongoDb = mongoClient.db(mongoDbName);
        const mongoCollection = mongoDb.collection(mongoCollectionName);

        console.log("Connecting to MySQL...");
        mysqlConnection = await mysql.createConnection({
            host: mysqlConfig.host,
            user: mysqlConfig.user,
            password: mysqlConfig.password,
            port: mysqlConfig.port,
            multipleStatements: true,
        });

        await createMysqlDatabaseAndTable(mysqlConnection);

        const docs = await mongoCollection.find().toArray();

        if (!docs.length) {
            console.log("No documents found in MongoDB collection.");
            return;
        }

        const insertSql = `INSERT INTO contacts
      (name, company, email, phone, interest, message, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        let inserted = 0;
        for (const doc of docs) {
            const createdAt = doc.createdAt || doc.created_at || doc.created_at || new Date();
            const updatedAt = doc.updatedAt || doc.updated_at || new Date();
            await mysqlConnection.execute(insertSql, [
                doc.name || null,
                doc.company || null,
                doc.email || null,
                doc.phone || null,
                doc.interest || null,
                doc.message || null,
                doc.status || "New",
                createdAt instanceof Date ? createdAt : new Date(createdAt),
                updatedAt instanceof Date ? updatedAt : new Date(updatedAt),
            ]);
            inserted += 1;
        }

        console.log(`Migration complete: ${inserted} documents copied to MySQL.`);
    } finally {
        if (mysqlConnection) {
            await mysqlConnection.end();
        }
        await mongoClient.close();
    }
}

migrate()
    .catch((error) => {
        console.error("Migration failed:", error.message);
        process.exit(1);
    });
