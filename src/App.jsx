// src/App.jsx
import { useState, useEffect } from 'react';
import { auth, getAuth, onAuthStateChanged, signInAnonymously } from './firebase/config';
import Chat from './components/Chat';
import RoomAuth from './components/RoomAuth';
import styles from './styles/App.module.css';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const displayName = localStorage.getItem('displayName') || '';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className={styles.app}>
      {!isAuthenticated ? (
        <RoomAuth setIsAuthenticated={setIsAuthenticated} setRoomId={setRoomId} />
      ) : (
        <Chat roomId={roomId} displayName={displayName} />
      )}
    </div>
  );
};

export default App;