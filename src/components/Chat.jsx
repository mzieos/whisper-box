import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase/config';
import { collection, addDoc, onSnapshot, query, orderBy, limit, doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import Message from './Message';
import useMessages from '../hooks/useMessages';

const Chat = ({ roomId, displayName }) => {
    const [newMessage, setNewMessage] = useState('');
    const [roomPassword, setRoomPassword] = useState('');
    const [hold, setHold] = useState({ active: false, by: '', displayName: '' });
    const [closed, setClosed] = useState(false);
    const [holdLoading, setHoldLoading] = useState(false);
    const [closeLoading, setCloseLoading] = useState(false);
    const [roomCreatedAt, setRoomCreatedAt] = useState(null);
    const [roomExpiresIn, setRoomExpiresIn] = useState('');
    const messages = useMessages(roomId);
    const messagesEndRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!roomId) return;
        const unsub = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setHold(data.hold || { active: false, by: '', displayName: '' });
                setClosed(data.closed || false);
                setRoomPassword(data.passwordHash || '');
                setRoomCreatedAt(data.createdAt || null);
            }
        });
        return () => unsub();
    }, [roomId]);

    useEffect(() => {
        if (!roomCreatedAt) return;
        const interval = setInterval(() => {
            const now = new Date();
            const expiresAt = new Date((roomCreatedAt.seconds || 0) * 1000 + 24 * 3600 * 1000);
            const diff = expiresAt - now;
            if (diff > 0) {
                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                setRoomExpiresIn(`${hours}h ${minutes}m`);
            } else {
                setRoomExpiresIn('Expired');
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [roomCreatedAt]);

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
        const msgs = await getDocs(collection(db, 'rooms', roomId, 'messages'));
        for (const msg of msgs.docs) {
            await deleteDoc(msg.ref);
        }
        await updateDoc(doc(db, 'rooms', roomId), {
            closed: true,
            closedBy: displayName
        });
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
                expiryTime: Timestamp.fromDate(new Date(now.getTime() + 20000)),
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
            <div className="flex flex-col min-h-screen overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="glass-error text-center p-8 text-white text-lg font-semibold">
                    This room has been closed{typeof closed === 'string' ? ` by ${closed}` : ''}.
                </div>
            </div>
        );
    }

    // Updated Chat.jsx with mobile-friendly fixes
    return (
        <div className="max-h-[620px] flex flex-col h-screen bg-gradient-to-br from-gray-900 to-gray-800">
            {/* Main Container - unified glass panel */}
            <div className="glass flex-1 flex flex-col mx-2 my-2 rounded-xl overflow-hidden">
                {/* Unified Header */}
                <div className="glass-header p-3 text-center text-white">
                    <div className="flex justify-between items-center px-2">
                        <div className="text-sm truncate">
                            <span className="font-semibold">Room:</span> {roomId}
                        </div>
                        {/* <div className="text-sm truncate">
                            <span className="font-semibold">Pass:</span> {roomPassword}
                        </div> */}
                        <div className="text-sm">
                            <span className="font-semibold">Expires:</span> {roomExpiresIn}
                        </div>
                    </div>
                </div>

                {/* Control Buttons - integrated with header */}
                <div className="flex justify-center gap-2 p-2 bg-gray-800/30">
                    {!hold.active ? (
                        <button
                            onClick={handleHold}
                            disabled={holdLoading}
                            className="glass-button-hold px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            {holdLoading ? '...' : 'Hold'}
                        </button>
                    ) : hold.by === auth.currentUser.uid ? (
                        <button
                            onClick={handleResume}
                            disabled={holdLoading}
                            className="glass-button-resume px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            {holdLoading ? '...' : 'Resume'}
                        </button>
                    ) : null}

                    <button
                        onClick={handleCloseRoom}
                        disabled={closeLoading}
                        className="glass-button-close px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                        {closeLoading ? '...' : 'Close'}
                    </button>
                </div>

                {/* Hold Notice */}
                {hold.active && (
                    <div className="text-center text-amber-300 text-xs p-1 bg-amber-900/20">
                        Paused by {hold.displayName}
                    </div>
                )}

                {/* Messages Area - main content */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {messages.map((message) => (
                        <Message key={message.id} message={message} currentUid={auth.currentUser.uid} roomId={roomId} />
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area - fixed at bottom */}
                <div className="glass-input-area p-2">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={hold.active && hold.by !== auth.currentUser.uid ? 'Chat paused...' : 'Message...'}
                            disabled={hold.active && hold.by !== auth.currentUser.uid || closed}
                            className="flex-1 glass-input px-3 py-2 rounded-lg focus:outline-none text-sm"
                        />
                        <button
                            type="submit"
                            disabled={hold.active && hold.by !== auth.currentUser.uid || closed}
                            className="glass-button-send px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>

            <audio ref={audioRef} src="/assets/notification.mp3" preload="auto" />
        </div>
    );
};

export default Chat;