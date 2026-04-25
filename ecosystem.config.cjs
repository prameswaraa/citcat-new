/**
 * PM2 Ecosystem Configuration for Citcat
 * 
 * Usage:
 *   Development: pm2 start ecosystem.config.cjs
 *   Production:  pm2 start ecosystem.config.cjs --env production
 *   
 * Commands:
 *   pm2 start ecosystem.config.cjs        # Start all apps
 *   pm2 stop all                          # Stop all apps
 *   pm2 restart all                       # Restart all apps
 *   pm2 reload all                        # Zero-downtime reload
 *   pm2 logs                              # View all logs
 *   pm2 logs kirimchat-backend            # View backend logs only
 *   pm2 monit                             # Monitor dashboard
 *   pm2 save                              # Save current process list
 *   pm2 startup                           # Generate startup script
 */

module.exports = {
  apps: [
    // ==========================================
    // BACKEND - Hono + Node.js
    // ==========================================
    {
      name: 'kirimchat-backend',
      cwd: './apps/backend',
      script: 'dist/index.js',
      interpreter: 'node',
      
      // Production settings
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1, // Cluster mode in production
      exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3005,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
      
      // Auto-restart settings
      watch: false,                    // Don't watch in production
      max_memory_restart: '1G',        // Restart if memory exceeds 1GB
      restart_delay: 3000,             // Wait 3s before restart
      max_restarts: 10,                // Max restarts within min_uptime
      min_uptime: '10s',               // Consider started after 10s
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
      log_type: 'json',
      
      // Graceful shutdown
      kill_timeout: 5000,              // Wait 5s for graceful shutdown
      listen_timeout: 10000,           // Wait 10s for app to listen
      
      // Health check (requires PM2 Plus or custom implementation)
      // health_check_http: {
      //   enabled: true,
      //   url: 'http://localhost:3001/health',
      //   interval: 30000,
      // },
    },
    
    // ==========================================
    // FRONTEND - Next.js
    // ==========================================
    {
      name: 'kirimchat-frontend',
      cwd: './apps/frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      interpreter: 'node',
      
      // Next.js handles its own clustering internally
      instances: 1,
      exec_mode: 'fork',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Auto-restart settings
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      merge_logs: true,
      log_type: 'json',
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 30000,           // Next.js may need more time
    },
  ],
  
  // ==========================================
  // DEPLOYMENT CONFIGURATION (Optional)
  // ==========================================
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/kirimchat-multi.git',
      path: '/var/www/kirimchat',
      'pre-deploy-local': '',
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': '',
    },
  },
};
