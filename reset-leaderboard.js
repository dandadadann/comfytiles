const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'scores.db'));

db.serialize(() => {
  db.run('DELETE FROM scores', [], function(err) {
    if (err) {
      console.error('Failed to reset leaderboard:', err.message);
    } else {
      console.log('Leaderboard has been reset (all scores deleted).');
    }
    db.close();
  });
});