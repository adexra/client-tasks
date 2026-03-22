export const PROJECT_TEMPLATES = {
  framer_site: [
    { title: "[PHASE 1] Analyze brief", description: "Study inspiration and determine direction", bucket: "backlog", priority: "high", estimated_minutes: 30 },
    { title: "[PHASE 1] Study inspiration", description: "Look at competitor and inspiration sites", bucket: "backlog", priority: "medium", estimated_minutes: 45 },
    { title: "[PHASE 1] Define sections + page structure", description: "Create clear layout plan (no building yet)", bucket: "backlog", priority: "high", estimated_minutes: 60 },

    { title: "[PHASE 2] Choose template", description: "Select the starting Framer template", bucket: "backlog", priority: "medium", estimated_minutes: 30 },
    { title: "[PHASE 2] Create new Framer project", description: "Set up the project workspace", bucket: "backlog", priority: "medium", estimated_minutes: 15 },
    { title: "[PHASE 2] Add preview domain", description: "Configure framerapp staging domain", bucket: "backlog", priority: "low", estimated_minutes: 15 },
    { title: "[PHASE 2] Set up base structure", description: "Define base components and structure", bucket: "backlog", priority: "high", estimated_minutes: 45 },
    { title: "[PHASE 2] Add color styles", description: "Setup 60/30/10 + shades 50–900", bucket: "backlog", priority: "high", estimated_minutes: 30 },
    { title: "[PHASE 2] Select typography", description: "Set font styles and sizing", bucket: "backlog", priority: "high", estimated_minutes: 30 },
    { title: "[PHASE 2] Create pages + breakpoints", description: "Setup all needed pages and tablet/mobile breakpoints", bucket: "backlog", priority: "high", estimated_minutes: 60 },

    { title: "[PHASE 3] Build first 2–3 sections (homepage)", description: "Start visual design exploration", bucket: "backlog", priority: "high", estimated_minutes: 120 },
    { title: "[PHASE 3] Add reusable components", description: "Convert repeated elements into components", bucket: "backlog", priority: "medium", estimated_minutes: 60 },
    { title: "[PHASE 3] Define design direction", description: "Finalize visual style based on 2-3 sections", bucket: "backlog", priority: "high", estimated_minutes: 45 },
    { title: "[PHASE 3] Send for feedback", description: "Checkpoint before full build", bucket: "backlog", priority: "high", estimated_minutes: 30 },

    { title: "[PHASE 4] Complete homepage design", description: "Finish all sections on homepage", bucket: "backlog", priority: "high", estimated_minutes: 180 },
    { title: "[PHASE 4] Polish all sections", description: "Refine spacing, interactions, and visuals", bucket: "backlog", priority: "high", estimated_minutes: 120 },
    { title: "[PHASE 4] Add CMS structure", description: "Set up collections, fields, and templates if needed", bucket: "backlog", priority: "medium", estimated_minutes: 90 },
    { title: "[PHASE 4] Start next page(s)", description: "Build out remaining pages", bucket: "backlog", priority: "high", estimated_minutes: 180 },
    { title: "[PHASE 4] Add real content + CMS data", description: "Populate site with actual content", bucket: "backlog", priority: "high", estimated_minutes: 90 },

    { title: "[PHASE 5] Responsive adjustments", description: "Optimize for tablet and mobile breakpoints", bucket: "backlog", priority: "high", estimated_minutes: 120 },
    { title: "[PHASE 5] Link buttons and navigation", description: "Connect all internal and external links", bucket: "backlog", priority: "medium", estimated_minutes: 60 },
    { title: "[PHASE 5] Optimize images", description: "Compress and format assets", bucket: "backlog", priority: "medium", estimated_minutes: 45 },

    { title: "[PHASE 6] Test all pages", description: "QA testing for bugs and layout issues", bucket: "backlog", priority: "high", estimated_minutes: 90 },
    { title: "[PHASE 6] Fix bugs", description: "Address QA findings", bucket: "backlog", priority: "high", estimated_minutes: 60 },
    { title: "[PHASE 6] Check typography consistency", description: "Ensure heading and paragraph styles are uniform", bucket: "backlog", priority: "medium", estimated_minutes: 30 },
    { title: "[PHASE 6] Check spacing/layout consistency", description: "Ensure consistent margins/padding", bucket: "backlog", priority: "medium", estimated_minutes: 30 },

    { title: "[PHASE 7] Set heading structure (H1, H2)", description: "Semantic HTML check", bucket: "backlog", priority: "high", estimated_minutes: 30 },
    { title: "[PHASE 7] Basic SEO (titles, descriptions)", description: "Set meta tags and opengraph", bucket: "backlog", priority: "high", estimated_minutes: 45 },
    { title: "[PHASE 7] Connect domain", description: "Point DNS to Framer", bucket: "backlog", priority: "high", estimated_minutes: 30 },
    { title: "[PHASE 7] Publish site", description: "Launch to production", bucket: "backlog", priority: "high", estimated_minutes: 15 },
    { title: "[PHASE 7] Submit sitemap / indexing", description: "Send to GSC", bucket: "backlog", priority: "medium", estimated_minutes: 15 }
  ],
  automation: [
    { title: "[PHASE 1] Map Workflow", description: "Map out current and desired flow", bucket: "backlog", priority: "high", estimated_minutes: 60 },
    { title: "[PHASE 2] Setup Tools/Connections", description: "Connect APIs or tools (Make/Zapier)", bucket: "backlog", priority: "high", estimated_minutes: 60 },
    { title: "[PHASE 3] Build Automation", description: "Create the scenario/zap", bucket: "backlog", priority: "high", estimated_minutes: 120 },
    { title: "[PHASE 4] QA & Testing", description: "Test the automation with dummy data", bucket: "backlog", priority: "high", estimated_minutes: 60 },
    { title: "[PHASE 5] Launch & Handover", description: "Turn on automation and document process", bucket: "backlog", priority: "high", estimated_minutes: 45 }
  ],
  advertising: [
    { title: "[PHASE 1] Strategy Setup", description: "Define goals, audience and budget", bucket: "backlog", priority: "high", estimated_minutes: 60 },
    { title: "[PHASE 2] Ad Creatives & Copy", description: "Create visuals and ad copy", bucket: "backlog", priority: "high", estimated_minutes: 120 },
    { title: "[PHASE 3] Campaign Setup", description: "Build campaign in ad manager", bucket: "backlog", priority: "high", estimated_minutes: 90 },
    { title: "[PHASE 4] QA & Review", description: "Review tracking, links, and budget config", bucket: "backlog", priority: "high", estimated_minutes: 45 },
    { title: "[PHASE 5] Launch", description: "Publish campaign", bucket: "backlog", priority: "high", estimated_minutes: 15 }
  ],
  update: [
    { title: "[PHASE 1] Scope Review", description: "Review requested updates", bucket: "backlog", priority: "high", estimated_minutes: 30 },
    { title: "[PHASE 2] Code/Design adjustments", description: "Implement changes", bucket: "backlog", priority: "high", estimated_minutes: 90 },
    { title: "[PHASE 3] QA & Test", description: "Verify update did not break existing features", bucket: "backlog", priority: "high", estimated_minutes: 45 },
    { title: "[PHASE 4] Publish", description: "Deploy updates", bucket: "backlog", priority: "high", estimated_minutes: 15 }
  ]
};
