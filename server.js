const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const adminRoutes = require("./routes/adminRoutes");
require("dotenv").config();

const app = express();
let db;

app.use(cors());
app.use(express.json());
app.use("/api/admin", adminRoutes);

async function connectDB() {
  const dbName = process.env.DB_NAME || "techflex";
  const safeDbName = dbName.replace(/`/g, "``");
  const setupConnection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    port: Number(process.env.DB_PORT) || 3306,
  });

  await setupConnection.query(`CREATE DATABASE IF NOT EXISTS \`${safeDbName}\``);
  await setupConnection.end();

  db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: dbName,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
  });

  await db.query(`
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

  console.log("MySQL connected");
}

function mapContact(row) {
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    interest: row.interest,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

app.post("/api/contact", async (req, res) => {
  try {
    const {
      name = null,
      company = null,
      email = null,
      phone = null,
      interest = null,
      message = null,
      status = "New",
    } = req.body;

    const [result] = await db.execute(
      `INSERT INTO contacts
       (name, company, email, phone, interest, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, company, email, phone, interest, message, status]
    );

    const [rows] = await db.execute("SELECT * FROM contacts WHERE id = ?", [
      result.insertId,
    ]);

    res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully",
      data: mapContact(rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

app.get("/api/contact", async (req, res) => {
  try {
    const [contacts] = await db.execute(
      "SELECT * FROM contacts ORDER BY created_at DESC"
    );

    res.json({
      success: true,
      data: contacts.map(mapContact),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

app.delete("/api/contact/:id", async (req, res) => {
  try {
    await db.execute("DELETE FROM contacts WHERE id = ?", [req.params.id]);

    res.json({
      success: true,
      message: "Inquiry deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

app.patch("/api/contact/:id/status", async (req, res) => {
  try {
    await db.execute("UPDATE contacts SET status = ? WHERE id = ?", [
      req.body.status,
      req.params.id,
    ]);

    const [rows] = await db.execute("SELECT * FROM contacts WHERE id = ?", [
      req.params.id,
    ]);

    res.json({
      success: true,
      data: rows[0] ? mapContact(rows[0]) : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

app.get("/", (req, res) => {
  res.send("Techflex Contact API Running");
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MySQL error:", err);
    process.exit(1);
  });
