module.exports = {
    apps: [
        {
            name: 'maosamigas',
            script: 'npm',
            args: 'start',
            cwd: '/home/imsmiilew/maosamigas',
            env: {
                NODE_ENV: 'production',
                DATABASE_URL: 'file:./dev.db',
                AUTH_SECRET: 'b4f9d2a1c8e7f6g5h4i3j2k1l0m9n8o7p6q5r4s3t2u1v0w9x8y7z6',
                AUTH_TRUST_HOST: 'true',
                AUTH_URL: 'http://34.39.221.223:3000',
                NEXTAUTH_SECRET: 'b4f9d2a1c8e7f6g5h4i3j2k1l0m9n8o7p6q5r4s3t2u1v0w9x8y7z6',
                NEXTAUTH_URL: 'http://34.39.221.223:3000',
                ADMIN_EMAIL: 'admin@maosamigas.com',
                ADMIN_PASSWORD: 'SuaSenhaSegura123'
            }
        },
        {
            name: 'whatsapp-bridge',
            script: 'server.js',
            cwd: '/home/imsmiilew/maosamigas/whatsapp-bridge',
            env: {
                NODE_ENV: 'production',
                WA_BRIDGE_PORT: '4000'
            },
            watch: false,
            autorestart: true,
            max_restarts: 10
        }
    ]
};
