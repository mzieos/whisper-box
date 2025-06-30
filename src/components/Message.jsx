// src/components/Message.jsx
import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import styles from '../styles/Message.module.css';

const Message = ({ message, isCreator, currentUid }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [timeLeft, setTimeLeft] = useState(10);
    const isOwnMessage = message.uid === currentUid;

    useEffect(() => {
        let timer;
        const now = new Date();
        // If current user hasn't seen the message, mark as seen
        if (!message.seenBy || !message.seenBy.includes(currentUid)) {
            updateDoc(doc(db, 'messages', message.id), {
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
                        // Only delete if both users have seen and their timers expired
                        if (message.seenBy && message.seenBy.length >= 2) {
                            const otherUid = message.seenBy.find(uid => uid !== currentUid);
                            const otherSeenAt = message.seenAt && message.seenAt[otherUid];
                            const otherElapsed = otherSeenAt ? Math.floor((now - (otherSeenAt.seconds ? new Date(otherSeenAt.seconds * 1000) : new Date(otherSeenAt))) / 1000) : 0;
                            if (otherElapsed >= 10) {
                                deleteDoc(doc(db, 'messages', message.id));
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
    }, [message.id, message.seenBy, message.seenAt, currentUid]);

    if (!isVisible) return null;

    return (
        <div className={`${styles.message} ${isOwnMessage ? styles.ownMessage : styles.otherMessage}`}>
            <div className={styles.messageContent}>
                <p>{message.text}</p>
                <div className={styles.timer}>{timeLeft}s</div>
            </div>
        </div>
    );
};

export default Message;