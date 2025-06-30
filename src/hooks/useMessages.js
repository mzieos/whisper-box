// src/hooks/useMessages.js
import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

const useMessages = (roomId) => {
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        if (!roomId) {
            setMessages([]);
            return;
        }
        const q = query(
            collection(db, 'rooms', roomId, 'messages'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const messagesData = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                messagesData.push({ id: doc.id, ...data, seenBy: data.seenBy || [], seenAt: data.seenAt || {} });
            });
            setMessages(messagesData.reverse());
        });

        return () => unsubscribe();
    }, [roomId]);

    return messages;
};

export default useMessages;