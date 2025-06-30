// src/App.jsx
import { useState } from 'react';
import { auth } from './firebase/config';
import Chat from './components/Chat';
import RoomAuth from './components/RoomAuth';
import styles from './styles/App.module.css';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const displayName = localStorage.getItem('displayName') || '';

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