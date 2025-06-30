// src/components/Chat.jsx
import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase/config';
import { collection, addDoc, onSnapshot, query, orderBy, limit, doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import Message from './Message';
import useMessages from '../hooks/useMessages';
import styles from '../styles/Chat.module.css';

const Chat = ({ roomId, displayName }) => {
    const [newMessage, setNewMessage] = useState('');
    const [roomPassword, setRoomPassword] = useState('');
    const [hold, setHold] = useState({ active: false, by: '', displayName: '' });
    const [closed, setClosed] = useState(false);
    const [holdLoading, setHoldLoading] = useState(false);
    const [closeLoading, setCloseLoading] = useState(false);
    const messages = useMessages(roomId);
    const messagesEndRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        // Listen for hold/close state
        if (!roomId) return;
        const unsub = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setHold(data.hold || { active: false, by: '', displayName: '' });
                setClosed(data.closed || false);
                setRoomPassword(data.passwordHash || '');
            }
        });
        return () => unsub();
    }, [roomId]);

    const handleHold = async () => {
        setHoldLoading(true);
        await updateDoc(doc(db, 'rooms', roomId), {
            hold: { active: true, by: auth.currentUser.uid, displayName }
        });
        setHoldLoading(false);
    };
    const handleResume = async () => {
        setHoldLoading(true);
        await updateDoc(doc(db, 'rooms', roomId), {
            hold: { active: false, by: '', displayName: '' }
        });
        setHoldLoading(false);
    };
    const handleCloseRoom = async () => {
        if (!window.confirm('Are you sure? This will end the chat for everyone.')) return;
        setCloseLoading(true);
        // Delete all messages in the room
        const msgs = await getDocs(collection(db, 'rooms', roomId, 'messages'));
        for (const msg of msgs.docs) {
            await deleteDoc(msg.ref);
        }
        // Mark room as closed (so users see notification before redirect)
        await updateDoc(doc(db, 'rooms', roomId), {
            closed: true,
            closedBy: displayName
        });
        // Delete room after short delay
        setTimeout(async () => {
            await deleteDoc(doc(db, 'rooms', roomId));
        }, 2000);
        setCloseLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        if (hold.active && hold.by !== auth.currentUser.uid) return;
        if (closed) return;
        try {
            const now = new Date();
            await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                text: newMessage,
                createdAt: serverTimestamp(),
                uid: auth.currentUser.uid,
                displayName,
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

    if (closed) {
        return (
            <div className={styles.chatContainer}>
                <div style={{textAlign: 'center', padding: '20px', color: '#fff', background: '#181818', fontWeight: 600, fontSize: 18}}>
                    This room has been closed{typeof closed === 'string' ? ` by ${closed}` : ''}.
                </div>
            </div>
        );
    }

    return (
        <div className={styles.chatContainer}>
            <div style={{textAlign: 'center', padding: '10px 0', background: '#181818', color: '#fff', fontWeight: 600, fontSize: 16}}>
                Room ID: {roomId} <br />
                Password: <span style={{fontFamily: 'monospace'}}>{roomPassword}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'center', gap: 10, margin: '10px 0'}}>
                {!hold.active && (
                    <button onClick={handleHold} disabled={holdLoading} style={{background: '#ffb300', color: '#222', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 600, cursor: 'pointer'}}>
                        {holdLoading ? 'Pausing...' : 'Hold'}
                    </button>
                )}
                {hold.active && hold.by === auth.currentUser.uid && (
                    <button onClick={handleResume} disabled={holdLoading} style={{background: '#2ecc40', color: '#222', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 600, cursor: 'pointer'}}>
                        {holdLoading ? 'Resuming...' : 'Resume'}
                    </button>
                )}
                <button onClick={handleCloseRoom} disabled={closeLoading} style={{background: '#ff5252', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 600, cursor: 'pointer'}}>
                    {closeLoading ? 'Closing...' : 'Close Room'}
                </button>
            </div>
            {hold.active && (
                <div style={{textAlign: 'center', color: '#ffb300', fontWeight: 600, marginBottom: 8}}>
                    Chat paused by {hold.displayName}. {hold.by === auth.currentUser.uid ? "Tap 'Resume' to continue." : 'Wait for them to resume.'}
                </div>
            )}
            <audio ref={audioRef} src="/assets/notification.mp3" preload="auto" />
            <div className={styles.messages}>
                {messages.map((message) => (
                    <Message key={message.id} message={message} currentUid={auth.currentUser.uid} roomId={roomId} />
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className={styles.messageForm}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={hold.active && hold.by !== auth.currentUser.uid ? 'Chat is on hold...' : 'Type a message...'}
                    disabled={hold.active && hold.by !== auth.currentUser.uid || closed}
                />
                <button type="submit" disabled={hold.active && hold.by !== auth.currentUser.uid || closed}>Send</button>
            </form>
        </div>
    );
};

export default Chat;