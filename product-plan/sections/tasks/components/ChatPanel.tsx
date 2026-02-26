import { useState, useRef, useCallback, useEffect } from 'react'
import { GripHorizontal, Send, MessageSquare } from 'lucide-react'
import type { ChatMessage } from '../types'

interface ChatPanelProps {
  messages: ChatMessage[]
  taskCount: number
  onSend?: (message: string) => void
}

const MIN_HEIGHT = 48
const DEFAULT_EXPANDED = 320
const MAX_HEIGHT = 600

export function ChatPanel({ messages, taskCount, onSend }: ChatPanelProps) {
  const [height, setHeight] = useState(MIN_HEIGHT)
  const [input, setInput] = useState('')
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isCollapsed = height <= MIN_HEIGHT

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startHeight: height }

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = dragRef.current.startY - ev.clientY
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragRef.current.startHeight + delta))
      setHeight(newHeight)
    }

    const handleMouseUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [height])

  const toggleExpand = () => {
    setHeight(isCollapsed ? DEFAULT_EXPANDED : MIN_HEIGHT)
  }

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    onSend?.(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div
      className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0"
      style={{ height }}
    >
      {/* Drag handle — always visible at top */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-center h-2.5 cursor-ns-resize group shrink-0"
      >
        <GripHorizontal className="size-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 dark:group-hover:text-zinc-500 transition-colors" strokeWidth={1.5} />
      </div>

      {isCollapsed ? (
        /* Collapsed bar */
        <button
          type="button"
          onClick={toggleExpand}
          className="flex items-center gap-3 flex-1 px-5 pb-1 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <MessageSquare className="size-4 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
          <span className="text-sm text-zinc-400 dark:text-zinc-500">
            Ask about these tasks...
          </span>
          <span
            className="text-[11px] text-zinc-300 dark:text-zinc-600 tabular-nums ml-auto"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Discussing {taskCount} tasks
          </span>
        </button>
      ) : (
        /* Expanded panel */
        <div className="flex flex-col flex-1 min-h-0">
          {/* Context indicator */}
          <div className="flex items-center gap-2 px-5 py-2 border-b border-zinc-100 dark:border-zinc-800/50 shrink-0">
            <MessageSquare className="size-3.5 text-sky-500 dark:text-sky-400" strokeWidth={1.5} />
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              Discussing{' '}
              <span
                className="text-sky-600 dark:text-sky-400 font-medium tabular-nums"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {taskCount}
              </span>
              {' '}filtered tasks
            </span>
            <button
              onClick={toggleExpand}
              className="ml-auto text-[11px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              Collapse
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-zinc-300 dark:text-zinc-600">
                  Ask a question about the tasks in view
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-sky-500 dark:bg-sky-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/50 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about these tasks..."
                rows={1}
                className="flex-1 px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors resize-none"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-2.5 rounded-lg bg-sky-500 dark:bg-sky-600 text-white hover:bg-sky-600 dark:hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
