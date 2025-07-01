// src/components/Message.jsx
import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import styles from '../styles/Message.module.css';

// Color palette for users
const userColors = [
    '#607d8b', // blue grey
    '#00bcd4', // cyan
    '#4f8cff', // blue
    '#2ecc40', // green
    '#ffb300', // orange
    '#e040fb', // purple
    '#ff4081', // pink
    '#ff5252', // red
    '#8bc34a', // light green
    '#ff9800', // deep orange
];

function getUserColor(uid) {
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
        hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % userColors.length;
    return userColors[index];
}

const Message = ({ message, currentUid, roomId }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [timeLeft, setTimeLeft] = useState(20);
    const isOwnMessage = message.uid === currentUid;
    const userColor = getUserColor(message.uid);
    const isLightColor = userColor === '#ffb300' || userColor === '#ff9800' || userColor === '#8bc34a'; // Adjust as needed

    useEffect(() => {
        let timer;
        const now = new Date();
        // If current user hasn't seen the message, mark as seen
        if (!message.seenBy || !message.seenBy.includes(currentUid)) {
            updateDoc(doc(db, 'rooms', roomId, 'messages', message.id), {
                [`seenBy`]: [...(message.seenBy || []), currentUid],
                [`seenAt.${currentUid}`]: now
            });
        }
        // Start timer from when this user saw the message
        const seenAt = message.seenAt && message.seenAt[currentUid] ? new Date(message.seenAt[currentUid].seconds ? message.seenAt[currentUid].seconds * 1000 : message.seenAt[currentUid]) : now;
        const elapsed = Math.floor((now - seenAt) / 1000);
        setTimeLeft(Math.max(20 - elapsed, 0));
        if (elapsed < 20) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setIsVisible(false);
                        // Only delete if at least 2 users have seen and both timers expired
                        if (message.seenBy && message.seenBy.length >= 2) {
                            const allExpired = message.seenBy.every(uid => {
                                const userSeenAt = message.seenAt && message.seenAt[uid];
                                if (!userSeenAt) return false;
                                const userElapsed = userSeenAt.seconds
                                    ? Math.floor((now - new Date(userSeenAt.seconds * 1000)) / 1000)
                                    : Math.floor((now - new Date(userSeenAt)) / 1000);
                                return userElapsed >= 20;
                            });
                            if (allExpired) {
                                deleteDoc(doc(db, 'rooms', roomId, 'messages', message.id));
                            }
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            setIsVisible(false);
        }
        return () => clearInterval(timer);
    }, [message.id, message.seenBy, message.seenAt, currentUid, roomId]);

    if (!isVisible) return null;

    return (
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3 px-4`}>
            <div
                className={`glass-message max-w-xs md:max-w-md rounded-2xl p-3 relative overflow-hidden 
                    ${isOwnMessage ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                style={{
                    backgroundColor: `${userColor}20`,
                    border: `1px solid ${userColor}40`,
                    backdropFilter: 'blur(10px)'
                }}
            >
                <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]"></div>
                <p
                    className={`font-semibold text-sm mb-1 ${isLightColor ? 'text-gray-900' : 'text-gray-100'}`}
                    style={{ color: userColor }}
                >
                    {message.displayName || 'Unknown'}
                </p>
                <p className={`text-sm ${isLightColor ? 'text-gray-800' : 'text-gray-100'}`}>
                    {message.text}
                </p>
                <div
                    className={`text-xs mt-1 text-right ${timeLeft <= 5 ? 'text-red-300' : 'text-gray-400'}`}
                >
                    {timeLeft > 5 ? `${timeLeft}s` : `Deleting in ${timeLeft}s...`}
                </div>
            </div>
        </div>
    );
};

export default Message;