#!/usr/bin/env tsx
/**
 * Generate a bcrypt hash for admin password.
 * Usage: npx tsx scripts/hash-password.ts <password>
 * Then set ADMIN_PASSWORD_HASH in your .env file.
 */
import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
    console.error('Usage: npx tsx scripts/hash-password.ts <password>');
    process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log('\nGenerated bcrypt hash:');
console.log(hash);
console.log('\nAdd to your .env file:');
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
console.log('\nThen remove ADMIN_PASSWORD from .env to disable plaintext fallback.\n');
