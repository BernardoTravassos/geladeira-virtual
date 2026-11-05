import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "./src/screens/LoginScreen";
import EsqueciSenhaScreen from "./src/screens/EsqueciSenhaScreen";
import NutriLoginScreen from "./src/screens/NutriLoginScreen";
import NutriPacientesScreen from "./src/screens/NutriPacientesScreen";
import NutriPacienteScreen from "./src/screens/NutriPacienteScreen";
import WizardScreen from "./src/screens/WizardScreen";
import HomeScreen from "./src/screens/HomeScreen";
import RefeicaoScreen from "./src/screens/RefeicaoScreen";

export type RootStackParamList = {
  Login: undefined;
  EsqueciSenha: undefined;
  NutriLogin: undefined;
  NutriPacientes: undefined;
  NutriPaciente: { id: string };
  Wizard: undefined;
  Home: undefined;
  Refeicao: { chave: string; nome: string; icone: string };
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
        <Stack.Screen name="EsqueciSenha" component={EsqueciSenhaScreen} />
        <Stack.Screen name="NutriLogin" component={NutriLoginScreen} />
        <Stack.Screen name="NutriPacientes" component={NutriPacientesScreen} />
        <Stack.Screen name="NutriPaciente" component={NutriPacienteScreen} />
        <Stack.Screen name="Wizard" component={WizardScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Refeicao" component={RefeicaoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
