// src/App.jsx
import { useState } from 'react';
import { auth } from './firebase/config';
import PasswordAuth from './components/PasswordAuth';
import Chat from './components/Chat';
import styles from './styles/App.module.css';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  const handleCreatorAccess = () => {
    setIsCreator(true);
  };

  const handleRecipientAccess = () => {
    setIsCreator(false);
  };

  return (
    <div className={styles.app}>
      {!isAuthenticated ? (
        <div className={styles.accessSelection}>
          <h1>Whisper Box</h1>
          <div className={styles.buttons}>
            <button onClick={handleCreatorAccess}>I'm the Creator</button>
            <button onClick={handleRecipientAccess}>I'm the Recipient</button>
          </div>
          {isCreator !== null && (
            <PasswordAuth
              setIsAuthenticated={setIsAuthenticated}
              isCreator={isCreator}
            />
          )}
        </div>
      ) : (
        <Chat isCreator={isCreator} />
      )}
    </div>
  );
};

export default App;