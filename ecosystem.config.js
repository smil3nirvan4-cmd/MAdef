module.exports = {
    apps: [
        {
            name: 'nextjs',
            script: 'npm',
            args: 'start',
            cwd: '/var/www/maosamigas',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
            error_file: '/var/log/pm2/nextjs-error.log',
            out_file: '/var/log/pm2/nextjs-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
        },
        {
            name: 'whatsapp',
            script: 'npx',
            args: 'tsx src/lib/whatsapp/server.ts',
            cwd: '/var/www/maosamigas',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '300M',
            env: {
                NODE_ENV: 'production',
            },
            error_file: '/var/log/pm2/whatsapp-error.log',
            out_file: '/var/log/pm2/whatsapp-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            // Delay restart to allow graceful shutdown
            restart_delay: 5000,
            // Don't restart more than 10 times in 1 minute
            max_restarts: 10,
            min_uptime: '10s',
        },
    ],

    // Deployment configuration
    deploy: {
        production: {
            user: 'deploy',
            host: 'your-vm-ip',
            ref: 'origin/main',
            repo: 'git@github.com:your-repo/maosamigas.git',
            path: '/var/www/maosamigas',
            'pre-deploy-local': '',
            'post-deploy': 'npm install && npx prisma generate && npx prisma db push && npm run build && pm2 reload ecosystem.config.js --env production',
            'pre-setup': '',
        },
    },
};
