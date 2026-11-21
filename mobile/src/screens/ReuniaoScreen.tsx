import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, PermissionsAndroid, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { gravarConsulta, tokenDaReuniao } from "../services/nutri";
import { chaveData } from "../utils/dia";
import { codificar, decodificar, fmtL, resumoDoDia, TOPICO, type Fechamento, type Foco, type Mensagem, type MetaCombinada, type ResumoDia } from "../utils/reuniaoDados";
import { Chip, HUD, Vidro } from "../components/reuniao/hud";
import PainelNutri from "../components/reuniao/PainelNutri";
import PainelPaciente, { AvisoDaNutri } from "../components/reuniao/PainelPaciente";
import ReuniaoJitsi from "./ReuniaoJitsi";

/**
 * Reunião por vídeo com a cara do app: o vídeo e o áudio passam pelo LiveKit,
 * mas toda a tela é nossa, inclusive o painel de dados do paciente.
 *
 * O LiveKit usa módulos nativos de WebRTC, que não existem no Expo Go. Por
 * isso são carregados aqui com require: sem eles (Expo Go), a tela cai na sala
 * do Jitsi pela WebView, e o resto do app não é afetado.
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
const ALTURA_CONTROLES = 98;

const iniciais = (nome?: string) => (nome ?? "?").replace(/^(Dra?\.?)\s+/i, "").split(" ").filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join("") || "?";
const formatarTempo = (seg: number) => `${String(Math.floor(seg / 60)).padStart(2, "0")}:${String(seg % 60).padStart(2, "0")}`;
const rotuloFoco = (f: Foco) => (f.alvo === "refeicao" ? f.titulo ?? "Refeição" : f.titulo ?? f.alvo);

function ReuniaoNativa({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { vinculoId, perfil } = route.params as { vinculoId: string; nome?: string; perfil?: any };
  const { Room, RoomEvent, Track, VideoTrack, AudioSession } = LK!;

  const sala = useRef<any>(null);
  const [fase, setFase] = useState<Fase>("conectando");
  const [erro, setErro] = useState("");
  const [, repintar] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [tentativa, setTentativa] = useState(0);
  const [dados, setDados] = useState<{ papel: string; pacienteId: string; nomeNutri: string; nomePaciente: string } | null>(null);
  const ehNutri = dados?.papel === "nutricionista";

  // Painel de dados e o que os dois lados trocam durante a chamada
  const [painel, setPainel] = useState(false);
  const [resumo, setResumo] = useState<ResumoDia | null>(null);
  const [foco, setFoco] = useState<Foco | null>(null);
  const [metaCombinada, setMetaCombinada] = useState<MetaCombinada | undefined>();
  const [avisoMeta, setAvisoMeta] = useState<MetaCombinada | null>(null);
  const [notas, setNotas] = useState("");
  const [focos, setFocos] = useState<string[]>([]);
  const [fechamento, setFechamento] = useState<Fechamento | null>(null);
  const [salvo, setSalvo] = useState<"nao" | "ok" | "erro">("nao");

  const bump = useCallback(() => repintar((n) => n + 1), []);

  const enviar = useCallback((m: Mensagem) => {
    try { sala.current?.localParticipant?.publishData(codificar(m), { reliable: true, topic: TOPICO }); } catch {}
  }, []);

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
        const d = await tokenDaReuniao(vinculoId);
        if (!vivo) return;
        setDados({ papel: d.papel, pacienteId: d.pacienteId, nomeNutri: d.nomeNutri, nomePaciente: d.nomePaciente });

        [RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected, RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed,
          RoomEvent.TrackMuted, RoomEvent.TrackUnmuted, RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished].forEach((e) => room.on(e, bump));
        room.on(RoomEvent.Disconnected, () => { if (vivo) setFase((f) => (f === "erro" ? f : "encerrada")); });
        room.on(RoomEvent.DataReceived, (payload: Uint8Array, _p: any, _k: any, topico?: string) => {
          if (!vivo || (topico && topico !== TOPICO)) return;
          const m = decodificar(payload);
          if (!m) return;
          if (m.t === "resumo") setResumo(m.d);
          else if (m.t === "foco") setFoco(m.d);
          else if (m.t === "meta") { setMetaCombinada(m.d); setAvisoMeta(m.d); }
          else if (m.t === "fim") { setFechamento(m.d); setFase("encerrada"); room.disconnect().catch?.(() => {}); }
        });

        await AudioSession.startAudioSession();
        await room.connect(d.url, d.token);
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

  // Paciente: lê os próprios números e manda para a nutricionista (ao entrar, a cada 12 s e quando ela chega)
  const publicarResumo = useCallback(async () => {
    const r = await resumoDoDia().catch(() => null);
    if (!r) return;
    setResumo(r);
    enviar({ t: "resumo", d: r });
  }, [enviar]);
  useEffect(() => {
    if (!dados || ehNutri || (fase !== "aguardando" && fase !== "emChamada")) return;
    publicarResumo();
    const t = setInterval(publicarResumo, 12000);
    return () => clearInterval(t);
  }, [dados, ehNutri, fase, publicarResumo]);
  useEffect(() => { if (!ehNutri && outro) publicarResumo(); }, [outro?.identity]); // eslint-disable-line react-hooks/exhaustive-deps

  // O destaque some sozinho depois de um tempo
  useEffect(() => {
    if (!foco) return;
    const t = setTimeout(() => setFoco(null), 25000);
    return () => clearTimeout(t);
  }, [foco]);
  useEffect(() => {
    if (!avisoMeta) return;
    const t = setTimeout(() => setAvisoMeta(null), 12000);
    return () => clearTimeout(t);
  }, [avisoMeta]);

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

  const destacar = (f: Foco) => { enviar({ t: "foco", d: f }); setFocos((l) => (l.includes(rotuloFoco(f)) ? l : [...l, rotuloFoco(f)])); setPainel(false); };
  const combinarMeta = (m: MetaCombinada) => { setMetaCombinada(m); enviar({ t: "meta", d: m }); };

  // Nutricionista: encerrar manda o fechamento ao paciente e guarda o resumo no prontuário dele
  async function encerrar() {
    if (!ehNutri || !dados) { navigation.goBack(); return; }
    const f: Fechamento = { notas: notas.trim(), meta: metaCombinada, focos, duracaoSeg: segundos, nutricionista: dados.nomeNutri };
    setFechamento(f);
    const temConteudo = !!f.notas || !!f.meta || f.focos.length > 0;
    if (temConteudo) {
      enviar({ t: "fim", d: f });
      try { await gravarConsulta(dados.pacienteId, chaveData(new Date()), { ...f, quando: new Date().toISOString() }); setSalvo("ok"); }
      catch { setSalvo("erro"); }
    }
    setFase("encerrada");
    room?.disconnect().catch?.(() => {});
  }
  const sair = () => navigation.goBack();

  const styles = useMemo(() => criarStyles(), []);
  const nomeOutro = (ehNutri ? dados?.nomePaciente : dados?.nomeNutri) || outro?.name || "Participante";
  const nomePaciente = dados?.nomePaciente ?? "Paciente";

  if (fase === "erro") {
    return (
      <LinearGradient colors={["#14382A", "#0B1F17"]} style={[styles.tela, styles.centro, { paddingTop: insets.top }]}>
        <View style={styles.avatarGrande}><Feather name="video-off" size={34} color="#fff" /></View>
        <Text style={styles.tituloCentro}>Não foi possível entrar</Text>
        <Text style={styles.textoCentro}>{erro}</Text>
        <TouchableOpacity style={styles.botaoPrimario} onPress={() => setTentativa((n) => n + 1)} accessibilityRole="button"><Text style={styles.botaoPrimarioTxt}>Tentar de novo</Text></TouchableOpacity>
        <TouchableOpacity style={styles.botaoSecundario} onPress={sair} accessibilityRole="button"><Text style={styles.botaoSecundarioTxt}>Voltar ao app</Text></TouchableOpacity>
      </LinearGradient>
    );
  }

  if (fase === "encerrada") {
    const f = fechamento;
    return (
      <LinearGradient colors={["#14382A", "#06130D"]} style={[styles.tela, { paddingTop: insets.top + 24 }]}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 24 }}>
          <View style={{ alignItems: "center", gap: 8 }}>
            <View style={styles.avatarGrande}><Feather name="check" size={34} color={HUD.verde} /></View>
            <Text style={styles.tituloCentro}>Reunião encerrada</Text>
            <Text style={styles.textoCentro}>Duração: {formatarTempo(f?.duracaoSeg ?? segundos)}</Text>
          </View>
          {f && (f.notas || f.meta || f.focos.length > 0) ? (
            <Vidro brilho={HUD.verde} style={{ gap: 10 }}>
              <Text style={styles.resumoTitulo}>Resumo da consulta</Text>
              {!!f.meta && <Text style={styles.resumoTxt}>🎯 Meta combinada: {f.meta.kcal?.toLocaleString("pt-BR")} kcal · {fmtL(f.meta.aguaMl ?? 0)} de água</Text>}
              {f.focos.length > 0 && <Text style={styles.resumoTxt}>👀 Falamos de: {f.focos.join(", ")}</Text>}
              {!!f.notas && <Text style={styles.resumoTxt}>📝 {f.notas}</Text>}
              {ehNutri && salvo === "ok" && <Text style={[styles.resumoTxt, { color: HUD.verde }]}>✓ Resumo salvo no prontuário de {nomePaciente.split(" ")[0]}.</Text>}
              {ehNutri && salvo === "erro" && <Text style={[styles.resumoTxt, { color: HUD.rosa }]}>Não consegui salvar o resumo no servidor. Anote o que combinaram.</Text>}
              {!ehNutri && <Text style={styles.resumoNota}>Com {f.nutricionista}.</Text>}
            </Vidro>
          ) : <Text style={styles.textoCentro}>Nada foi anotado nesta reunião.</Text>}
          <TouchableOpacity style={styles.botaoPrimario} onPress={sair} accessibilityRole="button"><Text style={styles.botaoPrimarioTxt}>Voltar ao app</Text></TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    );
  }

  const fundoSheet = insets.bottom + ALTURA_CONTROLES;
  return (
    <View style={[styles.tela, { backgroundColor: "#0B1F17" }]}>
      <StatusBar barStyle="light-content" />
      {videoOutro ? (
        <VideoTrack trackRef={videoOutro as any} style={StyleSheet.absoluteFill as any} objectFit="cover" />
      ) : (
        <LinearGradient colors={["#1F5D3A", "#0B1F17"]} style={[StyleSheet.absoluteFill, styles.centro]}>
          {fase === "conectando" || fase === "aguardando" ? (
            <>
              <View style={styles.avatarGrande}><ActivityIndicator color="#fff" /></View>
              <Text style={styles.tituloCentro}>{fase === "conectando" ? "Entrando na sala…" : `Aguardando ${nomeOutro.split(" ")[0]}`}</Text>
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

      <LinearGradient colors={["rgba(0,0,0,0.55)", "transparent"]} style={[styles.topo, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.selo}>
          <View style={[styles.ponto, fase === "emChamada" && { backgroundColor: HUD.verde }]} />
          <Text style={styles.seloTxt}>{fase === "emChamada" ? `${nomeOutro.split(" ")[0]} · ${formatarTempo(segundos)}` : "Reunião"}</Text>
        </View>
      </LinearGradient>

      {/* Indicadores sempre à vista: tocar abre o painel */}
      {resumo && (fase === "emChamada" || fase === "aguardando") && (
        <View style={[styles.chips, { top: insets.top + 56 }]}>
          <Chip icone="zap" cor={HUD.verde} texto={`${resumo.kcal.toLocaleString("pt-BR")} / ${(metaCombinada?.kcal ?? resumo.metaKcal).toLocaleString("pt-BR")} kcal`} onPress={() => setPainel(true)} />
          <Chip icone="droplet" cor={HUD.ciano} texto={`${fmtL(resumo.aguaMl)} / ${fmtL(metaCombinada?.aguaMl ?? resumo.metaAguaMl)}`} onPress={() => setPainel(true)} />
          {resumo.treinoMin > 0 && <Chip icone="activity" cor={HUD.ambar} texto={`${resumo.treinoMin} min treino`} onPress={() => setPainel(true)} />}
        </View>
      )}

      {local && (
        <View style={[styles.mini, { top: insets.top + 56 }]}>
          {videoEu ? (
            <VideoTrack trackRef={videoEu as any} style={StyleSheet.absoluteFill as any} objectFit="cover" mirror={frontal} zOrder={1} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.centro, { backgroundColor: "#1C2B24" }]}><Feather name="video-off" size={20} color="#9FB8AA" /></View>
          )}
        </View>
      )}

      {/* Destaque da nutricionista / meta nova, sobre o vídeo do paciente */}
      {!ehNutri && !painel && <AvisoDaNutri foco={foco} meta={foco ? null : avisoMeta} aoDispensar={() => { setFoco(null); setAvisoMeta(null); }} bottom={fundoSheet + 8} />}

      {/* Controles, com nome embaixo de cada botão */}
      <View style={[styles.controles, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
        <Botao icone={micLigado ? "mic" : "mic-off"} ativo={micLigado} onPress={alternarMic} rotulo={micLigado ? "Mudo" : "Ativar"} styles={styles} />
        <Botao icone={camLigada ? "video" : "video-off"} ativo={camLigada} onPress={alternarCamera} rotulo="Câmera" styles={styles} />
        <Botao icone={ehNutri ? "layers" : "activity"} ativo={!painel} onPress={() => setPainel((v) => !v)} rotulo={ehNutri ? "Painel" : "Meu dia"} styles={styles} destaque />
        <Botao icone="refresh-cw" ativo onPress={virarCamera} rotulo="Virar" styles={styles} />
        <View style={styles.botaoCol}>
          <TouchableOpacity style={[styles.botao, styles.encerrar]} onPress={encerrar} accessibilityRole="button" accessibilityLabel="Encerrar reunião"><Feather name="phone-off" size={22} color="#fff" /></TouchableOpacity>
          <Text style={styles.botaoRot}>Encerrar</Text>
        </View>
      </View>

      {ehNutri && dados && (
        <PainelNutri aberta={painel} aoFechar={() => setPainel(false)} bottom={fundoSheet} pacienteId={dados.pacienteId} nomePaciente={nomePaciente} perfil={perfil ?? null}
          resumo={resumo} aoDestacar={destacar} aoCombinarMeta={combinarMeta} metaCombinada={metaCombinada} notas={notas} aoMudarNotas={setNotas} focosEnviados={focos} />
      )}
      {!ehNutri && <PainelPaciente aberta={painel} aoFechar={() => setPainel(false)} bottom={fundoSheet} resumo={resumo} meta={metaCombinada} foco={foco} />}
    </View>
  );
}

function Botao({ icone, ativo, onPress, rotulo, styles, destaque }: { icone: any; ativo: boolean; onPress: () => void; rotulo: string; styles: any; destaque?: boolean }) {
  return (
    <View style={styles.botaoCol}>
      <TouchableOpacity style={[styles.botao, !ativo && styles.botaoOff, destaque && styles.botaoDestaque]} onPress={onPress} accessibilityRole="button" accessibilityLabel={rotulo}>
        <Feather name={icone} size={22} color={!ativo ? "#1B1B1B" : destaque ? "#04130C" : "#fff"} />
      </TouchableOpacity>
      <Text style={styles.botaoRot}>{rotulo}</Text>
    </View>
  );
}

const criarStyles = () => StyleSheet.create({
  tela: { flex: 1 },
  centro: { alignItems: "center", justifyContent: "center", padding: 28, gap: 12 },
  avatarGrande: { width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  iniciais: { fontSize: 34, fontWeight: "800", color: "#fff" },
  tituloCentro: { fontSize: 20, fontWeight: "800", color: "#fff", textAlign: "center" },
  textoCentro: { fontSize: 14, color: "rgba(255,255,255,0.75)", textAlign: "center", lineHeight: 20 },
  botaoPrimario: { backgroundColor: HUD.verde, paddingVertical: 13, paddingHorizontal: 28, borderRadius: 16, marginTop: 10, alignSelf: "center" },
  botaoPrimarioTxt: { color: "#04130C", fontWeight: "800", fontSize: 15 },
  botaoSecundario: { paddingVertical: 10 },
  botaoSecundarioTxt: { color: "rgba(255,255,255,0.85)", fontWeight: "700", fontSize: 14 },
  resumoTitulo: { color: HUD.texto, fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  resumoTxt: { color: HUD.texto, fontSize: 14, lineHeight: 20 },
  resumoNota: { color: HUD.suave, fontSize: 12 },
  topo: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 24 },
  selo: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  ponto: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#F5B942" },
  seloTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
  chips: { position: "absolute", left: 14, gap: 6, alignItems: "flex-start" },
  mini: { position: "absolute", right: 14, width: 104, height: 148, borderRadius: 16, overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", backgroundColor: "#000" },
  controles: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", justifyContent: "center", gap: 12, paddingTop: 14 },
  botaoCol: { alignItems: "center", gap: 4 },
  botao: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  botaoOff: { backgroundColor: "#fff" },
  botaoDestaque: { backgroundColor: HUD.verde, shadowColor: HUD.verde, shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  botaoRot: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "700" },
  encerrar: { backgroundColor: "#D6455D" },
});
