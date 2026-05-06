// Azure OpenAI client — direct browser calls
// Models: gpt-4o (brain/complex), gpt-4o-mini (specialist agents)

const KEY = import.meta.env.VITE_AZURE_OPENAI_KEY
const EP_4O = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT_GPT4O
const EP_MINI = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT_GPT4O_MINI
const EP_EMBED = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT_EMBEDDINGS

export async function chatCompletion({ model = 'gpt-4o-mini', messages, temperature = 0.7, max_tokens = 2000 }) {
  const endpoint = model === 'gpt-4o' ? EP_4O : EP_MINI
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': KEY },
    body: JSON.stringify({ messages, temperature, max_tokens }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Azure OpenAI error: ${res.status} — ${err}`)
  }
  const data = await res.json()
  return {
    content: data.choices[0].message.content,
    tokens: data.usage?.total_tokens ?? 0,
  }
}

// Streaming version — calls onChunk(text) incrementally, returns full text
export async function chatStream({ model = 'gpt-4o-mini', messages, temperature = 0.7, max_tokens = 2000, onChunk }) {
  const endpoint = model === 'gpt-4o' ? EP_4O : EP_MINI
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': KEY },
    body: JSON.stringify({ messages, temperature, max_tokens, stream: true }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Azure OpenAI error: ${res.status} — ${err}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(l => l.startsWith('data: ') && l !== 'data: [DONE]')
    for (const line of lines) {
      try {
        const json = JSON.parse(line.slice(6))
        const delta = json.choices?.[0]?.delta?.content ?? ''
        if (delta) { full += delta; onChunk?.(delta) }
      } catch {}
    }
  }
  return full
}

export async function getEmbedding(text) {
  const res = await fetch(EP_EMBED, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': KEY },
    body: JSON.stringify({ input: text }),
  })
  if (!res.ok) throw new Error(`Embedding error: ${res.status}`)
  const data = await res.json()
  return data.data[0].embedding
}

export function cosineSimilarity(a, b) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0)
  const ma = Math.sqrt(a.reduce((s, v) => s + v * v, 0))
  const mb = Math.sqrt(b.reduce((s, v) => s + v * v, 0))
  return dot / (ma * mb)
}
