import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { DarkTheme, DefaultTheme, NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { TemaProvider, useTema } from "./src/theme/tema";
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
import HistoricoScreen from "./src/screens/HistoricoScreen";
import PerfilScreen from "./src/screens/PerfilScreen";
import ReceitaScreen from "./src/screens/ReceitaScreen";
import SmartwatchScreen from "./src/screens/SmartwatchScreen";
import TreinoScreen from "./src/screens/TreinoScreen";
import ReceitasScreen from "./src/screens/ReceitasScreen";
import TransicaoLogo, { TransicaoLogoRef } from "./src/components/TransicaoLogo";
import { FeedbackProvider } from "./src/components/Feedback";

export type RootStackParamList = {
  Login: undefined;
  EsqueciSenha: undefined;
  NutriLogin: undefined;
  NutriPacientes: undefined;
  NutriPaciente: { id: string };
  Wizard: undefined;
  Home: { camera?: number } | undefined;
  Perfil: undefined;
  Smartwatch: undefined;
  Treino: undefined;
  Receita: { id: string };
  Receitas: undefined;
  Historico: { periodo?: "dia" | "semana" | "mes" | "semestre" };
  Refeicao: { chave: string; nome: string; icone: string; fracaoDaMeta: number };
};

const ABAS = ["Home", "Treino", "Historico", "Perfil"];

const Stack = createNativeStackNavigator<RootStackParamList>();

function Principal() {
  const { cores, escuro } = useTema();
  const navegacao = useNavigationContainerRef();
  const transicao = useRef<TransicaoLogoRef>(null);
  const rotaAnterior = useRef<string | undefined>(undefined);
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
    <FeedbackProvider>
    <View style={{ flex: 1 }}>
    <NavigationContainer
      ref={navegacao}
      theme={{
        ...(escuro ? DarkTheme : DefaultTheme),
        colors: { ...(escuro ? DarkTheme : DefaultTheme).colors, background: cores.background, card: cores.surface, text: cores.textPrimary, border: cores.border, primary: cores.primary },
      }}
      onReady={() => { rotaAnterior.current = navegacao.getCurrentRoute()?.name; }}
      onStateChange={() => {
        // Toca a transição com o símbolo a cada troca de tela (ir ou voltar).
        const atual = navegacao.getCurrentRoute()?.name;
        const entreAbas = ABAS.includes(rotaAnterior.current ?? "") && ABAS.includes(atual ?? "");
        // Trocar de aba pelo menu inferior é rápido; a cortina é para mudanças de contexto.
        if (rotaAnterior.current && atual && atual !== rotaAnterior.current && !entreAbas) transicao.current?.tocar();
        rotaAnterior.current = atual;
      }}
    >
      <Stack.Navigator
        initialRouteName={initialRoute}
        // A cortina verde cobre a troca; a animação padrão do sistema ficaria brigando com ela.
        screenOptions={{ headerShown: false, animation: "fade", animationDuration: 200 }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="EsqueciSenha" component={EsqueciSenhaScreen} />
        <Stack.Screen name="NutriLogin" component={NutriLoginScreen} />
        <Stack.Screen name="NutriPacientes" component={NutriPacientesScreen} />
        <Stack.Screen name="NutriPaciente" component={NutriPacienteScreen} />
        <Stack.Screen name="Wizard" component={WizardScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Refeicao" component={RefeicaoScreen} />
        <Stack.Screen name="Historico" component={HistoricoScreen} />
        <Stack.Screen name="Perfil" component={PerfilScreen} />
        <Stack.Screen name="Smartwatch" component={SmartwatchScreen} />
        <Stack.Screen name="Treino" component={TreinoScreen} />
        <Stack.Screen name="Receita" component={ReceitaScreen} />
        <Stack.Screen name="Receitas" component={ReceitasScreen} />
      </Stack.Navigator>
    </NavigationContainer>
    <TransicaoLogo ref={transicao} />
    </View>
    </FeedbackProvider>
  );
}

export default function App() {
  return (
    <TemaProvider>
      <Principal />
    </TemaProvider>
  );
}
