# Antigravity Skills Library

Welcome to the **Antigravity Skills Library** for the Reelator project. This directory contains a powerful collection of specialized skills designed to enable expert-level automation across video production, design, copywriting, and technical development.

## 🚀 Overview

These skills are categorized into two types:
1.  **Workflow Skills (Directories)**: Comprehensive instruction sets (`SKILL.md`) that guide the AI through complex multi-step processes.
2.  **Functional Utilities (Files)**: Core TypeScript implementations that handle the low-level heavy lifting like video rendering, transcription, and AI generation.

---

## 🛠️ Workflow Skills

| Skill | Purpose | When to Use |
| :--- | :--- | :--- |
| **[Algorithmic Art](./algorithmic-art)** | p5.js generative art creation. | When users request original generative art, flow fields, or interactive mathematical visualizations based on a custom philosophy. |
| **[Brand Guidelines](./brand-guidelines)** | Adexra's dark UI brand system. | To ensure every UI, asset, or document follows the high-contrast technical aesthetic and performance-driven design of Adexra. |
| **[Build Reels](./build-reels)** | 3-Phase short-form video optimization. | When the user needs advice on shooting (4K/60fps), export settings (1080p), or platform-specific upload quality and SEO. |
| **[Canvas Design](./canvas-design)** | Museum-quality static art (.png/.pdf). | To create posters, philosophy-based abstract art, or high-end static designs with a 90% visual / 10% text rule. |
| **[Cybersecurity](./cybersecurity)** | Trifecta security auditing & architecture. | When discussing AppSec/LGPD, Zero Trust infrastructure, or AI "vibe coding" security and OWASP compliance. |
| **[Descriptions](./descriptions)** | 3-Zone Instagram caption generation. | To generate captions with a strong hook continuation, value-driven body, and clear CTA, strictly avoiding "AI slop" phrases. |
| **[DOCX](./docx)** | Professional Word document engineering. | For creating, editing, or analyzing Word documents using XML manipulation or docx-js with advanced formatting. |
| **[Dynamic Video Editor](./dynamic-video-editor)** | Retention-focused "Anti-Static" editing. | To plan J-cuts/L-cuts, punch-ins, and soundscape layering (SFX/Music) to maximize viewer retention for YouTube/Shorts. |
| **[Frontend Design](./frontend-design)** | Distinctive, non-AI web UI/UX. | When building React components or landing pages that need a bold aesthetic (Minimalist, Maximalist, etc.) and oklch/hsl mesh gradients. |
| **[Viral Hooks](./hooks)** | Psychology-backed 2-6 word openers. | To craft "scroll-stopping" first seconds using Curiosity Gaps, Pattern Interrupts, or Specific Claims. |
| **[MCP Builder](./mcp-builder)** | 4-Phase MCP server development. | When building new Model Context Protocol servers integrating external APIs using TypeScript/Node or Python. |
| **[PDF](./pdf)** | Advanced PDF processing and manipulation. | For merging, splitting, OCR-ing scanned files, or creating complex reports with ReportLab and pdfplumber. |
| **[Skill Creator](./skill-creator)** | Iterative Antigravity skill development. | When you need to create, test via the eval-viewer loop, or optimize *new* skills for this library. |
| **[Theme Factory](./theme-factory)** | Visual theme orchestration (10+ Presets). | To apply consistent color and font palettes from a curated collection or generate a new theme on-the-fly. |
| **[Webapp Testing](./webapp-testing)** | Playwright-powered UI verification. | When you need to verify local web applications using the "Reconnaissance-Then-Action" pattern to discover selectors dynamically. |
| **[XLSX](./xlsx)** | Financial modeling and tabular data processing. | For building clean, formula-based Excel files with industry-standard color coding and pandas-based data analysis. |

---

## ⚙️ Functional Utilities

These standalone files represent the core engine of the Reelator automation pipeline:

-   **`ai_copywriter.ts`**: Connects to Azure OpenAI to execute psychological hook generation and 3-zone caption strategies.
-   **`audio_transcriber.ts`**: Uses OpenAI Whisper for word-level timestamping required for dynamic caption overlays.
-   **`ffmpeg_editor.ts`**: The core video engine handling cutting, precise scaling to 1080x1920, and complex compositing.
-   **`library_manager.ts`**: Manages the local workspace, job lifecycle, and metadata persistence for all automated runs.
-   **`overlay_renderer.ts`**: A high-performance Node-canvas implementation that renders the visually striking hook overlays.

---

## 🎨 Design Philosophy

A common thread across all "Creative" skills (**Algorithmic Art**, **Canvas Design**, **Frontend Design**) is the emphasis on **Extreme Craftsmanship**. 

> [!IMPORTANT]
> These skills are designed to produce work that looks like it took **countless hours of human labor**. Avoid generic "AI aesthetics"—prioritize asymmetric layouts, distinctive typography, and intentional color theory.

---

## 📝 How to Add a New Skill

If you need to extend this library:
1. Use the **[Skill Creator](./skill-creator)** workflow.
2. Create a new subdirectory.
3. Add a `SKILL.md` file with names and descriptions in the YAML frontmatter.
4. (Optional) Add a `scripts/` folder for binary/heavy utility scripts.

| **[SEO](./seo)** | Generated Skill | Created via Skill Builder Dashboard |

| **[Cat food ](./cat-food-)** | Generated Skill | Created via Skill Builder Dashboard |

| **[Mobile-1st](./mobile-1st)** | Generated Skill | Created via Skill Builder Dashboard |

| **[Google Ads Auditor](./google-ads-auditor)** | Generated Skill | Created via Skill Builder Dashboard |
