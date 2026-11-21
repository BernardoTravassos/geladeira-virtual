import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCores } from "../theme/tema";
import { linkDaReuniao } from "../utils/reuniao";

/**
 * Reunião por vídeo dentro do app: a sala do Jitsi Meet numa WebView.
 * Recebe `vinculoId` (a sala é a mesma para paciente e nutricionista) e `nome`.
 */
export default function ReuniaoJitsi({ route, navigation }: any) {
  const colors = useCores();
  const insets = useSafeAreaInsets();
  const { vinculoId, nome } = route.params as { vinculoId: string; nome?: string };
  const [pronto, setPronto] = useState(Platform.OS !== "android");
  const [negado, setNegado] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // No Android, a WebView só liberta câmera e microfone se o app já tiver a permissão.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]).then((r) => {
      const ok = r["android.permission.CAMERA"] === "granted" && r["android.permission.RECORD_AUDIO"] === "granted";
      setNegado(!ok);
      setPronto(true); // mesmo sem câmera dá para entrar só ouvindo
    }).catch(() => setPronto(true));
  }, []);

  // Sem a tela de "abra no app" do Jitsi: a chamada acontece aqui dentro.
  const url = linkDaReuniao(vinculoId, nome) + "&config.disableDeepLinking=true&config.prejoinConfig.enabled=true";

  return (
    <View style={[styles.tela, { paddingTop: insets.top, backgroundColor: "#111" }]}>
      <View style={styles.topo}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.sair} accessibilityRole="button" accessibilityLabel="Sair da reunião">
          <Feather name="chevron-left" size={22} color="#fff" />
          <Text style={styles.sairTxt}>Sair</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Reunião</Text>
        <View style={{ width: 64 }} />
      </View>
      {negado && (
        <TouchableOpacity style={styles.aviso} onPress={() => Linking.openSettings()}>
          <Text style={styles.avisoTxt}>Câmera ou microfone bloqueados. Toque aqui para liberar nas configurações.</Text>
        </TouchableOpacity>
      )}
      {pronto && (
        <WebView
          source={{ uri: url }}
          style={{ flex: 1, backgroundColor: "#111" }}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          allowsFullscreenVideo
          setSupportMultipleWindows={false}
          onLoadEnd={() => setCarregando(false)}
          onShouldStartLoadWithRequest={(req) => {
            if (/^https:\/\/meet\.jit\.si\//.test(req.url) || req.url.startsWith("about:")) return true;
            Linking.openURL(req.url).catch(() => {});
            return false;
          }}
        />
      )}
      {(carregando || !pronto) && (
        <View style={[StyleSheet.absoluteFill, styles.carregando, { top: insets.top + 52 }]} pointerEvents="none">
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.carregandoTxt}>Abrindo a sala…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  topo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, height: 52 },
  sair: { flexDirection: "row", alignItems: "center", width: 64 },
  sairTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },
  titulo: { color: "#fff", fontSize: 16, fontWeight: "800" },
  aviso: { backgroundColor: "#7A4B00", padding: 10 },
  avisoTxt: { color: "#fff", fontSize: 12, textAlign: "center" },
  carregando: { alignItems: "center", justifyContent: "center", gap: 10 },
  carregandoTxt: { color: "#fff", fontSize: 13 },
});
