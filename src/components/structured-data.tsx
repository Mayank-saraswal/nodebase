export function SoftwareAppStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Nodebase",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": "https://nodebase.mayanksaraswal.in",
    "description":
      "Workflow automation platform built for Indian businesses. " +
      "Native integrations with Razorpay, Cashfree, MSG91, Shiprocket, and 100+ services.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "INR",
    },
    "creator": {
      "@type": "Organization",
      "name": "Nodebase",
      "url": "https://nodebase.mayanksaraswal.in",
    },
    "featureList": [
      "Visual workflow builder",
      "Razorpay integration",
      "Cashfree integration",
      "MSG91 SMS automation",
      "Shiprocket automation",
      "Google Sheets automation",
      "PostgreSQL queries",
      "HTTP API requests",
      "Schedule-based triggers",
      "Webhook triggers",
    ],
    "screenshot": "https://nodebase.mayanksaraswal.in/opengraph-image",
    "inLanguage": "en-IN",
    "audience": {
      "@type": "Audience",
      "audienceType": "Indian businesses, D2C brands, SaaS companies, developers",
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function OrganizationStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Nodebase",
    "url": "https://nodebase.mayanksaraswal.in",
    "logo": "https://nodebase.mayanksaraswal.in/logos/nodebase.png",
    "description": "Workflow automation platform built for Indian businesses.",
    "foundingDate": "2025",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "IN",
      "addressRegion": "Rajasthan",
    },
    "sameAs": [
      "https://twitter.com/nodebasetech",
      "https://github.com/nodebase",
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
