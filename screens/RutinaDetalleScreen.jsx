import { Image } from 'expo-image'; // 👈 CAMBIO IMPORTANTE
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { COLORS } from '../constants/colors';
import { supabase } from '../lib/supabase';

export default function RutinaDetalleScreen({ route, navigation }) {
  const { rutinaId } = route.params
  const [loading, setLoading] = useState(true)
  const [rutina, setRutina] = useState(null)
  const [ejercicios, setEjercicios] = useState([])
  const [ejerciciosCompletados, setEjerciciosCompletados] = useState(new Set())
  const [entrenandoActivo, setEntrenandoActivo] = useState(false)
  const [tiempoInicio, setTiempoInicio] = useState(null)
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)
  const [ejercicioActual, setEjercicioActual] = useState(null)
  const [timerDescanso, setTimerDescanso] = useState(0)
  const [mostrarTimer, setMostrarTimer] = useState(false)

  useEffect(() => {
    loadRutinaDetalle()
  }, [])

  useEffect(() => {
    let interval
    if (entrenandoActivo && tiempoInicio) {
      interval = setInterval(() => {
        const ahora = Date.now()
        const transcurrido = Math.floor((ahora - tiempoInicio) / 1000)
        setTiempoTranscurrido(transcurrido)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [entrenandoActivo, tiempoInicio])

  useEffect(() => {
    let interval
    if (timerDescanso > 0) {
      interval = setInterval(() => {
        setTimerDescanso(prev => {
          if (prev <= 1) {
            setMostrarTimer(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerDescanso])

  const loadRutinaDetalle = async () => {
    try {
      const { data: rutinaData, error: rutinaError } = await supabase
        .from('rutinas_predefinidas')
        .select('*')
        .eq('id', rutinaId)
        .single()

      if (rutinaError) throw rutinaError
      setRutina(rutinaData)

      const { data: ejerciciosData, error: ejerciciosError } = await supabase
        .from('rutinas_ejercicios')
        .select(`
          id,
          orden,
          series,
          repeticiones,
          tiempo_descanso_segundos,
          ejercicios (
            id,
            nombre,
            grupo_muscular,
            instrucciones,
            gif_url,
            video_url
          )
        `)
        .eq('rutina_id', rutinaId)
        .order('orden', { ascending: true })

      if (ejerciciosError) throw ejerciciosError

      setEjercicios(ejerciciosData || [])
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la rutina')
      console.log('Error cargando rutina:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleIniciarEntrenamiento = () => {
    setEntrenandoActivo(true)
    setTiempoInicio(Date.now())
    setEjerciciosCompletados(new Set())
  }

  const toggleEjercicioCompletado = (id) => {
    const nuevos = new Set(ejerciciosCompletados)
    nuevos.has(id) ? nuevos.delete(id) : nuevos.add(id)
    setEjerciciosCompletados(nuevos)
  }

  const iniciarDescanso = (ejercicio, segundos) => {
    setEjercicioActual(ejercicio)
    setTimerDescanso(segundos || 60)
    setMostrarTimer(true)
  }

  const calcularXPGanada = () => {
    if (ejercicios.length === 0) return 0
    const porcentaje = (ejerciciosCompletados.size / ejercicios.length)
    return Math.floor(100 * porcentaje)
  }

  const calcularCaloriasQuemadas = () => {
    const duracionMinutos = Math.floor(tiempoTranscurrido / 60)
    let factorCalorico = 5

    if (rutina?.nivel === 'Intermedio') {
      factorCalorico = 6
    } else if (rutina?.nivel === 'Avanzado') {
      factorCalorico = 8
    }

    return Math.floor(duracionMinutos * factorCalorico)
  }

  const handleFinalizarEntrenamiento = async () => {
  if (ejerciciosCompletados.size === 0) {
    Alert.alert('Espera', 'Marca al menos un ejercicio como completado para registrar tu esfuerzo.')
    return
  }

  const calorias = calcularCaloriasQuemadas()
  const xpGanada = calcularXPGanada()
  const duracionMinutos = Math.floor(tiempoTranscurrido / 60)

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    // 👇 CAMBIO AQUÍ: Extraer los IDs de ejercicios reales
    const ejerciciosIds = ejercicios
      .filter(e => ejerciciosCompletados.has(e.id))
      .map(e => e.ejercicios.id) // Obtener el ID del ejercicio real

    await supabase
      .from('entrenamientos_completados')
      .insert([{
        user_id: user.id,
        rutina_id: rutinaId,
        duracion_minutos: duracionMinutos,
        calorias_quemadas: calorias,
        xp_ganada: xpGanada,
        ejercicios_completados: ejerciciosIds, // 👈 Usar los IDs de ejercicios reales
        fecha: new Date().toISOString()
      }])

    Alert.alert(
      '¡Felicidades!',
      `🔥 Entrenamiento completado\n\n⏱️ Duración: ${duracionMinutos} min\n💪 Ejercicios: ${ejerciciosCompletados.size}/${ejercicios.length}\n🔥 Calorías: ${calorias}\n⭐ XP: +${xpGanada}`,
      [{ text: 'Genial', onPress: () => navigation.goBack() }]
    )
    setEntrenandoActivo(false)
    setTiempoInicio(null)
  } catch (error) {
    console.log('Error guardando entrenamiento:', error)
    Alert.alert('Error', 'No se pudo guardar el entrenamiento')
  }
}

  const formatearTiempo = (segundos) => {
    const m = Math.floor(segundos / 60).toString().padStart(2, '0')
    const s = (segundos % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.headerImageContainer}>
        {rutina?.imagen_url && (
          <Image
            source={{ uri: rutina.imagen_url }}
            style={styles.headerImage}
            contentFit="cover"
            autoplay
            loop
          />
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)', COLORS.background]}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (entrenandoActivo) {
                  Alert.alert(
                    'Salir',
                    '¿Quieres salir sin finalizar?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Salir', onPress: () => navigation.goBack(), style: 'destructive' }
                    ]
                  )
                } else navigation.goBack()
              }}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            {entrenandoActivo && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerIcon}>⏱️</Text>
                <Text style={styles.timerText}>{formatearTiempo(tiempoTranscurrido)}</Text>
              </View>
            )}
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{rutina?.nombre}</Text>
            <Text style={styles.headerDescripcion}>{rutina?.descripcion}</Text>
          </View>
        </LinearGradient>
      </View>

      {/* EJERCICIOS */}
      <ScrollView style={styles.ejerciciosScroll} contentContainerStyle={styles.ejerciciosContent}>
        {ejercicios.length === 0 ? (
          <Text style={{ color: COLORS.text, textAlign: 'center', marginTop: 40 }}>
            No hay ejercicios en la rutina
          </Text>
        ) : (
          ejercicios.map((item, index) => {
            const completado = ejerciciosCompletados.has(item.id)

            return (
              <View
                key={item.id}
                style={[styles.ejercicioCard, completado && { borderColor: COLORS.success }]}
              >
                <View style={styles.ejercicioHeader}>
                  <Text style={styles.ejercicioNombre}>
                    {index + 1}. {item.ejercicios?.nombre}
                  </Text>

                  {entrenandoActivo && (
                    <TouchableOpacity
                      onPress={() => toggleEjercicioCompletado(item.id)}
                      style={[
                        styles.checkButton,
                        completado && { backgroundColor: COLORS.success }
                      ]}
                    >
                      <Text style={styles.checkIcon}>
                        {completado ? '✓' : '○'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.ejercicioSub}>
                  {item.series} series × {item.repeticiones} reps
                </Text>

                {/* GIF ANIMADO */}
                {item.ejercicios?.gif_url && (
                  <Image
                    source={{ uri: item.ejercicios.gif_url }}
                    style={styles.mediaEjercicio}
                    contentFit="cover"
                    autoplay
                    loop
                  />
                )}

                {item.ejercicios?.instrucciones && (
                  <Text style={styles.instrucciones}>{item.ejercicios.instrucciones}</Text>
                )}

                {entrenandoActivo && (
                  <TouchableOpacity
                    style={[
                      styles.descansoButton,
                      {
                        backgroundColor: completado
                          ? '#4CAF5080'
                          : COLORS.primary
                      }]}
                    onPress={() => iniciarDescanso(item, item.tiempo_descanso_segundos)}
                  >
                    <Text style={styles.descansoButtonText}>
                      ⏱️ Tomar Descanso ({item.tiempo_descanso_segundos || 60}s)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })
        )}

        {ejercicios.length > 0 && (
          !entrenandoActivo ? (
            <TouchableOpacity style={styles.startButton} onPress={handleIniciarEntrenamiento}>
              <Text style={styles.startButtonText}>Iniciar Entrenamiento 🔥</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.startButton, ejerciciosCompletados.size === 0 && { opacity: 0.5 }]}
              onPress={handleFinalizarEntrenamiento}
              disabled={ejerciciosCompletados.size === 0}
            >
              <Text style={styles.startButtonText}>Finalizar ✓</Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>

      {/* MODAL DESCANSO */}
      <Modal visible={mostrarTimer} transparent animationType="fade">
        <View style={styles.timerModalOverlay}>
          <View style={styles.timerModal}>
            <Text style={styles.timerModalTitle}>Descanso</Text>

            {ejercicioActual?.ejercicios?.gif_url && (
              <Image
                source={{ uri: ejercicioActual.ejercicios.gif_url }}
                style={styles.modalImage}
                contentFit="cover"
                autoplay
                loop
              />
            )}

            <Text style={styles.timerModalTiempo}>{formatearTiempo(timerDescanso)}</Text>

            <Text style={styles.timerModalNext}>
              Próximo: {ejercicioActual?.ejercicios?.nombre}
            </Text>

            <TouchableOpacity
              style={styles.timerModalButton}
              onPress={() => setMostrarTimer(false)}
            >
              <Text style={styles.timerModalButtonText}>Saltar Descanso</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerImageContainer: { height: 350 },
  headerImage: { width: '100%', height: '100%', position: 'absolute' },
  headerGradient: { flex: 1, padding: 20, justifyContent: 'flex-end' },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButtonText: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15
  },
  timerIcon: { fontSize: 16, marginRight: 5 },
  timerText: { color: COLORS.white, fontWeight: 'bold' },
  headerContent: { marginTop: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
  headerDescripcion: { color: COLORS.white, opacity: 0.9, marginTop: 6 },
  ejerciciosScroll: { flex: 1 },
  ejerciciosContent: { padding: 16 },
  ejercicioCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  ejercicioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  ejercicioNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    flexShrink: 1
  },
  ejercicioSub: { color: COLORS.primary, marginTop: 6, fontWeight: '600' },

  mediaEjercicio: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginTop: 15,
    backgroundColor: COLORS.surface
  },

  instrucciones: { marginTop: 8, color: COLORS.textSecondary, fontSize: 13 },
  checkButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary
  },
  checkIcon: { fontSize: 20, color: COLORS.white, lineHeight: 22 },
  descansoButton: { marginTop: 15, padding: 12, borderRadius: 10 },
  descansoButtonText: { textAlign: 'center', color: COLORS.white, fontWeight: 'bold' },

  startButton: {
    marginTop: 30,
    marginBottom: 20,
    marginHorizontal: 10,
    padding: 18,
    backgroundColor: COLORS.primary,
    borderRadius: 14
  },
  startButtonText: { textAlign: 'center', color: COLORS.white, fontSize: 18, fontWeight: '900' },

  timerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  timerModal: {
    backgroundColor: COLORS.card,
    padding: 30,
    borderRadius: 20,
    width: '85%',
    alignItems: 'center'
  },
  timerModalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, color: COLORS.text },
  modalImage: { width: '100%', height: 150, borderRadius: 10, marginBottom: 20 },
  timerModalTiempo: { fontSize: 56, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10 },
  timerModalNext: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  timerModalButton: {
    marginTop: 30,
    backgroundColor: COLORS.primary,
    padding: 15,
    width: '100%',
    borderRadius: 12
  },
  timerModalButtonText: { color: COLORS.white, textAlign: 'center', fontWeight: 'bold', fontSize: 16 }
})
