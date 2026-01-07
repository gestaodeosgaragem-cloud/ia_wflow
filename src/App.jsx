import { useState } from 'react'
import './App.css'

const WEBHOOK_URL = '/api/webhook/ia-whatsapp-flow'

function App() {
    const [prompt, setPrompt] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [copied, setCopied] = useState(false)

    const handleSubmit = async () => {
        if (!prompt.trim()) return

        setLoading(true)
        setError(null)
        setResult(null)
        setCopied(false)

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: prompt.trim() }),
            })

            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`)
            }

            const data = await response.json()
            // O retorno é um array, pega o primeiro item
            const item = Array.isArray(data) ? data[0] : data
            setResult(item)
        } catch (err) {
            setError(err.message || 'Erro ao processar a requisição')
        } finally {
            setLoading(false)
        }
    }

    const handleNewMessage = () => {
        setPrompt('')
        setResult(null)
        setError(null)
        setCopied(false)
    }

    const handleCopy = async () => {
        if (!result?.['json-whatsapp-flow']) return

        try {
            const jsonData = result['json-whatsapp-flow']
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
        if (!result) return

        // Salvar JSON
        if (result['json-whatsapp-flow']) {
            const jsonData = result['json-whatsapp-flow']
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

        // Salvar descrição como TXT
        if (result.descripiton) {
            const txtBlob = new Blob([result.descripiton], { type: 'text/plain' })
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

            <main className="app__main">
                {!result ? (
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
                    </section>
                ) : (
                    <section className="result-section">
                        {/* Descrição */}
                        {result.descripiton && (
                            <div className="description-block">
                                <h3>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="16" x2="12" y2="12" />
                                        <line x1="12" y1="8" x2="12.01" y2="8" />
                                    </svg>
                                    Descrição
                                </h3>
                                <p>{result.descripiton}</p>
                            </div>
                        )}

                        {/* JSON Block */}
                        {result['json-whatsapp-flow'] && (
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
                                    <code>{formatJson(result['json-whatsapp-flow'])}</code>
                                </pre>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="action-buttons">
                            <button className="new-button" onClick={handleNewMessage}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Nova Mensagem
                            </button>
                            <button className="save-button" onClick={handleSave}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Salvar Arquivos
                            </button>
                        </div>
                    </section>
                )}

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
            </main>

            <footer className="app__footer">
                <p>COGFY × Garagem</p>
            </footer>
        </div>
    )
}

export default App
