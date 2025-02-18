/** @type {import('next').NextConfig} */
const nextConfig = {
    async redirects() {
        return [{
            source: '/question',
            destination: '/',
            permanent: true
        }]
    }
}

module.exports = nextConfig
