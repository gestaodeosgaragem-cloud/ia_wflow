import { useState, useEffect } from 'react'
import './App.css'

// Em desenvolvimento usa proxy, em produção usa URL direta
const WEBHOOK_URL = import.meta.env.DEV
    ? '/api/webhook/ia-whatsapp-flow'
    : 'https://webhook.garagem.dev.br/webhook/ia-whatsapp-flow'

const STORAGE_KEY = 'ia_prompt_flow_responses'
const SESSION_KEY = 'ia_prompt_flow_session'
const MAX_RESPONSES = 50
const MAX_AGE_DAYS = 14

// Gerenciamento de sessionId via cookie
const getSessionId = () => {
    let sessionId = localStorage.getItem(SESSION_KEY)
    if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
        localStorage.setItem(SESSION_KEY, sessionId)
    }
    return sessionId
}

// Gerenciamento de respostas salvas
const getStoredResponses = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return []

        const responses = JSON.parse(stored)
        const now = Date.now()
        const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000

        // Filtrar respostas antigas (> 2 semanas)
        const valid = responses.filter(r => (now - r.timestamp) < maxAge)

        // Limitar a 50 respostas
        const limited = valid.slice(-MAX_RESPONSES)

        // Salvar lista limpa
        if (limited.length !== responses.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(limited))
        }

        return limited
    } catch {
        return []
    }
}

const saveResponse = (prompt, response) => {
    const responses = getStoredResponses()
    const newEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
        timestamp: Date.now(),
        prompt,
        response
    }
    responses.push(newEntry)

    // Limitar a 50
    const limited = responses.slice(-MAX_RESPONSES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited))

    return limited
}

function App() {
    const [prompt, setPrompt] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [copied, setCopied] = useState(false)
    const [responses, setResponses] = useState([])
    const [currentIndex, setCurrentIndex] = useState(-1) // -1 = new, ou índice da resposta

    const sessionId = getSessionId()

    // Carregar respostas salvas ao iniciar
    useEffect(() => {
        const stored = getStoredResponses()
        setResponses(stored)
        if (stored.length > 0) {
            setCurrentIndex(stored.length - 1) // Última resposta
        }
    }, [])

    const currentResponse = currentIndex >= 0 && currentIndex < responses.length
        ? responses[currentIndex]
        : null

    const handleSubmit = async () => {
        if (!prompt.trim()) return

        setLoading(true)
        setError(null)

        // Determinar contexto
        const context = currentResponse ? currentResponse.response : 'new'

        try {
            const res = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    sessionId,
                    context
                }),
            })

            if (!res.ok) {
                throw new Error(`Erro ${res.status}: ${res.statusText}`)
            }

            const data = await res.json()
            const item = Array.isArray(data) ? data[0] : data

            // Verificar se resposta é válida
            if (!item || (!item['json-whatsapp-flow'] && !item.descripiton)) {
                throw new Error('Resposta inválida do servidor')
            }

            // Salvar resposta
            const updated = saveResponse(prompt.trim(), item)
            setResponses(updated)
            setCurrentIndex(updated.length - 1)
            setPrompt('')
        } catch (err) {
            setError(err.message || 'Erro ao processar a requisição')
        } finally {
            setLoading(false)
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1)
        }
    }

    const handleNext = () => {
        if (currentIndex < responses.length - 1) {
            setCurrentIndex(currentIndex + 1)
        }
    }

    const handleNewContext = () => {
        setCurrentIndex(-1)
    }

    const handleCopy = async () => {
        if (!currentResponse?.response?.['json-whatsapp-flow']) return

        try {
            const jsonData = currentResponse.response['json-whatsapp-flow']
            const textToCopy = typeof jsonData === 'string'
                ? jsonData
                : JSON.stringify(jsonData, null, 2)

            await navigator.clipboard.writeText(textToCopy)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Erro ao copiar:', err)
        }
    }

    const handleSave = () => {
        if (!currentResponse?.response) return

        const resp = currentResponse.response

        if (resp['json-whatsapp-flow']) {
            const jsonData = resp['json-whatsapp-flow']
            const jsonString = typeof jsonData === 'string'
                ? jsonData
                : JSON.stringify(jsonData, null, 2)

            const jsonBlob = new Blob([jsonString], { type: 'application/json' })
            const jsonUrl = URL.createObjectURL(jsonBlob)
            const jsonLink = document.createElement('a')
            jsonLink.href = jsonUrl
            jsonLink.download = 'whatsapp-flow.json'
            jsonLink.click()
            URL.revokeObjectURL(jsonUrl)
        }

        if (resp.descripiton) {
            const txtBlob = new Blob([resp.descripiton], { type: 'text/plain' })
            const txtUrl = URL.createObjectURL(txtBlob)
            const txtLink = document.createElement('a')
            txtLink.href = txtUrl
            txtLink.download = 'descricao.txt'
            setTimeout(() => {
                txtLink.click()
                URL.revokeObjectURL(txtUrl)
            }, 100)
        }
    }

    const formatJson = (data) => {
        if (typeof data === 'string') {
            try {
                return JSON.stringify(JSON.parse(data), null, 2)
            } catch {
                return data
            }
        }
        return JSON.stringify(data, null, 2)
    }

    return (
        <div className="app">
            <header className="app__header">
                <div className="app__logo">
                    <span className="app__logo-icon">🤖</span>
                    <h1>IA Prompt to Flow</h1>
                </div>
                <p className="app__subtitle">Transforme seu prompt em um WhatsApp Flow JSON</p>
            </header>

            {/* Navegação de versões */}
            {responses.length > 0 && (
                <nav className="version-nav">
                    <button
                        className="version-nav__btn"
                        onClick={handlePrev}
                        disabled={currentIndex <= 0}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <span className="version-nav__info">
                        {currentIndex >= 0
                            ? `Versão ${currentIndex + 1} de ${responses.length}`
                            : 'Novo contexto'
                        }
                    </span>
                    <button
                        className="version-nav__btn"
                        onClick={handleNext}
                        disabled={currentIndex >= responses.length - 1}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                    {currentIndex >= 0 && (
                        <button className="version-nav__new" onClick={handleNewContext}>
                            + Novo
                        </button>
                    )}
                </nav>
            )}

            <main className="app__main">
                {/* Coluna da esquerda - Prompt */}
                <section className="prompt-section">
                    <label htmlFor="prompt" className="prompt-label">
                        Digite seu prompt
                    </label>
                    <textarea
                        id="prompt"
                        className="prompt-textarea"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Descreva o fluxo de WhatsApp que você deseja criar..."
                        rows={6}
                        disabled={loading}
                    />
                    <div className="prompt-context">
                        <span>Contexto: </span>
                        <strong>{currentResponse ? `Versão ${currentIndex + 1}` : 'Novo'}</strong>
                    </div>
                    <button
                        className="submit-button"
                        onClick={handleSubmit}
                        disabled={loading || !prompt.trim()}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Processando...
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
                                </svg>
                                Gerar Flow
                            </>
                        )}
                    </button>

                    {error && (
                        <div className="error-message">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                            {error}
                        </div>
                    )}
                </section>

                {/* Coluna da direita - Resposta */}
                <section className="response-section">
                    {currentResponse ? (
                        <>
                            {currentResponse.response.descripiton && (
                                <div className="description-block">
                                    <h3>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="16" x2="12" y2="12" />
                                            <line x1="12" y1="8" x2="12.01" y2="8" />
                                        </svg>
                                        Descrição
                                    </h3>
                                    <p>{currentResponse.response.descripiton}</p>
                                </div>
                            )}

                            {currentResponse.response['json-whatsapp-flow'] && (
                                <div className="json-block">
                                    <div className="json-header">
                                        <h3>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="16 18 22 12 16 6" />
                                                <polyline points="8 6 2 12 8 18" />
                                            </svg>
                                            JSON WhatsApp Flow
                                        </h3>
                                        <button className="copy-button" onClick={handleCopy}>
                                            {copied ? (
                                                <>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                    Copiado!
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                                    </svg>
                                                    Copiar
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <pre className="json-content">
                                        <code>{formatJson(currentResponse.response['json-whatsapp-flow'])}</code>
                                    </pre>
                                </div>
                            )}

                            <button className="save-button" onClick={handleSave}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Salvar Arquivos
                            </button>

                            <div className="response-meta">
                                <small>Prompt: "{currentResponse.prompt}"</small>
                                <small>{new Date(currentResponse.timestamp).toLocaleString('pt-BR')}</small>
                            </div>
                        </>
                    ) : (
                        <div className="response-empty">
                            <div className="response-empty__icon">💬</div>
                            <p>Envie um prompt para gerar seu WhatsApp Flow</p>
                            <small>As respostas aparecerão aqui</small>
                        </div>
                    )}
                </section>
            </main>

            <footer className="app__footer">
                <p>COGFY × Garagem</p>
            </footer>
        </div>
    )
}

export default App
