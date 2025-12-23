
import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Send, Bot, User, Loader2, Sparkles, Copy, Check } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Componente para blocos copiáveis
const CopyableBlock: React.FC<{ title: string; content: string }> = ({ title, content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{title}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-all"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-500">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 text-sm whitespace-pre-wrap font-mono text-gray-800 bg-white">
        {content}
      </div>
    </div>
  );
};

// Função para parsear conteúdo em blocos
const parseContentBlocks = (content: string) => {
  // Regex para encontrar blocos delimitados por [BLOCO: título] ... [/BLOCO]
  const blockRegex = /\[BLOCO:\s*([^\]]+)\]([\s\S]*?)\[\/BLOCO\]/g;
  const parts: Array<{ type: 'text' | 'block'; content: string; title?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    // Adiciona texto antes do bloco
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim();
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }

    // Adiciona o bloco
    parts.push({
      type: 'block',
      title: match[1].trim(),
      content: match[2].trim()
    });

    lastIndex = match.index + match[0].length;
  }

  // Adiciona texto restante após o último bloco
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) {
      parts.push({ type: 'text', content: remaining });
    }
  }

  // Se não encontrou nenhum bloco, retorna o conteúdo original
  if (parts.length === 0) {
    return [{ type: 'text' as const, content }];
  }

  return parts;
};

// Componente para renderizar mensagem com blocos
const MessageContent: React.FC<{ content: string }> = ({ content }) => {
  const parts = parseContentBlocks(content);

  return (
    <div>
      {parts.map((part, idx) => (
        part.type === 'block' ? (
          <CopyableBlock key={idx} title={part.title || ''} content={part.content} />
        ) : (
          <div key={idx} className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed break-words font-medium">
            {part.content}
          </div>
        )
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newChatHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: input }];

    setMessages((prev) => [...prev, userMessage]);
    setChatHistory(newChatHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newChatHistory }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let modelResponseContent = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const filteredText = parsed.text?.replace(/markdown/gi, '') || '';
                modelResponseContent += filteredText;

                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = modelResponseContent;
                  return newMessages;
                });
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }

      // Add assistant response to chat history
      setChatHistory((prev) => [...prev, { role: 'assistant', content: modelResponseContent }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Erro técnico no processamento NLU. Verifique a conexão e tente novamente.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans text-black overflow-hidden">
      {/* Header */}
      <header className="bg-orange-600 text-white p-4 shadow-md flex items-center justify-between border-b border-orange-700">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-lg">
            <Sparkles className="text-orange-600 w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight uppercase tracking-tight">Loop Criativo</h1>
            <p className="text-xs text-orange-100 font-medium">Sênior NLU & Prompt Engineer</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold bg-orange-700 px-3 py-1.5 rounded-md text-orange-100 uppercase tracking-widest border border-orange-500/30">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Sistema Ativo
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 bg-[radial-gradient(#f3f4f6_1px,transparent_1px)] [background-size:20px_20px]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="bg-white p-10 rounded-full border border-orange-100 shadow-xl shadow-orange-100/50">
              <Bot className="w-16 h-16 text-orange-500" />
            </div>
            <div className="max-w-md px-4">
              <h2 className="text-2xl font-black text-black mb-3">Central de Engenharia</h2>
              <p className="text-gray-500 font-medium">
                Envie um escopo para criação ou um prompt existente para análise e correção técnica.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg text-[11px] font-bold text-orange-700 uppercase">
                  Análise de Escopo
                </div>
                <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg text-[11px] font-bold text-orange-700 uppercase">
                  Correção de Prompts
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[90%] md:max-w-[85%] gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
            >
              <div className={`p-2 rounded-lg shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-orange-100' : 'bg-orange-600'
                }`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-orange-600" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div
                className={`p-5 rounded-2xl border shadow-sm ${msg.role === 'user'
                  ? 'bg-orange-50 border-orange-200 rounded-tr-none text-black'
                  : 'bg-white border-gray-200 rounded-tl-none text-black'
                  }`}
              >
                {msg.role === 'assistant' ? (
                  <MessageContent content={msg.content} />
                ) : (
                  <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed break-words font-medium">
                    {msg.content}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start items-center gap-3 text-orange-600 animate-pulse ml-2">
            <div className="bg-orange-600 p-2 rounded-lg">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Executando Processamento NLU...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <div className="p-5 border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto flex gap-3 relative items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Cole o prompt aqui para correção ou descreva o novo escopo..."
            className="flex-1 bg-gray-50 border border-gray-200 text-black p-4 pr-16 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all resize-none shadow-inner min-h-[60px] max-h-[300px] font-medium"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`absolute right-3 bottom-3 p-3 rounded-xl transition-all ${!input.trim() || isLoading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95 shadow-lg shadow-orange-200'
              }`}
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
          </button>
        </div>
        <div className="mt-3 flex justify-between items-center px-2">
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
            Loop Criativo Engine v4.1 | GPT-4.1-mini
          </p>
          <div className="flex gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
