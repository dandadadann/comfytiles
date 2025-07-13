const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'scores.db'));

db.all("PRAGMA table_info(scores)", (err, columns) => {
  if (err) {
    console.error("Error reading table info:", err);
    process.exit(1);
  }
  const hasDifficulty = columns.some(col => col.name === 'difficulty');
  if (hasDifficulty) {
    console.log("The 'difficulty' column already exists.");
    db.close();
    process.exit(0);
  }
  db.run("ALTER TABLE scores ADD COLUMN difficulty TEXT DEFAULT 'beginner'", err => {
    if (err) {
      console.error("Error adding 'difficulty' column:", err);
      process.exit(1);
    }
    console.log("Added 'difficulty' column to 'scores' table.");
    db.close();
  });
});