# Porkbun SSL Setup Guide for ai-commandcenter.com

## Overview
This guide shows you how to leverage Porkbun's automatic SSL certificates and proxy service instead of managing SSL certificates manually on your server.

## Option 1: Porkbun SSL Proxy (Recommended)

Porkbun offers SSL proxy services that handle SSL termination at their edge servers, so your server only needs to handle HTTP traffic.

### Steps to Enable Porkbun SSL Proxy:

1. **Log into your Porkbun account**
   - Go to https://porkbun.com/account/domain
   - Select your `ai-commandcenter.com` domain

2. **Enable SSL Proxy Service**
   - Look for "SSL" or "Proxy" settings in your domain management
   - Enable the SSL proxy feature
   - This will automatically provision SSL certificates for your domain

3. **Configure DNS Records**
   - Set up an A record pointing `ai-commandcenter.com` to your server's IP
   - Set up an A record pointing `www.ai-commandcenter.com` to your server's IP
   - If using the proxy, the records might show Porkbun's proxy IPs instead

4. **Update Docker Compose (if needed)**
   Since SSL is handled by Porkbun, you might only need port 80:
   ```yaml
   client:
     image: nginx:1.27.0-alpine
     container_name: LibreChat-NGINX
     ports:
       - "80:80"
       # Remove port 443 if using Porkbun SSL proxy
     depends_on:
       - api
     restart: always
     volumes:
       - ./client/nginx.conf:/etc/nginx/conf.d/default.conf
   ```

## Option 2: Porkbun Free SSL Certificates (Alternative)

If Porkbun doesn't offer proxy services, they might provide free SSL certificates you can download.

### Steps for Manual Certificate Download:

1. **Generate SSL Certificate in Porkbun**
   - In your domain management, look for SSL certificate options
   - Generate a free SSL certificate for `ai-commandcenter.com` and `www.ai-commandcenter.com`

2. **Download Certificate Files**
   - Download the certificate files (usually .crt and .key files)
   - You'll typically get:
     - `ai-commandcenter.com.crt` (certificate)
     - `ai-commandcenter.com.key` (private key)
     - `ca-bundle.crt` (certificate authority bundle)

3. **Install Certificates on Server**
   ```bash
   # Create directory for certificates
   sudo mkdir -p /etc/ssl/porkbun/ai-commandcenter.com/
   
   # Upload your certificate files to the server
   sudo cp ai-commandcenter.com.crt /etc/ssl/porkbun/ai-commandcenter.com/
   sudo cp ai-commandcenter.com.key /etc/ssl/porkbun/ai-commandcenter.com/
   sudo cp ca-bundle.crt /etc/ssl/porkbun/ai-commandcenter.com/
   
   # Create combined certificate file
   sudo cat /etc/ssl/porkbun/ai-commandcenter.com/ai-commandcenter.com.crt \
            /etc/ssl/porkbun/ai-commandcenter.com/ca-bundle.crt > \
            /etc/ssl/porkbun/ai-commandcenter.com/fullchain.pem
   
   # Set proper permissions
   sudo chmod 644 /etc/ssl/porkbun/ai-commandcenter.com/fullchain.pem
   sudo chmod 600 /etc/ssl/porkbun/ai-commandcenter.com/ai-commandcenter.com.key
   ```

4. **Update nginx configuration** to use Porkbun certificates:
   ```nginx
   server {
       listen 443 ssl http2;
       listen [::]:443 ssl http2;
       
       server_name ai-commandcenter.com www.ai-commandcenter.com;

       # SSL Configuration using Porkbun certificates
       ssl_certificate /etc/ssl/porkbun/ai-commandcenter.com/fullchain.pem;
       ssl_certificate_key /etc/ssl/porkbun/ai-commandcenter.com/ai-commandcenter.com.key;
       
       # ... rest of configuration
   }
   ```

5. **Update docker-compose.yml** to mount the certificate directory:
   ```yaml
   client:
     volumes:
       - ./client/nginx.conf:/etc/nginx/conf.d/default.conf
       - /etc/ssl/porkbun:/etc/ssl/porkbun:ro
   ```

## Current Configuration

The current nginx configuration is set up to work with **Option 1 (Porkbun SSL Proxy)**:

- `ai-commandcenter.com` traffic is handled via HTTP on port 80
- SSL termination happens at Porkbun's edge servers
- Real IP forwarding is configured to get actual client IPs

## Testing Your Setup

1. **Test HTTP access** (should work immediately):
   ```bash
   curl -I http://ai-commandcenter.com
   ```

2. **Test HTTPS access** (after enabling Porkbun SSL):
   ```bash
   curl -I https://ai-commandcenter.com
   ```

3. **Check SSL certificate** (if using Option 2):
   ```bash
   openssl s_client -connect ai-commandcenter.com:443 -servername ai-commandcenter.com
   ```

## Deployment

After configuring Porkbun SSL, deploy your changes:

```bash
# Commit the nginx configuration changes
git add client/nginx.conf
git commit -m "Configure nginx for Porkbun SSL proxy support"
git push origin main

# Deploy the updated configuration
docker compose restart client

# Or full redeploy if needed
docker compose down && docker compose up -d
```

## Troubleshooting

### Common Issues:

1. **502 Bad Gateway**: Check if the API container is running
   ```bash
   docker compose ps
   docker compose logs api
   ```

2. **SSL Certificate Errors**: 
   - Verify Porkbun SSL is properly enabled
   - Check DNS propagation: `nslookup ai-commandcenter.com`

3. **Real IP Issues**: If you're not getting real client IPs, adjust the `set_real_ip_from` directive in nginx

## Next Steps

1. **Enable Porkbun SSL** for `ai-commandcenter.com` in your Porkbun dashboard
2. **Test the configuration** using the commands above
3. **Monitor the deployment** to ensure all containers start successfully

This approach is much simpler than managing Let's Encrypt certificates manually and leverages Porkbun's infrastructure for SSL management.
