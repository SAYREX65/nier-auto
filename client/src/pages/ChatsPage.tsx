import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../hooks/useAuth';
import './ChatsPage.css';

interface Message {
  id:          string;
  chat_id:     string;
  sender_id:   string;
  sender_name: string;
  text:        string;
  is_read:     number;
  created_at:  string;
}

interface Chat {
  id:              string;
  order_id:        string | null;
  buyer_id:        string;
  seller_id:       string;
  buyer_name:      string;
  seller_name:     string;
  total_amount:    number | null;
  last_message:    string | null;
  last_message_at: string | null;
  unread_count:    number;
}

export default function ChatsPage() {
  const { user }                    = useAuth();
  const [chats, setChats]           = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [text, setText]             = useState('');
  const [loading, setLoading]       = useState(true);
  const [sending, setSending]       = useState(false);
  const messagesEndRef              = useRef<HTMLDivElement>(null);
  const pollRef                     = useRef<ReturnType<typeof setInterval>>();
  const chatPollRef                 = useRef<ReturnType<typeof setInterval>>();

  const fetchChats = useCallback(() => {
    api.get('/chats').then(r => {
      setChats(r.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchChats();
    // Обновляем список чатов каждые 5 сек
    chatPollRef.current = setInterval(fetchChats, 5000);
    return () => clearInterval(chatPollRef.current);
  }, [fetchChats]);

  const fetchMessages = useCallback(() => {
    if (!activeChat) return;
    api.get(`/chats/${activeChat.id}/messages`).then(r => {
      setMessages(r.data);
      // После загрузки — сбрасываем unread в списке чатов
      setChats(prev =>
        prev.map(c => c.id === activeChat.id ? { ...c, unread_count: 0 } : c)
      );
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });
  }, [activeChat]);

  useEffect(() => {
    fetchMessages();
    clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  const handleSend = async () => {
    if (!text.trim() || !activeChat || sending) return;
    setSending(true);
    try {
      await api.post(`/chats/${activeChat.id}/messages`, { text });
      setText('');
      fetchMessages();
      fetchChats();
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getCompanion = (chat: Chat) =>
    user?.id === chat.buyer_id ? chat.seller_name : chat.buyer_name;

  if (loading) return <div className="page container">Загрузка...</div>;

  return (
    <div className="chats-page page">
      <div className="container">
        <h1 className="page-title">Сообщения</h1>

        <div className="chats-layout">

          {/* Список чатов */}
          <div className="chats-list card">
            {chats.length === 0 ? (
              <div className="chats-empty">
                <p className="text-muted">Нет диалогов</p>
              </div>
            ) : (
              chats.map(chat => (
                <button
                  key={chat.id}
                  className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''} ${chat.unread_count > 0 ? 'chat-item--unread' : ''}`}
                  onClick={() => setActiveChat(chat)}
                >
                  <div className="chat-item__avatar">
                    {getCompanion(chat).charAt(0).toUpperCase()}
                  </div>
                  <div className="chat-item__info">
                    <span className="chat-item__name">{getCompanion(chat)}</span>
                    <span className="chat-item__preview text-muted">
                      {chat.last_message ?? 'Нет сообщений'}
                    </span>
                  </div>
                  <div className="chat-item__right">
                    {chat.last_message_at && (
                      <span className="chat-item__time text-muted">
                        {new Date(chat.last_message_at).toLocaleTimeString('ru-RU', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    )}
                    {chat.unread_count > 0 && (
                      <span className="chat-item__badge">
                        {chat.unread_count > 99 ? '99+' : chat.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Окно чата */}
          <div className="chat-window card">
            {!activeChat ? (
              <div className="chat-window__empty">
                <p className="text-muted">Выберите диалог</p>
              </div>
            ) : (
              <>
                {/* Шапка */}
                <div className="chat-window__header">
                  <div className="chat-window__avatar">
                    {getCompanion(activeChat).charAt(0).toUpperCase()}
                  </div>
                  <div className="chat-window__header-info">
                    <span className="chat-window__name">
                      {getCompanion(activeChat)}
                    </span>
                    {activeChat.order_id ? (
                      <span className="chat-window__order text-muted">
                        Заказ #{activeChat.order_id.slice(0, 8).toUpperCase()}
                        {activeChat.total_amount
                          ? ` · ${activeChat.total_amount.toLocaleString('ru-RU')} ₽`
                          : ''}
                      </span>
                    ) : (
                      <span className="chat-window__order text-muted">
                        Общий вопрос
                      </span>
                    )}
                  </div>
                </div>

                {/* Сообщения */}
                <div className="chat-window__messages">
                  {messages.length === 0 ? (
                    <div className="chat-window__no-messages">
                      <p className="text-muted">Нет сообщений. Напишите первым!</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`message ${isMe ? 'message--mine' : 'message--theirs'}`}
                        >
                          {!isMe && (
                            <div className="message__avatar">
                              {msg.sender_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="message__body">
                            {!isMe && (
                              <span className="message__sender">{msg.sender_name}</span>
                            )}
                            <div className="message__bubble">
                              {msg.text}
                            </div>
                            <div className="message__meta">
                              <span className="message__time">
                                {new Date(msg.created_at).toLocaleTimeString('ru-RU', {
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                              {/* Галочка прочтения — только для моих сообщений */}
                              {isMe && (
                                <span className={`message__check ${msg.is_read ? 'message__check--read' : ''}`}>
                                  {msg.is_read ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Поле ввода */}
                <div className="chat-window__input">
                  <textarea
                    className="input chat-window__textarea"
                    placeholder="Написать сообщение... (Enter — отправить)"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                  />
                  <button
                    className="btn btn-primary chat-window__send"
                    onClick={handleSend}
                    disabled={sending || !text.trim()}
                  >
                    {sending ? '...' : '➤'}
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}