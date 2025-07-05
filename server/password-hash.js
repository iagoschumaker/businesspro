const bcrypt = require('bcryptjs');

// Generate hash for 'admin123'
bcrypt.genSalt(10, (err, salt) => {
  bcrypt.hash('admin123', salt, (err, hash) => {
    console.log('Hash for admin123:', hash);
    
    // Let's also verify our existing hash works
    const existingHash = '$2b$10$5fZOHfXBxhO5yCqrOQVE6.cQT9d8lGRnJ5JV4.9RRZQzQN1DpF8Ki';
    bcrypt.compare('admin123', existingHash, (err, isMatch) => {
      console.log('Existing hash valid:', isMatch);
    });
  });
});
