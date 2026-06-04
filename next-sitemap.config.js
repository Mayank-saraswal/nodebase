/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://nodebase.mayanksaraswal.in",
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  changefreq: "weekly",
  priority: 0.7,
  sitemapSize: 5000,
  exclude: [
    "/workflows/*",
    "/editor/*",
    "/settings/*",
    "/api/*",
    "/verify-email",
    "/check-email",
    "/resend-verification",
  ],
  additionalPaths: async (config) => [
    await config.transform(config, "/"),
    await config.transform(config, "/pricing"),
    await config.transform(config, "/blog"),
    await config.transform(config, "/integrations"),
    await config.transform(config, "/login"),
    await config.transform(config, "/signup"),
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/workflows/", "/editor/", "/settings/", "/api/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/workflows/", "/editor/", "/settings/"],
      },
    ],
  },
}
