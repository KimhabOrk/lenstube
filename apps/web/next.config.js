/** @type {import('next').NextConfig} */
const { withAxiom } = require('next-axiom')
const withTM = require('next-transpile-modules')(['lens', 'utils'])

const moduleExports = withTM(
  withAxiom({
    reactStrictMode: process.env.NODE_ENV === 'production',
    experimental: {
      scrollRestoration: true,
      newNextLinkBehavior: true
    },
    async rewrites() {
      return [
        {
          source: '/sitemap.xml',
          destination: 'https://assets.lenstube.xyz/sitemaps/sitemap.xml'
        },
        {
          source: '/sitemaps/:match*',
          destination: 'https://assets.lenstube.xyz/sitemaps/:match*'
        },
        {
          source: '/collect/:match*',
          destination: 'https://api.mixpanel.com/:match*'
        }
      ]
    },
    async redirects() {
      return [
        {
          source: '/discord',
          destination:
            'https://discord.com/servers/lenstube-980882088783913010',
          permanent: true
        },
        {
          source: '/donate',
          destination: 'https://gitcoin.co/grants/6972/lenstube',
          permanent: true
        }
      ]
    },
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-XSS-Protection', value: '1; mode=block' },
            { key: 'X-Content-Type-Options', value: 'nosniff' }
          ]
        }
      ]
    }
  })
)

module.exports = moduleExports
