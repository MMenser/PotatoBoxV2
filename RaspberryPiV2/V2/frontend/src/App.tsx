import "./styles.css";
import { onAuthStateChanged, User } from 'firebase/auth';
import { FIREBASE_AUTH } from '../firebase';
import Box from "./components/box";
import Login from "./components/login";
import { useEffect, useState } from "react";


function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedBox, setSelectedBox] = useState<number>(1); // Track which box is selected

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const handleBoxChange = (boxId: number) => {
    setSelectedBox(boxId);
  };

  return (
    <div>
      {user ? (
        <div className="bg-black min-h-screen flex flex-col">
          {/* Buttons to switch boxes */}
          <div className="flex justify-center space-x-4 p-4">
            <button
              className="bg-gray-700 text-white px-4 py-2 rounded"
              onClick={() => handleBoxChange(1)}
            >
              Box 1
            </button>
            <button
              className="bg-gray-700 text-white px-4 py-2 rounded"
              onClick={() => handleBoxChange(2)}
            >
              Box 2
            </button>
            <button
              className="bg-gray-700 text-white px-4 py-2 rounded"
              onClick={() => handleBoxChange(3)}
            >
              Box 3
            </button>
            <button
              className="bg-gray-700 text-white px-4 py-2 rounded"
              onClick={() => handleBoxChange(4)}
            >
              Box 4
            </button>
          </div>

          {/* Display the selected box */}
          <div className="w-full flex justify-center mt-4">
            <Box id={selectedBox} />
          </div>
        </div>
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App;
