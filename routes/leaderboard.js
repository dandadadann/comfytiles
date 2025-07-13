const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open (or create) the database
const db = new sqlite3.Database(path.join(__dirname, '../scores.db'));

// Create the scores table if it doesn't exist
// id: integer primary key, name: text, score: integer, created_at: timestamp
// Only keep top 100 scores for leaderboard

// Initialize table
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    difficulty TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Add difficulty column if it doesn't exist (for existing databases)
  db.run("PRAGMA table_info(scores)", (err, rows) => {
    if (!err && rows) {
      const hasDifficulty = rows.some(row => row.name === 'difficulty');
      if (!hasDifficulty) {
        db.run("ALTER TABLE scores ADD COLUMN difficulty TEXT DEFAULT 'beginner'");
      }
    }
  });
});

// GET /leaderboard?difficulty=beginner|intermediate|difficult
router.get('/', (req, res) => {
  const difficulty = req.query.difficulty || 'beginner';
  
  // Try to query with difficulty first, fallback to all scores if column doesn't exist
  db.all(
    'SELECT name, score, created_at FROM scores WHERE difficulty = ? ORDER BY score DESC, created_at ASC LIMIT 10',
    [difficulty],
    (err, rows) => {
      if (err) {
        console.error('Query error:', err);
        // If difficulty column doesn't exist, get all scores
        db.all(
          'SELECT name, score, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT 10',
          (err2, rows2) => {
            if (err2) {
              console.error('Fallback query error:', err2);
              return res.status(500).json([]);
            }
            res.json(Array.isArray(rows2) ? rows2 : []);
          }
        );
      } else {
        res.json(Array.isArray(rows) ? rows : []);
      }
    }
  );
});

// POST /leaderboard
router.post('/', (req, res) => {
  console.log('POST /leaderboard received:', req.body);
  const { name, score, difficulty } = req.body;
  if (!name || typeof score !== 'number' || !difficulty) {
    console.log('Invalid request data:', { name, score, difficulty });
    return res.status(400).json({ error: 'Name, score, and difficulty are required' });
  }
  // Check if the username exists for this difficulty
  db.get(
    'SELECT score FROM scores WHERE name = ? AND difficulty = ?',
    [name, difficulty],
    function (err, row) {
      if (err) {
        console.error('Database select error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (row) {
        // Username exists for this difficulty, only update if new score is higher
        if (score > row.score) {
          db.run(
            'UPDATE scores SET score = ? WHERE name = ? AND difficulty = ?',
            [score, name, difficulty],
            function (err) {
              if (err) {
                console.error('Database update error:', err);
                return res.status(500).json({ error: 'Database error' });
              }
              console.log('Score updated successfully:', { name, score, difficulty });
              res.json({ success: true, updated: true });
            }
          );
        } else {
          // New score is not higher, do not update
          res.status(200).json({ success: false, message: 'New score is not higher than existing score for this difficulty.' });
        }
      } else {
        // Username does not exist for this difficulty, insert new
        db.run(
          'INSERT INTO scores (name, score, difficulty) VALUES (?, ?, ?)',
          [name, score, difficulty],
          function (err) {
            if (err) {
              console.error('Database insert error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            console.log('Score inserted successfully:', { name, score, difficulty, id: this.lastID });
            res.json({ success: true, inserted: true, id: this.lastID });
          }
        );
      }
    }
  );
});

module.exports = router; 