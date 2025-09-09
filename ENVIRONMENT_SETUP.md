# Environment Configuration Guide

This guide explains how to securely manage environment variables for LibreChat without exposing API keys to version control.

## 🔐 Security Approach

This project uses a **template-based configuration system** that separates:
- **Non-sensitive configuration** (committed to git in `config/env-template.js`)
- **Sensitive secrets** (stored in GitHub Secrets or local `.env` files)

## 📁 File Structure

```
config/
├── env-template.js      # Non-sensitive configuration template
└── generate-env.js      # Script to generate .env from template + secrets

scripts/
└── setup-env.js         # Interactive setup for local development

.env.example             # Example file showing all possible variables
.env                     # Generated file (gitignored, never commit)
```

## 🚀 Quick Start

### For Local Development

1. **Run the interactive setup:**
   ```bash
   node scripts/setup-env.js
   ```
   
   This script will:
   - Create a `.env` file from `.env.example`
   - Prompt you for API keys and secrets
   - Preserve existing values if you run it again
   - Set up local development domains

2. **Start LibreChat:**
   ```bash
   npm run dev
   # or
   docker compose up
   ```

### For Production Deployment

The deployment process automatically generates the `.env` file using:
- Configuration from `config/env-template.js`
- Secrets from GitHub Actions secrets

## 🔧 Configuration Management

### Adding New Configuration

1. **For non-sensitive config** (feature flags, model lists, etc.):
   - Add to `config/env-template.js` in the `envTemplate` object
   - Commit the change to git

2. **For sensitive config** (API keys, secrets):
   - Add the key name to the `secretKeys` array in `config/env-template.js`
   - Add the secret value to GitHub Actions secrets
   - Update your local `.env` file or run `node scripts/setup-env.js`

### Updating Configuration

#### Local Development
- Edit `.env` directly, or
- Run `node scripts/setup-env.js` again

#### Production
- Update GitHub Actions secrets in repository settings
- Push any template changes to trigger redeployment

## 🔑 Required GitHub Secrets

Set these in your GitHub repository settings under **Settings > Secrets and variables > Actions**:

### AI Provider API Keys
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_KEY`
- `XAI_API_KEY`
- `PERPLEXITY_API_KEY`

### Web Search API Keys
- `SERPER_API_KEY`
- `FIRECRAWL_API_KEY`
- `JINA_API_KEY`

### Speech API Keys
- `STT_API_KEY`
- `TTS_API_KEY`

### Security Keys
- `JWT_SECRET` (generate with: `openssl rand -hex 32`)
- `JWT_REFRESH_SECRET` (generate with: `openssl rand -hex 32`)
- `CREDS_KEY` (generate with: `openssl rand -hex 32`)
- `CREDS_IV` (generate with: `openssl rand -hex 16`)

### Database Keys
- `MEILI_MASTER_KEY`

### Domain Configuration
- `DOMAIN_CLIENT` (e.g., `https://yourdomain.com`)
- `DOMAIN_SERVER` (e.g., `https://yourdomain.com`)

### Deployment Secrets
- `HOST` (server IP)
- `USERNAME` (SSH username)
- `SSH_PRIVATE_KEY` (SSH private key)
- `PORT` (SSH port, usually 22)

## 🛠️ How It Works

### Local Development Flow
```
.env.example → scripts/setup-env.js → .env (local)
```

### Production Deployment Flow
```
config/env-template.js + GitHub Secrets → config/generate-env.js → .env (server)
```

### Template System Benefits

1. **Version Control Friendly**: Only non-sensitive config is committed
2. **Maintainable**: Configuration changes are tracked in git
3. **Secure**: API keys never appear in code or git history
4. **Consistent**: Same configuration structure for all environments
5. **Auditable**: Clear separation between config and secrets

## 🔍 Troubleshooting

### Missing Secrets Error
If deployment fails with missing secrets:
1. Check GitHub Actions secrets are set correctly
2. Verify secret names match those in `config/env-template.js`
3. Check the deployment logs for specific missing keys

### Local Development Issues
If local setup isn't working:
1. Run `node scripts/setup-env.js` to regenerate `.env`
2. Check that `.env` file exists and has your API keys
3. Verify Node.js can read the config files

### Configuration Not Applied
If changes aren't taking effect:
1. **Local**: Restart your development server
2. **Production**: Push changes to trigger redeployment
3. Check that the configuration is in the right file (`env-template.js` vs `.env`)

## 📝 Best Practices

1. **Never commit `.env` files** - they're in `.gitignore` for a reason
2. **Use strong secrets** - generate random values for JWT secrets
3. **Rotate API keys regularly** - update in GitHub secrets when needed
4. **Test locally first** - verify configuration works before deploying
5. **Document new secrets** - update this guide when adding new keys

## 🔄 Migration from Old System

If you're migrating from the old hardcoded deployment script:

1. **Backup your current `.env`** (if you have one locally)
2. **Set up GitHub secrets** with your current API keys
3. **Run the new deployment** - it will generate the `.env` automatically
4. **Update local development** by running `node scripts/setup-env.js`

The new system maintains the same functionality while being more secure and maintainable.
