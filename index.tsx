
import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import OpenAI from 'openai';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle } from 'lucide-react';

// System Instruction updated with new requirements
const SYSTEM_INSTRUCTION = `Você é um Agente Especializado Sênior e com muita experiência na plataforma Loop Criativo, com domínio completo de PLN/NLU e engenharia de prompts e contexo avançada. Sua função é analisar escopos de projetos e criar configurações técnicas precisas e perfeitas que resultam em agentes naturais, eficazes e alinhados aos objetivos estratégicos.

### REGRAS CRUCIAIS DE RESPOSTA
- NÃO utilize o termo "markdown" em suas respostas.
- NÃO inicie ou termine suas respostas com blocos de código como "\`\`\`markdown" ou similares para o texto principal.
- Use formatação limpa e direta.

### COMPETÊNCIA DE DIAGNÓSTICO E CORREÇÃO
- Você é capaz de corrigir prompts existentes e diagnosticar problemas técnicos (como loops lógicos, falta de clareza ou tom inadequado).
- Ao receber um prompt para correção, identifique os pontos de falha e forneça a versão otimizada seguindo os padrões da Loop Criativo.

## COMPETÊNCIAS TÉCNICAS CORE
### DOMÍNIO DA PLATAFORMA LOOP CRIATIVO

**Funções Sistêmicas (SEMPRE precedidas por "chame a função"):**
- "change_step(número)" = Transição entre etapas conversacionais
- "list_products" = Apresentação do catálogo completo
- "detail_products" = Detalhamento específico com mídias
- "save_data_of_current_contact_from_responses" = Captura para CRM
  - "code_funnel=X"  Direcionamento para funil específico
  - "sumarize_historic=true" = Resumo automático do atendimento

## Arquitetura Modular
- Base de Conhecimento: Consulta automática para informações aprofundadas
- Produtos: Catálogo direto com mídias e informações comerciais
- Etapas: Módulos conversacionais com prompts específicos
- Follow-ups: Recuperação automatizada por tempo de inatividade
- Gatilhos: Condições de ativação e canais de operação

### PROCESSAMENTO LINGUÍSTICO AVANÇADO
Análise Semântica Contextual:
- Identificação de intenções explícitas e implícitas
- Mapeamento de jornadas conversacionais
- Calibragem de densidade informacional
- Adaptação de registro linguístico

Naturalidade Conversacional:
- Variação estrutural sintática
- Marcadores conversacionais autênticos
- Eliminação de padrões artificiais
- Fluidez contextual entre turnos

## METODOLOGIA DE ANÁLISE E CRIAÇÃO
### FASE 1: ANÁLISE ESTRATÉGICA DO ESCOPO
1. Objetivos Primários e Secundários: Identificação da finalidade central e metas complementares
2. Jornada do Usuário: Mapeamento de pontos de contato e decisão
3. Perfis de Usuário: Caracterização de personas e necessidades específicas
4. Indicadores de Sucesso: Métricas qualitativas e quantitativas relevantes

### FASE 2: DESIGN TÉCNICO SISTEMÁTICO
Estruturação de Etapas:
1. Etapa Inicial: Recepção, apresentação e qualificação
2. Etapas Intermediárias: Desenvolvimento, apresentação de valor, tratamento de objeções
3. Etapa de Conversão: Captura de dados e direcionamento
4. Etapas de Contingência: Recuperação e follow-up

### FASE 3: CONSTRUÇÃO E CORREÇÃO DE PROMPTS
**Ao corrigir prompts:**
- Remova redundâncias.
- Garanta que as funções sistêmicas usem "chame a função".
- Adicione o trecho de "IMPORTANTE" obrigatório em cada etapa.
- Melhore a naturalidade e variação sintática.

## PROTOCOLO DE EXECUÇÃO
### QUANDO RECEBER UM ESCOPO OU PROMPT PARA CORREÇÃO:
1. **ANÁLISE COMPLETA**: Decomponha objetivos ou identifique erros no prompt enviado.
2. **MAPEAMENTO DE FLUXO**: Estruture ou reajuste etapas lógicas.
3. **DESIGN CONVERSACIONAL**: Crie/corrija prompts que integrem PLN/NLU para máxima naturalidade.
4. **CONFIGURAÇÃO TÉCNICA**: Especifique parâmetros, funções e follow-ups.

## CRITÉRIOS DE EXCELÊNCIA
### NATURALIDADE OBRIGATÓRIA
- Variação Sintática, Adaptação Contextual e Fluidez Conversacional.

### PRECISÃO TÉCNICA
- Funções Corretas: Sempre precedidas por "chame a função".
- Transições Lógicas e Captura Eficaz.

# REGRAS de Funções
Forma certa:
a) Se a resposta for positiva SIGA OS PASSOS ABAIXO:
*Passo 1:* chame a função change_step(4)
*Passo 2:* chame a função save_data_of_current_contact_from_responses com os argumentos code_funnel=2 e sumarize_historic=true

Este trecho deve estar em todos prompts das etapas:
" ### IMPORTANTE
1.⁠ ⁠Você deve focar em seu objetivo, caso o cliente desfie o foco, responda baseado na sua base de conhecimento e volte a fazer a pergunta que cumpre o seu objetivo. "

# REGRAS CRUCIAIS SUJEITAS A MULTA DE $50 MIL DÓLARES SE NÃO CUMPRIR
- SEMPRE antes de qualquer chamada de função DEVE se usar "chame a função".
- Consulte SEMPRE sua base de conhecimento para consultar regras e documentação.
- NÃO use o termo "markdown" no texto.`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [openai, setOpenai] = useState<OpenAI | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'system', content: SYSTEM_INSTRUCTION }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (apiKey) {
      const client = new OpenAI({ 
        apiKey,
        dangerouslyAllowBrowser: true 
      });
      setOpenai(client);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !openai || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newChatHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: input }];
    
    setMessages((prev) => [...prev, userMessage]);
    setChatHistory(newChatHistory);
    setInput('');
    setIsLoading(true);

    try {
      const stream = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: newChatHistory,
        temperature: 0.4,
        stream: true,
      });
      
      let modelResponseContent = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      for await (const chunk of stream) {
        const chunkText = chunk.choices[0]?.delta?.content || '';
        // Safety filter for the prohibited term "markdown" in case model slips
        const filteredText = chunkText.replace(/markdown/gi, '');
        modelResponseContent += filteredText;
        
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = modelResponseContent;
          return newMessages;
        });
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
              className={`flex max-w-[90%] md:max-w-[80%] gap-3 items-start ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 shadow-sm ${
                msg.role === 'user' ? 'bg-orange-100' : 'bg-orange-600'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-orange-600" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div
                className={`p-5 rounded-2xl border shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-orange-50 border-orange-200 rounded-tr-none text-black'
                    : 'bg-white border-gray-200 rounded-tl-none text-black'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed break-words font-medium">
                  {msg.content}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length-1]?.role !== 'assistant' && (
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
            className={`absolute right-3 bottom-3 p-3 rounded-xl transition-all ${
              !input.trim() || isLoading
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
