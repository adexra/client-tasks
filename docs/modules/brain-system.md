# Brain System — Operator OS

Last updated: 2026-06-21

## Purpose
Multi-agent AI briefing studio. Accepts a client briefing text, extracts structured JSON, runs parallel specialist agents (Web Dev, Copywriter, SEO, UX, Brain), and retrieves relevant context from memory buckets and RAG documents.

## Entry Points
- `/agents` → `src/pages/Agents.jsx` — list and create AI agents
- `/agents/:id` → `src/pages/AgentEditor.jsx` — edit agent system prompt and test chat
- `/memory` → `src/pages/Memory.jsx` — named memory buckets (brand voice, niche, SEO rules, etc.)
- `/rag` → `src/pages/RAG.jsx` — document library with vector embeddings for semantic search
- `/briefing/:clientId` → `src/pages/Briefing.jsx` — the main multi-agent briefing session

## Key Files
| File | Responsibility |
|---|---|
| `src/pages/Briefing.jsx` | Main orchestrator: extraction → parallel agents → synthesis |
| `src/pages/Agents.jsx` | Agent list and create |
| `src/pages/AgentEditor.jsx` | Edit system prompt, test chat |
| `src/pages/Memory.jsx` | CRUD for memory buckets |
| `src/pages/RAG.jsx` | CRUD for RAG docs + embedding pipeline |
| `src/lib/azure.js` | Azure OpenAI wrappers: chatCompletion, chatStream, getEmbedding, cosineSimilarity |

## Tables Used
- `brain_agents` — agent definitions (name, role, system_prompt, model, color, icon)
- `brain_memory` — memory buckets by type (brand, niche, seo, technical, client, general)
- `brain_rag` — documents with chunks and embeddings stored as JSONB
- `brain_sessions` — one session per client briefing (links to client, stores extracted JSON)
- `brain_messages` — streamed messages per session (role, agent_id, content, tokens)

## AI Flow
1. User pastes briefing text
2. `chatCompletion(gpt-4o)` → extracts structured JSON from briefing
3. User selects memory buckets + RAG docs for context
4. RAG retrieval: `getEmbedding(query)` → `cosineSimilarity(query, chunk)` → top-K chunks
5. Parallel `chatStream(gpt-4o-mini)` calls for each specialist agent
6. Brain agent synthesizes final strategy markdown
7. All messages stored in `brain_messages`

## External Dependencies
- Azure OpenAI: gpt-4o (extraction + synthesis), gpt-4o-mini (agent responses), text-embedding-ada-002 (RAG)
- All called directly from client — key in `VITE_AZURE_OPENAI_KEY` (see ADR-002 and ISSUE-007)

## Known Gotchas
- RAG embeddings are stored as JSONB in `brain_rag.chunks` — not using pgvector. Similarity computed client-side with `cosineSimilarity()`. Works for small doc sets; will slow down with 100+ docs.
- Streaming responses use `chatStream` with `onChunk` callback — messages are assembled incrementally in React state.
- 5 default agents are seeded by `brain_migration.sql`: Brain, Web Dev, Copywriter, SEO Strategist, UX Designer.
