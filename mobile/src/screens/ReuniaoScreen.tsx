import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, PermissionsAndroid, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokenDaReuniao } from "../services/nutri";
import ReuniaoJitsi from "./ReuniaoJitsi";

/**
 * Reunião por vídeo com a cara do app: o vídeo e o áudio passam pelo LiveKit,
 * mas toda a tela é nossa.
 *
 * O LiveKit usa módulos nativos de WebRTC, que não existem no Expo Go. Por
 * isso são carregados aqui dentro, com require: sem eles (Expo Go), a tela cai
 * na sala do Jitsi pela WebView, e o resto do app não é afetado.
 */
function carregarLivekit(): null | { Room: any; RoomEvent: any; Track: any; VideoTrack: any; AudioSession: any } {
  try {
    const rn = require("@livekit/react-native");
    const lk = require("livekit-client");
    if (!rn?.AudioSession || !rn?.VideoTrack) return null;
    rn.registerGlobals();
    return { Room: lk.Room, RoomEvent: lk.RoomEvent, Track: lk.Track, VideoTrack: rn.VideoTrack, AudioSession: rn.AudioSession };
  } catch {
    return null;
  }
}

const LK = carregarLivekit();

export default function ReuniaoScreen(props: any) {
  if (!LK) return <ReuniaoJitsi {...props} />;
  return <ReuniaoNativa {...props} />;
}

type Fase = "conectando" | "aguardando" | "emChamada" | "erro" | "encerrada";

function iniciais(nome?: string) {
  return (nome ?? "?").replace(/^(Dra?\.?)\s+/i, "").split(" ").filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join("") || "?";
}

function formatarTempo(seg: number) {
  const m = Math.floor(seg / 60);
  return `${String(m).padStart(2, "0")}:${String(seg % 60).padStart(2, "0")}`;
}

function ReuniaoNativa({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { vinculoId } = route.params as { vinculoId: string; nome?: string };
  const { Room, RoomEvent, Track, VideoTrack, AudioSession } = LK!;

  const sala = useRef<any>(null);
  const [fase, setFase] = useState<Fase>("conectando");
  const [erro, setErro] = useState("");
  const [, repintar] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [tentativa, setTentativa] = useState(0);
  const [eu, setEu] = useState<{ nome: string } | null>(null);

  const bump = useCallback(() => repintar((n) => n + 1), []);

  useEffect(() => {
    let vivo = true;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    sala.current = room;
    setFase("conectando");
    setErro("");

    (async () => {
      try {
        if (Platform.OS === "android") {
          const r = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]);
          if (r["android.permission.CAMERA"] !== "granted" || r["android.permission.RECORD_AUDIO"] !== "granted") {
            throw new Error("Libere a câmera e o microfone nas configurações do celular para entrar na reunião.");
          }
        }
        const dados = await tokenDaReuniao(vinculoId);
        if (!vivo) return;
        setEu({ nome: dados.nome });

        [RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected, RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed,
          RoomEvent.TrackMuted, RoomEvent.TrackUnmuted, RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished].forEach((e) => room.on(e, bump));
        room.on(RoomEvent.Disconnected, () => { if (vivo) setFase((f) => (f === "erro" ? f : "encerrada")); });

        await AudioSession.startAudioSession();
        await room.connect(dados.url, dados.token);
        if (!vivo) return;
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(true);
        setFase(room.remoteParticipants.size > 0 ? "emChamada" : "aguardando");
        bump();
      } catch (e: any) {
        if (!vivo) return;
        const status = e?.response?.status;
        setErro(
          status === 503 ? "A reunião por vídeo ainda não foi ativada no servidor."
            : status === 404 ? "Esta reunião não está mais disponível. O acompanhamento foi encerrado."
            : e?.message && !e?.response ? e.message
            : "Não foi possível entrar na reunião. Confira a internet e tente de novo.",
        );
        setFase("erro");
      }
    })();

    return () => {
      vivo = false;
      room.disconnect().catch?.(() => {});
      AudioSession.stopAudioSession().catch?.(() => {});
    };
  }, [vinculoId, tentativa, bump]); // eslint-disable-line react-hooks/exhaustive-deps

  const room = sala.current;
  const outro = room ? [...room.remoteParticipants.values()][0] : undefined;
  useEffect(() => {
    if (fase === "aguardando" && outro) setFase("emChamada");
    if (fase === "emChamada" && !outro) setFase("aguardando");
  }, [outro, fase]);

  useEffect(() => {
    if (fase !== "emChamada") return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [fase]);

  const local = room?.localParticipant;
  const refCamera = (p: any) => {
    const pub = p?.getTrackPublication?.(Track.Source.Camera);
    return pub && pub.track && !pub.isMuted ? { participant: p, publication: pub, source: Track.Source.Camera } : undefined;
  };
  const videoOutro = outro ? refCamera(outro) : undefined;
  const videoEu = local ? refCamera(local) : undefined;
  const micLigado = !!local?.isMicrophoneEnabled;
  const camLigada = !!local?.isCameraEnabled;
  const [frontal, setFrontal] = useState(true);

  async function alternarMic() { await local?.setMicrophoneEnabled(!micLigado); bump(); }
  async function alternarCamera() { await local?.setCameraEnabled(!camLigada); bump(); }
  async function virarCamera() {
    const pub = local?.getTrackPublication?.(Track.Source.Camera);
    const prox = !frontal;
    try { await pub?.videoTrack?.restartTrack({ facingMode: prox ? "user" : "environment" }); setFrontal(prox); } catch {}
  }
  function sair() { navigation.goBack(); }

  const styles = useMemo(() => criarStyles(), []);
  const nomeOutro = outro?.name || "Participante";

  if (fase === "erro" || fase === "encerrada") {
    return (
      <LinearGradient colors={["#14382A", "#0B1F17"]} style={[styles.tela, styles.centro, { paddingTop: insets.top }]}>
        <View style={styles.avatarGrande}><Feather name={fase === "erro" ? "video-off" : "check"} size={34} color="#fff" /></View>
        <Text style={styles.tituloCentro}>{fase === "erro" ? "Não foi possível entrar" : "Reunião encerrada"}</Text>
        <Text style={styles.textoCentro}>{fase === "erro" ? erro : segundos > 0 ? `Duração: ${formatarTempo(segundos)}` : "Você saiu da sala."}</Text>
        {fase === "erro" && (
          <TouchableOpacity style={styles.botaoPrimario} onPress={() => setTentativa((n) => n + 1)} accessibilityRole="button">
            <Text style={styles.botaoPrimarioTxt}>Tentar de novo</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.botaoSecundario} onPress={sair} accessibilityRole="button">
          <Text style={styles.botaoSecundarioTxt}>Voltar ao app</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.tela, { backgroundColor: "#0B1F17" }]}>
      <StatusBar barStyle="light-content" />
      {/* Vídeo do outro lado, em tela cheia; sem câmera, vira o avatar com as iniciais */}
      {videoOutro ? (
        <VideoTrack trackRef={videoOutro as any} style={StyleSheet.absoluteFill as any} objectFit="cover" />
      ) : (
        <LinearGradient colors={["#1F5D3A", "#0B1F17"]} style={[StyleSheet.absoluteFill, styles.centro]}>
          {fase === "conectando" || fase === "aguardando" ? (
            <>
              <View style={styles.avatarGrande}><ActivityIndicator color="#fff" /></View>
              <Text style={styles.tituloCentro}>{fase === "conectando" ? "Entrando na sala…" : "Aguardando o outro participante"}</Text>
              <Text style={styles.textoCentro}>{fase === "aguardando" ? "Assim que a outra pessoa entrar, a chamada começa." : "Preparando câmera e microfone."}</Text>
            </>
          ) : (
            <>
              <View style={styles.avatarGrande}><Text style={styles.iniciais}>{iniciais(nomeOutro)}</Text></View>
              <Text style={styles.tituloCentro}>{nomeOutro}</Text>
              <Text style={styles.textoCentro}>Câmera desligada</Text>
            </>
          )}
        </LinearGradient>
      )}

      {/* Topo */}
      <LinearGradient colors={["rgba(0,0,0,0.55)", "transparent"]} style={[styles.topo, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.selo}>
          <View style={[styles.ponto, fase === "emChamada" && { backgroundColor: "#4ADE80" }]} />
          <Text style={styles.seloTxt}>{fase === "emChamada" ? `${nomeOutro} · ${formatarTempo(segundos)}` : "Reunião"}</Text>
        </View>
        {!!eu && <Text style={styles.sub}>Geladeira Virtual</Text>}
      </LinearGradient>

      {/* Meu vídeo em miniatura */}
      {local && (
        <View style={[styles.mini, { top: insets.top + 56 }]}>
          {videoEu ? (
            <VideoTrack trackRef={videoEu as any} style={StyleSheet.absoluteFill as any} objectFit="cover" mirror={frontal} zOrder={1} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.centro, { backgroundColor: "#1C2B24" }]}><Feather name="video-off" size={20} color="#9FB8AA" /></View>
          )}
        </View>
      )}

      {/* Controles */}
      <View style={[styles.controles, { paddingBottom: Math.max(insets.bottom, 14) + 8 }]}>
        <Botao icone={micLigado ? "mic" : "mic-off"} ativo={micLigado} onPress={alternarMic} rotulo={micLigado ? "Silenciar" : "Ativar microfone"} styles={styles} />
        <Botao icone={camLigada ? "video" : "video-off"} ativo={camLigada} onPress={alternarCamera} rotulo={camLigada ? "Desligar câmera" : "Ligar câmera"} styles={styles} />
        <Botao icone="refresh-cw" ativo onPress={virarCamera} rotulo="Virar câmera" styles={styles} />
        <TouchableOpacity style={[styles.botao, styles.encerrar]} onPress={sair} accessibilityRole="button" accessibilityLabel="Encerrar reunião">
          <Feather name="phone-off" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Botao({ icone, ativo, onPress, rotulo, styles }: { icone: any; ativo: boolean; onPress: () => void; rotulo: string; styles: any }) {
  return (
    <TouchableOpacity style={[styles.botao, !ativo && styles.botaoOff]} onPress={onPress} accessibilityRole="button" accessibilityLabel={rotulo}>
      <Feather name={icone} size={22} color={ativo ? "#fff" : "#1B1B1B"} />
    </TouchableOpacity>
  );
}

const criarStyles = () => StyleSheet.create({
  tela: { flex: 1 },
  centro: { alignItems: "center", justifyContent: "center", padding: 28, gap: 12 },
  avatarGrande: { width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  iniciais: { fontSize: 34, fontWeight: "800", color: "#fff" },
  tituloCentro: { fontSize: 20, fontWeight: "800", color: "#fff", textAlign: "center" },
  textoCentro: { fontSize: 14, color: "rgba(255,255,255,0.75)", textAlign: "center", lineHeight: 20 },
  botaoPrimario: { backgroundColor: "#fff", paddingVertical: 13, paddingHorizontal: 28, borderRadius: 16, marginTop: 10 },
  botaoPrimarioTxt: { color: "#1F5D3A", fontWeight: "800", fontSize: 15 },
  botaoSecundario: { paddingVertical: 10 },
  botaoSecundarioTxt: { color: "rgba(255,255,255,0.85)", fontWeight: "700", fontSize: 14 },
  topo: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 24, gap: 4 },
  selo: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  ponto: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#F5B942" },
  seloTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
  sub: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginLeft: 4 },
  mini: { position: "absolute", right: 14, width: 104, height: 148, borderRadius: 16, overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", backgroundColor: "#000" },
  controles: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", justifyContent: "center", gap: 14, paddingTop: 28, backgroundColor: "rgba(0,0,0,0.0)" },
  botao: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  botaoOff: { backgroundColor: "#fff" },
  encerrar: { backgroundColor: "#D6455D" },
});
