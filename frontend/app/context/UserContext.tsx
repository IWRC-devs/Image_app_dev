import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useState, useContext, useEffect } from "react";

export interface User {
  id: number;
  username: string;
  country_id: number;
  country_name: string;
  country_code: string;
  team_name: string;
};

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

/*export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: (_user: User | null) => {},
});*/
export const UserContext = createContext<UserContextType | undefined>(undefined);

/*export const useUser = () => useContext(UserContext);*/
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.log("Failed to load user", err);
      }
    };

    loadUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};