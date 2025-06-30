// src/components/Message.jsx
import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import styles from '../styles/Message.module.css';

// Color palette for users
const userColors = [
    '#4f8cff', // blue
    '#2ecc40', // green
    '#ffb300', // orange
    '#e040fb', // purple
    '#ff4081', // pink
    '#00bcd4', // cyan
    '#ff5252', // red
    '#8bc34a', // light green
    '#ff9800', // deep orange
    '#607d8b', // blue grey
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
    const [timeLeft, setTimeLeft] = useState(10);
    const isOwnMessage = message.uid === currentUid;

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
        setTimeLeft(Math.max(10 - elapsed, 0));
        if (elapsed < 10) {
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
                                return userElapsed >= 10;
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
        <div className={`${styles.message} ${isOwnMessage ? styles.ownMessage : styles.otherMessage}`}>
            <div
                className={styles.messageContent}
                style={{ backgroundColor: getUserColor(message.uid) }}
            >
                <p>{message.text}</p>
                <div className={styles.timer}>{timeLeft}s</div>
            </div>
        </div>
    );
};

export default Message;