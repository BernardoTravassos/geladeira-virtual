import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "./src/screens/LoginScreen";
import WizardScreen from "./src/screens/WizardScreen";
import HomeScreen from "./src/screens/HomeScreen";

export type RootStackParamList = {
  Login: undefined;
  Wizard: undefined;
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    // Verifica se já existe um login salvo e se o perfil (wizard) já foi preenchido.
    // Assim decidimos direto qual tela mostrar primeiro — sem piscar a tela de login à toa.
    async function checkStoredSession() {
      const token = await AsyncStorage.getItem("@geladeira:token");
      const wizardDone = await AsyncStorage.getItem("@geladeira:wizardDone");

      if (!token) {
        setInitialRoute("Login");
      } else if (token && !wizardDone) {
        setInitialRoute("Wizard");
      } else {
        setInitialRoute("Home");
      }
    }
    checkStoredSession();
  }, []);

  if (!initialRoute) return null; // splash nativo do Expo continua visível aqui

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Wizard" component={WizardScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
