// Azure OpenAI — direct browser calls via Azure endpoints
const KEY = import.meta.env.VITE_AZURE_OPENAI_KEY
const EP_4O = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT_GPT4O
const EP_MINI = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT_GPT4O_MINI
const EP_EMBED = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT_EMBEDDINGS

export async function chatCompletion({ model = 'gpt-4o-mini', messages, temperature = 0.7, max_tokens = 2000 }) {
  const endpoint = model === 'gpt-4o' ? EP_4O : EP_MINI
  if (!endpoint || !KEY) throw new Error('Azure OpenAI not configured — check VITE_AZURE_OPENAI_KEY and endpoints in .env')
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': KEY },
    body: JSON.stringify({ messages, temperature, max_tokens }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Azure ${model} ${res.status}: ${err}`)
  }
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error(`Azure returned empty content. Full response: ${JSON.stringify(data)}`)
  return { content, tokens: data.usage?.total_tokens ?? 0 }
}

// Streaming — buffers partial SSE lines across read() calls to avoid split-line corruption
export async function chatStream({ model = 'gpt-4o-mini', messages, temperature = 0.7, max_tokens = 2000, onChunk }) {
  const endpoint = model === 'gpt-4o' ? EP_4O : EP_MINI
  if (!endpoint || !KEY) throw new Error('Azure OpenAI not configured — check VITE_AZURE_OPENAI_KEY and endpoints in .env')
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': KEY },
    body: JSON.stringify({ messages, temperature, max_tokens, stream: true }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Azure ${model} stream ${res.status}: ${err}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let buffer = '' // carries partial lines across read() boundaries

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // Split on newlines but keep the last incomplete line in the buffer
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? '' // last element may be incomplete
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta?.content ?? ''
        if (delta) { full += delta; onChunk?.(delta) }
      } catch {
        // malformed chunk — skip silently, content is not lost
      }
    }
  }
  // flush any remaining buffer
  if (buffer.trim().startsWith('data:')) {
    const payload = buffer.trim().slice(5).trim()
    if (payload && payload !== '[DONE]') {
      try {
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta?.content ?? ''
        if (delta) { full += delta; onChunk?.(delta) }
      } catch { /* malformed SSE chunk — skip */ }
    }
  }
  if (!full) throw new Error('Azure stream returned no content — the model may have refused or timed out')
  return full
}

export async function getEmbedding(text) {
  if (!EP_EMBED || !KEY) throw new Error('Azure embeddings endpoint not configured')
  const res = await fetch(EP_EMBED, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': KEY },
    body: JSON.stringify({ input: text }),
  })
  if (!res.ok) throw new Error(`Azure embeddings ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const embedding = data.data?.[0]?.embedding
  if (!embedding) throw new Error(`Azure embeddings returned no vector. Response: ${JSON.stringify(data)}`)
  return embedding
}

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0
  const dot = a.reduce((s, v, i) => s + v * b[i], 0)
  const ma = Math.sqrt(a.reduce((s, v) => s + v * v, 0))
  const mb = Math.sqrt(b.reduce((s, v) => s + v * v, 0))
  if (ma === 0 || mb === 0) return 0
  return dot / (ma * mb)
}
