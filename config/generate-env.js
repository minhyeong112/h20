#!/usr/bin/env node

/**
 * Environment File Generator
 * This script generates a .env file by combining the template configuration
 * with secrets from environment variables (GitHub Actions secrets)
 */

const fs = require('fs');
const path = require('path');
const { envTemplate, secretKeys } = require('./env-template');

function generateEnvFile() {
  console.log('🔧 Generating .env file from template...');
  
  const envLines = [];
  
  // Add header
  envLines.push('# =============================================================================');
  envLines.push('# LibreChat Environment Configuration');
  envLines.push('# Generated automatically - DO NOT EDIT MANUALLY');
  envLines.push('# =============================================================================');
  envLines.push('');
  
  // Add non-sensitive configuration from template
  envLines.push('# =============================================================================');
  envLines.push('# APPLICATION CONFIGURATION');
  envLines.push('# =============================================================================');
  envLines.push('');
  
  Object.entries(envTemplate).forEach(([key, value]) => {
    envLines.push(`${key}=${value}`);
  });
  
  envLines.push('');
  envLines.push('# =============================================================================');
  envLines.push('# SENSITIVE CONFIGURATION (from secrets)');
  envLines.push('# =============================================================================');
  envLines.push('');
  
  // Add sensitive configuration from environment variables
  secretKeys.forEach(key => {
    const value = process.env[key];
    if (value) {
      envLines.push(`${key}=${value}`);
    } else {
      // Add placeholder for missing secrets (will be empty)
      envLines.push(`${key}=`);
    }
  });
  
  // Write the .env file
  const envContent = envLines.join('\n');
  const envPath = path.join(process.cwd(), '.env');
  
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ .env file generated successfully');
  console.log(`📍 Location: ${envPath}`);
  
  // Log which secrets were found/missing (without showing values)
  const foundSecrets = secretKeys.filter(key => process.env[key]);
  const missingSecrets = secretKeys.filter(key => !process.env[key]);
  
  if (foundSecrets.length > 0) {
    console.log(`🔑 Found ${foundSecrets.length} secrets:`, foundSecrets.join(', '));
  }
  
  if (missingSecrets.length > 0) {
    console.log(`⚠️  Missing ${missingSecrets.length} secrets:`, missingSecrets.join(', '));
  }
}

// Run the generator
if (require.main === module) {
  generateEnvFile();
}

module.exports = { generateEnvFile };
