import "./styles.css";
import { onAuthStateChanged, User } from 'firebase/auth';
import { FIREBASE_AUTH } from '../firebase';
import Box from "./components/box";
import UserBox from "./components/userbox";
import Login from "./components/login";
import { useEffect, useState } from "react";


function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedBox, setSelectedBox] = useState<number>(1);
  const [adminMode, setAdminMode] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {user ? (
        <div className="bg-black h-full flex flex-col">
          {/* Top bar */}
          <div className="flex justify-between items-center px-6 py-3 border-b border-gray-800">
            {/* Box selector */}
            <div className="flex space-x-2">
              {[1, 2, 3, 4].map((boxId) => (
                <button
                  key={boxId}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    selectedBox === boxId
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                  onClick={() => setSelectedBox(boxId)}
                >
                  Box {boxId}
                </button>
              ))}
            </div>

            {/* Mode toggle */}
            <button
              onClick={() => setAdminMode((prev) => !prev)}
              className="text-xs uppercase tracking-widest px-3 py-1.5 rounded border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
            >
              {adminMode ? "User View" : "Admin View"}
            </button>
          </div>

          {/* Content */}
          {adminMode ? (
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <Box id={selectedBox} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <UserBox id={selectedBox} />
            </div>
          )}
        </div>
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App;
