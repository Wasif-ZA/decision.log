#!/usr/bin/env node

/**
 * Generate secure keys for decision.log
 *
 * Usage: node scripts/generate-keys.js
 */

const crypto = require('crypto')

console.log('🔐 Generating secure keys for decision.log...\n')

// JWT Secret (32 bytes = 64 hex chars)
const jwtSecret = crypto.randomBytes(32).toString('hex')
console.log('JWT_SECRET:')
console.log(jwtSecret)
console.log()

// Encryption Key (32 bytes = 64 hex chars)
const encryptionKey = crypto.randomBytes(32).toString('hex')
console.log('ENCRYPTION_KEY:')
console.log(encryptionKey)
console.log()

console.log('✅ Keys generated successfully!')
console.log('\nAdd these to your .env file:')
console.log(`JWT_SECRET="${jwtSecret}"`)
console.log(`ENCRYPTION_KEY="${encryptionKey}"`)
console.log()
console.log('⚠️  Keep these keys secure and never commit them to version control!')
