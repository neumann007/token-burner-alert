An enterprise-grade VS Code extension and SaaS backend designed to prevent "Context Bloat" in AI-assisted coding by providing real-time token calculation and context management.

🏗️ Architecture
This project is structured as a Monorepo containing:

The Edge Agent (packages/extension): A lightweight, high-performance VS Code extension written in strict TypeScript. It uses a WASM-compiled js-tiktoken WebWorker to calculate tokens on keystrokes without blocking the editor UI.

The Analytics Brain (backend): A Django/PostgreSQL SaaS backend that ingests privacy-first telemetry (hashed paths, token counts) to provide team-wide insights into wasted API costs.

Shared Contracts (packages/shared): Strict data interfaces bridging the extension and the backend.

## 🗺️ Project Roadmap
Phase 1: Local MVP (Core Engine & UX) - [Completed]
[x] Initialize Monorepo and Git branching strategy.

[x] Build WASM WebWorker (js-tiktoken) for non-blocking token counting.

[x] Wire WebWorker to VS Code typing events with debounce.

[x] Build Status Bar UI (Safe/Warning/Critical thresholds).

[x] Implement Scrollbar Heatmap (Overview Ruler) for token-heavy lines.

Phase 2: Context Management (.tokenignore) - [In Progress]
[ ] Parse .tokenignore files using glob matching.

[ ] Implement inline block exclusions (// tokenignore:begin).

[ ] Provide "Tokens Saved" calculation.

Phase 3: SaaS Backend (Telemetry) - [Planned]
[ ] Scaffold Django/PostgreSQL backend via Docker Compose.

[ ] Build privacy-first telemetry ingestion API.

[ ] Implement background sync from VS Code extension to Django.

Phase 4: CI/CD & Dashboard - [Planned]
[ ] Build Django Webview/Dashboard for team analytics.

[ ] Set up GitHub Actions for extension publishing.

[ ] Set up GitHub Actions for backend testing.

🚀 Development Setup
(Instructions to be added as infrastructure evolves)
