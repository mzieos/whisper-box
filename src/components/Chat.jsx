// src/components/Chat.jsx
import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase/config';
import { collection, addDoc, onSnapshot, query, orderBy, limit, doc, setDoc, getDoc } from 'firebase/firestore';
import Message from './Message';
import NotificationControl from './NotificationControl';
import useMessages from '../hooks/useMessages';
import styles from '../styles/Chat.module.css';

const Chat = ({ isCreator }) => {
    const [newMessage, setNewMessage] = useState('');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const messages = useMessages();
    const messagesEndRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const now = new Date();
            await addDoc(collection(db, 'messages'), {
                text: newMessage,
                createdAt: now,
                uid: auth.currentUser.uid,
                shouldNotify: notificationsEnabled,
                seenBy: [auth.currentUser.uid],
                seenAt: { [auth.currentUser.uid]: now }
            });
            setNewMessage('');
        } catch (err) {
            console.error('Error sending message:', err);
        }
    };

    const testNotificationSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
        }
    };

    return (
        <div className={styles.chatContainer}>
            <audio ref={audioRef} src="/assets/notification.mp3" preload="auto" />

            {isCreator && (
                <NotificationControl
                    enabled={notificationsEnabled}
                    onToggle={() => setNotificationsEnabled(!notificationsEnabled)}
                    onTestSound={testNotificationSound}
                />
            )}

            <div className={styles.messages}>
                {messages.map((message) => (
                    <Message key={message.id} message={message} isCreator={isCreator} currentUid={auth.currentUser.uid} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className={styles.messageForm}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                />
                <button type="submit">Send</button>
            </form>
        </div>
    );
};

export default Chat;