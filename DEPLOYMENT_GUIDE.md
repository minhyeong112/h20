# 🚀 LibreChat H20 Fork - Remote Hosting Guide

This guide will help you deploy your customized LibreChat fork remotely for production use, following the MIT license for eventual commercialization.

## 📋 Prerequisites

- DigitalOcean account (or similar VPS provider)
- Domain name (optional but recommended)
- GitHub repository (already set up)
- Basic knowledge of Docker and Linux

## 🏗️ Phase 1: Development Environment (✅ COMPLETED)

We've already set up your development environment with:
- Node.js 20.19.4
- All LibreChat dependencies installed
- Frontend build pipeline configured
- Environment variables configured in `.env`
- GitHub Actions CI/CD pipeline created

## 🌍 Phase 2: Production Hosting Setup

### Step 1: Create DigitalOcean Droplet

1. **Create a new Droplet** with these specs:
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Basic $12/month (2 GB RAM, 1 vCPU, 50 GB SSD)
   - **Region**: Choose closest to your users
   - **Authentication**: SSH key (recommended)

2. **Enable monitoring and backups** (recommended for production)

### Step 2: Initial Server Setup

Connect to your server and run these commands:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Install essential tools
sudo apt install git nginx certbot python3-certbot-nginx -y

# Clone your repository
git clone https://github.com/minhyeong112/h20.git
cd h20
```

### Step 3: Configure Environment Variables

Create your production `.env` file:

```bash
# Copy the example
cp .env.example .env

# Edit with your production values
nano .env
```

**Key configurations for production:**

```env
# Server Configuration
HOST=0.0.0.0
PORT=3080
DOMAIN_CLIENT=https://yourdomain.com
DOMAIN_SERVER=https://yourdomain.com

# MongoDB (Use MongoDB Atlas - free tier available)
MONGO_URI=mongodb+srv://username:password@cluster0.abcde.mongodb.net/LibreChat?retryWrites=true&w=majority

# Security
DEBUG_CONSOLE=false
DEBUG_LOGGING=false
NO_INDEX=false

# Add your API keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_KEY=your_google_key

# Generate secure secrets
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
CREDS_KEY=$(openssl rand -hex 32)
CREDS_IV=$(openssl rand -hex 16)
```

### Step 4: Set Up MongoDB Atlas (Free Tier)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Configure network access (add 0.0.0.0/0 for now, restrict later)
4. Create a database user
5. Get your connection string and add it to `.env`

### Step 5: Deploy with Docker Compose

```bash
# Build and start services
docker compose -f deploy-compose.yml up -d --build

# Check status
docker compose -f deploy-compose.yml ps

# View logs
docker compose -f deploy-compose.yml logs -f
```

### Step 6: Configure Nginx Reverse Proxy

Create nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/librechat
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/librechat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: SSL Certificate with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 🔄 Phase 3: GitHub Actions CI/CD Setup

We've already created `.github/workflows/deploy.yml`. Now configure GitHub secrets:

### GitHub Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions:

1. **HOST**: Your server's IP address
2. **USERNAME**: Your server username (usually `root` or `ubuntu`)
3. **SSH_PRIVATE_KEY**: Your private SSH key content
4. **PORT**: SSH port (usually `22`)

### Generate SSH Key for Deployment

On your local machine:

```bash
# Generate key pair
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy"

# Copy public key to server
ssh-copy-id -i ~/.ssh/id_rsa.pub username@your-server-ip

# Copy private key content to GitHub secrets
cat ~/.ssh/id_rsa
```

## 🎯 Phase 4: Production Optimization

### Performance Enhancements

1. **Enable Redis for caching** (add to `.env`):
```env
USE_REDIS=true
REDIS_URI=redis://127.0.0.1:6379
```

2. **Add Redis to docker-compose**:
```yaml
redis:
  image: redis:7-alpine
  restart: always
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
```

### Security Hardening

1. **Firewall configuration**:
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
```

2. **Restrict MongoDB Atlas access** to your server's IP only

3. **Set up fail2ban**:
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

### Monitoring and Backups

1. **Set up DigitalOcean monitoring**
2. **Enable automatic backups**
3. **Configure log rotation**:
```bash
sudo nano /etc/logrotate.d/librechat
```

## 🔧 Phase 5: Customization for Commercial Use

### Branding Customization

1. **Update app title and branding** in `.env`:
```env
APP_TITLE=Your AI Assistant
CUSTOM_FOOTER="Powered by Your Company"
HELP_AND_FAQ_URL=https://yourcompany.com/help
```

2. **Custom domain and logos** (modify in client code)

### Commercial Features

Following the MIT license, you can:
- ✅ Use commercially
- ✅ Modify and distribute
- ✅ Add proprietary features
- ✅ Sell as a service

**Required**: Keep the original MIT license notice in your code.

### API Integration Examples

Add your custom endpoints in `librechat.yaml`:

```yaml
version: 1.0.5
cache: true
endpoints:
  custom:
    - name: "Your Custom Model"
      apiKey: "${YOUR_CUSTOM_API_KEY}"
      baseURL: "https://api.yourcustomservice.com"
      models:
        default: ["your-model-v1"]
      titleConvo: true
      titleModel: "your-model-v1"
```

## 📊 Phase 6: Scaling Considerations

### Horizontal Scaling

For high traffic, consider:

1. **Load balancer setup**
2. **Multiple app instances**
3. **Separate database server**
4. **CDN for static assets**

### Resource Monitoring

Monitor these metrics:
- CPU usage
- Memory usage
- Database connections
- API rate limits

## 🔄 Maintenance

### Regular Updates

```bash
cd h20
git pull origin main
docker compose -f deploy-compose.yml down
docker compose -f deploy-compose.yml up -d --build
```

### Database Backups

Set up automated MongoDB Atlas backups or manual exports:

```bash
# Export specific collection
mongodump --uri="your-mongodb-uri" --collection=conversations
```

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3080, 80, 443 are available
2. **Memory issues**: Upgrade to 2GB+ RAM if needed
3. **SSL renewal**: Set up cron job for certbot renewal
4. **Database connections**: Check MongoDB Atlas whitelist

### Logs and Debugging

```bash
# View application logs
docker compose -f deploy-compose.yml logs -f api

# View nginx logs
sudo tail -f /var/log/nginx/error.log

# Check system resources
htop
df -h
free -m
```

## 📞 Support

For issues specific to this fork:
- Open GitHub issues in your repository
- Check original LibreChat documentation: https://docs.librechat.ai

## 🎉 Next Steps

1. **Complete the initial deployment** following this guide
2. **Test all functionality** thoroughly
3. **Customize branding and features** for your use case
4. **Set up monitoring and backups**
5. **Plan your commercial strategy**

Your LibreChat fork is now ready for remote hosting and commercial use! 🚀
