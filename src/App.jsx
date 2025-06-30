// src/App.jsx
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from './firebase/config';
import Chat from './components/Chat';
import RoomAuth from './components/RoomAuth';
import styles from './styles/App.module.css';

const App = () => {
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const displayName = localStorage.getItem('displayName') || '';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).then(() => setAuthReady(true));
      } else {
        setAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!authReady) {
    return <div style={{color: '#fff', textAlign: 'center', marginTop: '40vh'}}>Loading...</div>;
  }

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