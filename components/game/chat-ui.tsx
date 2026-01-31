'use client'

import { useEffect, useRef, useState } from 'react'
import { ChatMessage } from '@/game/entities/chatProximityManager'

interface ChatUiProps {
  chatId: string | null
  messages: ChatMessage[]
  members: string[]
  nearbyCount: number
  onSendMessage: (content: string) => void
  onClose: () => void
  displayNames: Map<string, string>
  currentUserId: string
}

export function ChatUi({
  chatId,
  messages,
  members,
  nearbyCount,
  onSendMessage,
  onClose,
  displayNames,
  currentUserId,
}: ChatUiProps) {
  const [inputValue, setInputValue] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && !isCollapsed) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isCollapsed])

  const handleSend = () => {
    const trimmed = inputValue.trim()
    if (trimmed && chatId) {
      onSendMessage(trimmed)
      setInputValue('')
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // No one nearby: Hidden
  if (nearbyCount === 0) {
    return null
  }

  // 1+ players nearby, no chat yet: Show connecting indicator
  // (Chat should auto-create when 1+ other player is within range)
  if (nearbyCount >= 1 && !chatId) {
    return (
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
        <div
          className="bg-midnight/90 border-2 border-teal text-text-inverse px-4 py-2 rounded-lg text-sm"
          style={{
            fontFamily: 'monospace',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          {nearbyCount === 1 ? '1 player nearby' : `${nearbyCount} players nearby`} - Starting chat...
        </div>
      </div>
    )
  }

  // In chat: Show full chat interface
  if (!chatId) {
    return null
  }

  return (
    <div
      className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 transition-all duration-300 ${
        isCollapsed ? 'w-64' : 'w-96'
      }`}
    >
      <div
        className="bg-midnight/95 border-2 border-teal rounded-lg shadow-xl overflow-hidden"
        style={{
          fontFamily: 'monospace',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
          borderStyle: 'double',
        }}
      >
        {/* Header */}
        <div
          className="bg-teal/20 border-b-2 border-teal/50 px-4 py-2 flex items-center justify-between cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-2">
            <span className="text-cream font-bold text-sm">💬 Chat</span>
            <span className="text-cream/70 text-xs">
              ({members.length} {members.length === 1 ? 'member' : 'members'})
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsCollapsed(!isCollapsed)
            }}
            className="text-cream hover:text-accent transition-colors"
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>

        {!isCollapsed && (
          <>
            {/* Messages */}
            <div className="h-64 overflow-y-auto p-3 space-y-2 bg-midnight/50">
              {messages.length === 0 ? (
                <div className="text-cream/70 text-xs text-center py-8 italic">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => {
                  const displayName = displayNames.get(msg.userId) || 'Unknown'
                  const isOwn = msg.userId === currentUserId
                  return (
                    <div
                      key={msg.id}
                      className={`text-xs ${
                        isOwn ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`inline-block max-w-[80%] rounded px-2 py-1 ${
                          isOwn
                            ? 'bg-accent/30 text-cream'
                            : 'bg-teal/20 text-cream/90'
                        }`}
                      >
                        {!isOwn && (
                          <div className="font-semibold text-cream text-[10px] mb-1">
                            {displayName}
                          </div>
                        )}
                        <div className="wrap-break-word">{msg.content}</div>
                        <div className="text-[10px] text-cream/50 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t-2 border-teal/50 p-2 bg-midnight/80">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  maxLength={500}
                  className="flex-1 bg-midnight border-2 border-teal/50 text-cream px-3 py-2 rounded text-sm focus:outline-none focus:border-teal"
                  style={{
                    fontFamily: 'monospace',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:bg-teal/30 disabled:cursor-not-allowed text-text-inverse font-bold rounded transition-all duration-150 active:scale-95 border-2 border-accent/50"
                  style={{
                    textShadow: '1px 1px 0px rgba(0, 0, 0, 0.3)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  Send
                </button>
              </div>
              <div className="text-[10px] text-cream/50 mt-1 text-right">
                {inputValue.length}/500
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
