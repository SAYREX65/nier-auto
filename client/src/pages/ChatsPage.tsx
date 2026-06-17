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

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const messagesBodyRef = useRef<HTMLDivElement>(null);
  const pollRef         = useRef<ReturnType<typeof setInterval>>();
  const chatPollRef     = useRef<ReturnType<typeof setInterval>>();
  const prevCountRef    = useRef<number>(0);   // кол-во сообщений в прошлый раз
  const isFirstLoad     = useRef<boolean>(true); // первая загрузка чата

  // Скролл вниз — только если нужно
  const scrollToBottom = useCallback((force = false) => {
    const body = messagesBodyRef.current;
    if (!body) return;

    if (force) {
      // Принудительно — при открытии чата или отправке своего сообщения
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Умный скролл: только если пользователь уже почти внизу (< 120px до конца)
    const distanceFromBottom = body.scrollHeight - body.scrollTop - body.clientHeight;
    if (distanceFromBottom < 120) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const fetchChats = useCallback(() => {
    api.get('/chats').then(r => {
      setChats(r.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchChats();
    chatPollRef.current = setInterval(fetchChats, 5000);
    return () => clearInterval(chatPollRef.current);
  }, [fetchChats]);

  const fetchMessages = useCallback((forceScroll = false) => {
    if (!activeChat) return;
    api.get(`/chats/${activeChat.id}/messages`).then(r => {
      const newMessages: Message[] = r.data;
      const newCount = newMessages.length;
      const prevCount = prevCountRef.current;
      const hasNewMessages = newCount > prevCount;

      setMessages(newMessages);
      prevCountRef.current = newCount;

      setChats(prev =>
        prev.map(c => c.id === activeChat.id ? { ...c, unread_count: 0 } : c)
      );

      setTimeout(() => {
        if (forceScroll || isFirstLoad.current) {
          // Первая загрузка чата — прыгаем вниз без анимации
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: isFirstLoad.current ? 'auto' : 'smooth' });
          }
          isFirstLoad.current = false;
        } else if (hasNewMessages) {
          // Пришли новые сообщения — умный скролл
          scrollToBottom(false);
        }
        // Если новых сообщений нет — ничего не делаем, не трогаем позицию
      }, 50);
    });
  }, [activeChat, scrollToBottom]);

  // При смене чата — сбрасываем счётчики и грузим заново
  useEffect(() => {
    if (!activeChat) return;
    prevCountRef.current = 0;
    isFirstLoad.current  = true;

    fetchMessages(true);
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchMessages(false), 3000);
    return () => clearInterval(pollRef.current);
  }, [activeChat?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    if (!text.trim() || !activeChat || sending) return;
    setSending(true);
    try {
      await api.post(`/chats/${activeChat.id}/messages`, { text });
      setText('');
      // После отправки своего сообщения — скролл вниз принудительно
      fetchMessages(true);
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
                <div className="chat-window__messages" ref={messagesBodyRef}>
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
