export const ZERO_FINANCE_CONTENT = {
  dollars: {
    hero: {
      badge: "Personal Website",
      headline: {
        prefix: "Crypto",
        highlight: "Builder",
        suffix: "& Founder",
      },
      description:
        "I'm Ben. I've been working in crypto since 2018. Started as a developer, then moved into product and now I'm a founder. I'm currently building 0.finance, an insured savings account for businesses.",
      sub: "Scroll down to see what I've built.",
      subLink: "#work",
      cta: {
        primary: "View Work →",
        secondary: "Contact Me",
      },
      image: "/hero-raw.png",
      imageCaption: "Fig 1. Getting ready to ship crypto apps in 2018",
    },
    features: {
      title: "Selected Work",
      subtitle: "Case Studies",
      items: [
        {
          role: "Founder",
          year: "2025",
          title: "0.finance",
          url: "https://0.finance",
          logo: "https://www.0.finance/_next/image?url=%2Fnew-logo-bluer.png&w=48&q=75",
          previewImage: "/preview-0finance.png",
          desc: "Insured savings account for businesses. Non-custodial yield aggregator with on-chain insurance. Secured pre-seed funding.",
        },
        {
          role: "Founding Engineer",
          year: "2023",
          title: "Gnosis Pay",
          url: "https://gnosispay.com",
          logo: "/gnosispay-logo.svg",
          previewImage: "/preview-gnosispay.png",
          desc: "Built the consumer dashboard for the world's first stablecoin-backed debit card. Now powering ~$100M in transaction volume.",
        },
        {
          role: "Director of Apps",
          year: "2018",
          title: "Request Network",
          url: "https://request.network",
          logo: "https://cryptologos.cc/logos/request-req-logo.png",
          previewImage: "/preview-request.png",
          desc: "Led the Apps team building payment protocol tooling. Shipped type-safe SDKs and gas-optimized batching.",
        },
        {
          role: "Founder",
          year: "2024",
          title: "Note Companion",
          url: "https://www.notecompanion.ai/",
          logo: "https://www.notecompanion.ai/_next/image?url=%2Fnotecompanion.png&w=64&q=75",
          previewImage: "/preview-notecompanion.png",
          desc: "AI-powered document organizer for Obsidian. Built and sold as a micro-SaaS.",
        },
      ],
    },
    howItWorks: {
      title: "Product Philosophy",
      subtitle: "Why > How",
      steps: [
        {
          id: "1",
          title: "Customer Obsession",
          desc: "Crypto and AI allow us to ship faster than ever, shifting focus from 'how' to 'why'. I spend time with customers to understand their drivers, not just their requests.",
        },
        {
          id: "2",
          title: "Right Abstractions",
          desc: "DeFi will replace TradFi bit by bit. My focus is creating the right level of abstraction for each user—transforming programmable money into meaningful business tools like complex escrow or automated vaults.",
        },
        {
          id: "3",
          title: "Taste & Metrics",
          desc: "Decisions are taste-based bets measured against rigorous metrics. I strive for 'hard to vary' solutions—neat answers to specific problems that often have unexpected reach.",
        },
      ],
    },
    footer: {
      tagline: "Let's Build Together",
      desc: "Currently building 0.finance. Always open to interesting conversations.",
      cta: "Say Hi →",
    },
  },
  crypto: {
    hero: {
      badge: "PROTOCOL::ARCHITECT",
      headline: {
        prefix: "Building",
        highlight: "0.finance",
        suffix: "A Savings Account To Help Businesses Save More",
      },
      description:
        "I've been working in crypto since 2018. Started as a developer, then moved into product and now I'm a founder. I'm currently building 0.finance, an insured savings account for businesses.",
      sub: "Solidity • TypeScript • React • Node.js • Python • PostgreSQL",
      cta: {
        primary: "View Code →",
        secondary: "Github",
      },
    },
    features: {
      title: "TECHNICAL::DEEP_DIVE",
      subtitle: "Implementation Details",
      items: [
        {
          title: "0.FINANCE::ARCH",
          url: "https://0.finance",
          headline: "INSURED_SAVINGS_ACCOUNT",
          desc: "Building 0.finance, an insured savings account for businesses. We believe the world will run on DeFi and are building infrastructure to get businesses safely on it—starting with an insured savings account that helps businesses earn 8% on their savings. Next up: providing this as a service for up-and-coming neobanks.",
        },
        {
          title: "GNOSIS_PAY::DASHBOARD",
          url: "https://gnosispay.com",
          headline: "STABLECOIN_DEBIT_CARD",
          desc: "The Gnosis Pay team set out to build the first stablecoin-backed debit card—and it did. I was hired as an early engineer to help ship the web app components. Worked closely with what is now my co-founder at 0.finance.",
        },
        {
          title: "REQUEST::LEADERSHIP",
          url: "https://request.network",
          headline: "FIRST_CRYPTO_GIG_TO_TEAM_LEAD",
          desc: "Request was my first dip into crypto. Joined as an engineer, ended up managing a team of 7 across disciplines and building the Request Finance API that now processes close to $1B in transaction volume.",
        },
        {
          title: "NOTE_COMPANION::AI",
          url: "https://www.notecompanion.ai/",
          headline: "BUILT_AND_EXITED_2024-2025",
          desc: "Built and exited Note Companion (2024–2025). A plugin for popular personal knowledge management app Obsidian with ~700 GitHub stars that organized millions of documents. The premise was simple: let AI organize your Obsidian vault.",
        },
      ],
    },
    howItWorks: {
      title: "Engineering Principles",
      subtitle: "Secure → Efficient → Composable",
      steps: [
        {
          id: "1",
          title: "Security First",
          desc: "Safety is not an afterthought. I implement rigorous testing, audit readiness, and defensive coding practices in every smart contract.",
        },
        {
          id: "2",
          title: "Gas Optimization",
          desc: "Efficiency matters. I optimize contract logic for gas consumption and frontend performance for load times.",
        },
        {
          id: "3",
          title: "Composability",
          desc: "I build systems that play well with others. Standard-compliant tokens, clean APIs, and modular architectures are my default.",
        },
      ],
    },
    footer: {
      tagline: "Let's Ship Code",
      desc: "Building at the intersection of crypto and AI. Let's talk.",
      cta: "View Github",
    },
  },
};

export const UI_LABELS = {
  // Navigation & Section Labels
  navAboutLink: 'About',
  aboutSectionLabel: 'ABOUT',
  aboutSectionHeader: 'ABOUT_ME',
  viewAboutButton: 'Learn More',
  printButton: 'Print',
  sectionPrefix: 'SECTION_07: ABOUT',
  portfolioTag: 'WORK',
  
  // Visibility flags - what to show/hide
  showCvSection: false,           // Hide formal CV layout
  showPrintButton: false,         // Hide print button
  showTimeline: false,            // Hide employment dates/periods
  showLocations: false,           // Hide job locations
  showJobTitles: false,           // Hide formal job titles
  showVenturesSection: false,     // Hide "Other Ventures" section
  showSkillsSection: false,       // Hide skills/competencies list
  
  // Section titles
  experienceTitle: 'Projects',    // Instead of "Experience"
  venturesTitle: 'Past Work',     // Instead of "Other Ventures"
};

export const BENJAMIN_PROFILE = {
  name: "Benjamin Shafii",
  tagline: "I build things at the intersection of crypto and AI",
  description: "Currently building 0.finance — an insured savings account for businesses. Previously shipped products at Gnosis Pay and Request Network.",
  category: "BUILDER",
  website: "https://0.finance",
  twitter: "https://x.com/hotkartoffel1",
  linkedin: "https://www.linkedin.com/in/ben-shafii-450039107/",
  github: "https://github.com/different-ai",
  email: "benjamin.shafii@gmail.com",
  // Projects - focus on what was built, not job history
  roles: [
    {
      id: "0finance",
      company: "0.finance",
      url: "https://0.finance",
      title: "Founder",
      period: "2024 — Present",
      location: "SF",
      description: "Non-custodial yield aggregator with on-chain insurance for businesses.",
    },
    {
      id: "gnosis",
      company: "Gnosis Pay",
      url: "https://gnosispay.com",
      title: "Engineer",
      period: "2023 — 2024",
      location: "Berlin",
      description: "Built the consumer dashboard for the first stablecoin debit card. ~$100M in volume.",
    },
    {
      id: "request",
      company: "Request Network",
      url: "https://request.network",
      title: "Engineer",
      period: "2018 — 2019",
      location: "Amsterdam",
      description: "Payment protocol tooling. Type-safe SDKs and gas-optimized batching.",
    },
  ],
  // Past projects - simplified
  history: [
    {
      company: "Note Companion",
      url: "https://notecompanion.ai",
      role: "Built & Sold",
      period: "2024",
      desc: "AI document organizer for Obsidian. Micro-SaaS exit.",
    },
    {
      company: "Embedbase",
      url: "https://github.com/different-ai/embedbase",
      role: "Co-built",
      period: "2023",
      desc: "Open-source vector database API for semantic search.",
    },
    {
      company: "prologe.io",
      role: "Co-built",
      period: "2019-2022",
      desc: "Startup studio. P2P video, podcast automation, early-stage product work.",
    },
  ],
};
