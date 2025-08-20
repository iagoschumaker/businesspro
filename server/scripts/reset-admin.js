/*
  Script: reset-admin.js
  Purpose: Ensure an Administrator user exists, is active, and reset password.
  Usage: node scripts/reset-admin.js [email] [newPassword]
  Defaults: email=admin@businesspro.com, newPassword=admin123
*/

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from server root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');

const EMAIL = (process.argv[2] || 'admin@businesspro.com').toLowerCase();
const NEW_PASSWORD = process.argv[3] || 'admin123';

(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('[reset-admin] Missing MONGODB_URI in .env');
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('[reset-admin] Connected to MongoDB');

    let user = await User.findOne({ email: EMAIL });

    if (!user) {
      console.log(`[reset-admin] Admin not found, creating: ${EMAIL}`);
      user = new User({
        name: 'Administrador',
        email: EMAIL,
        password: NEW_PASSWORD,
        role: 'Administrador',
        status: 'Ativo',
      });
    } else {
      console.log(`[reset-admin] Admin found: ${EMAIL}. Resetting password and status.`);
      user.password = NEW_PASSWORD; // will be re-hashed by pre('save')
      user.status = 'Ativo';
      user.role = 'Administrador';
    }

    await user.save();

    console.log('[reset-admin] Success!');
    console.log('----------------------------------------');
    console.log(` email: ${EMAIL}`);
    console.log(` new password: ${NEW_PASSWORD}`);
    console.log(' status: Ativo');
    console.log(' role: Administrador');
    console.log('----------------------------------------');
    console.log('You can now login with these credentials.');
  } catch (err) {
    console.error('[reset-admin] Error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
})();
