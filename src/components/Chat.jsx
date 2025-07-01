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
            <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="glass-error text-center p-8 text-white text-lg font-semibold">
                    This room has been closed{typeof closed === 'string' ? ` by ${closed}` : ''}.
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 to-gray-800">
            {/* Room Info Header */}
            <div className="glass-header text-center py-3 text-white font-semibold text-sm md:text-base">
                <div>Room ID: <span className="font-mono">{roomId}</span></div>
                <div>Password: <span className="font-mono">{roomPassword}</span></div>
                <div>Room expires in: {roomExpiresIn}</div>
            </div>

            {/* Control Buttons */}
            <div className="flex justify-center gap-3 my-3 px-4">
                {!hold.active && (
                    <button
                        onClick={handleHold}
                        disabled={holdLoading}
                        className="glass-button-hold px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                    >
                        {holdLoading ? 'Pausing...' : 'Hold'}
                    </button>
                )}
                {hold.active && hold.by === auth.currentUser.uid && (
                    <button
                        onClick={handleResume}
                        disabled={holdLoading}
                        className="glass-button-resume px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                    >
                        {holdLoading ? 'Resuming...' : 'Resume'}
                    </button>
                )}
                <button
                    onClick={handleCloseRoom}
                    disabled={closeLoading}
                    className="glass-button-close px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                    {closeLoading ? 'Closing...' : 'Close Room'}
                </button>
            </div>

            {/* Hold Notice */}
            {hold.active && (
                <div className="text-center text-amber-300 font-semibold text-sm mb-3 px-4">
                    Chat paused by {hold.displayName}. {hold.by === auth.currentUser.uid ? "Tap 'Resume' to continue." : 'Wait for them to resume.'}
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                {messages.map((message) => (
                    <Message key={message.id} message={message} currentUid={auth.currentUser.uid} roomId={roomId} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSubmit} className="glass-input-area p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={hold.active && hold.by !== auth.currentUser.uid ? 'Chat is on hold...' : 'Type a message...'}
                        disabled={hold.active && hold.by !== auth.currentUser.uid || closed}
                        className="flex-1 glass-input px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                        type="submit"
                        disabled={hold.active && hold.by !== auth.currentUser.uid || closed}
                        className="glass-button-send px-4 py-3 rounded-lg font-semibold disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            </form>

            <audio ref={audioRef} src="/assets/notification.mp3" preload="auto" />
        </div>
    );
};

export default Chat;