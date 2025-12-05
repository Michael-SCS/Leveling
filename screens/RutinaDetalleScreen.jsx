import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

  // 🎯 Nuevos estados para el feedback y success
  const [mostrarFeedback, setMostrarFeedback] = useState(false)
  const [calificacion, setCalificacion] = useState(0)
  const [comentario, setComentario] = useState('')
  const [mostrarSuccess, setMostrarSuccess] = useState(false)
  const [datosEntrenamiento, setDatosEntrenamiento] = useState(null)
  const [fadeAnim] = useState(new Animated.Value(0))
  const [scaleAnim] = useState(new Animated.Value(0.8))

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

  const handleFinalizarEntrenamiento = () => {
    if (ejerciciosCompletados.size === 0) {
      Alert.alert('Espera', 'Marca al menos un ejercicio como completado para registrar tu esfuerzo.')
      return
    }

    const calorias = calcularCaloriasQuemadas()
    const xpGanada = calcularXPGanada()
    const duracionMinutos = Math.floor(tiempoTranscurrido / 60)

    setDatosEntrenamiento({
      calorias,
      xpGanada,
      duracionMinutos
    })

    setMostrarFeedback(true)
  }

  const guardarEntrenamientoConFeedback = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const ejerciciosIds = ejercicios
        .filter(e => ejerciciosCompletados.has(e.id))
        .map(e => e.ejercicios.id)

      const { error } = await supabase
        .from('entrenamientos_completados')
        .insert([{
          user_id: user.id,
          rutina_id: rutinaId,
          duracion_minutos: datosEntrenamiento.duracionMinutos,
          calorias_quemadas: datosEntrenamiento.calorias,
          xp_ganada: datosEntrenamiento.xpGanada,
          ejercicios_completados: ejerciciosIds,
          fecha: new Date().toISOString(),
          calificacion: calificacion,
          comentario: comentario || null
        }])

      if (error) throw error

      // 📧 Enviar feedback por correo si hay calificación o comentario
      if (calificacion > 0 || comentario) {
        enviarFeedbackPorCorreo(user, calificacion, comentario)
      }

      setMostrarFeedback(false)
      setEntrenandoActivo(false)
      setTiempoInicio(null)

      // Mostrar success toast con animación
      setMostrarSuccess(true)
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start()

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setMostrarSuccess(false)
          navigation.goBack()
        })
      }, 3000)

    } catch (error) {
      console.log('Error guardando entrenamiento:', error)
      Alert.alert('Error', 'No se pudo guardar el entrenamiento')
    }
  }

  const enviarFeedbackPorCorreo = async (user, calificacion, comentario) => {
    try {
      console.log('🚀 Iniciando envío de email...')

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('nombre_completo')
        .eq('user_id', user.id)
        .single()

      const nombreUsuario = perfil?.nombre_completo || user.email || 'Usuario'
      const estrellas = '⭐'.repeat(calificacion)

      const asunto = `Nuevo Feedback: ${estrellas} (${calificacion}/5) - ${rutina?.nombre}`

      const mensaje = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 10px; margin-top: 20px; }
    .rating { font-size: 32px; margin: 10px 0; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .label { font-weight: bold; color: #667eea; }
    .comment { background: white; padding: 20px; border-left: 4px solid #667eea; margin-top: 20px; font-style: italic; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💪 Nuevo Feedback de Entrenamiento</h1>
    </div>
    
    <div class="content">
      <div class="info">
        <p><span class="label">👤 Usuario:</span> ${nombreUsuario}</p>
        <p><span class="label">📧 Email:</span> ${user.email}</p>
        <p><span class="label">🏋️ Rutina:</span> ${rutina?.nombre}</p>
        <p><span class="label">📅 Fecha:</span> ${new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
      </div>

      <div class="info">
        <p><span class="label">Calificación:</span></p>
        <div class="rating">${estrellas} (${calificacion}/5)</div>
      </div>

      ${comentario ? `
      <div class="comment">
        <p><span class="label">💬 Comentario del usuario:</span></p>
        <p>"${comentario}"</p>
      </div>
      ` : '<p style="text-align: center; color: #999;">Sin comentarios adicionales</p>'}

      <div class="info">
        <p><span class="label">📊 Estadísticas del entrenamiento:</span></p>
        <p>⏱️ Duración: ${datosEntrenamiento.duracionMinutos} minutos</p>
        <p>🔥 Calorías: ${datosEntrenamiento.calorias} kcal</p>
        <p>✅ Ejercicios completados: ${ejerciciosCompletados.size}/${ejercicios.length}</p>
        <p>⭐ XP ganada: ${datosEntrenamiento.xpGanada}</p>
      </div>
    </div>

    <div class="footer">
      <p>Este es un correo automático del sistema de feedback de FitApp</p>
      <p>No respondas a este correo</p>
    </div>
  </div>
</body>
</html>
    `

      console.log('📨 Invocando Edge Function...')
      console.log('📧 Destinatario:', 'Bekurooficial@gmail.com')
      console.log('📝 Asunto:', asunto)

      const { data, error: emailError } = await supabase.functions.invoke('send-feedback-email', {
        body: {
          to: 'bekurooficial@gmail.com',
          subject: asunto,
          html: mensaje
        }
      })

      if (emailError) {
        console.error('❌ Error invocando función:', JSON.stringify(emailError, null, 2))
        return
      }

      console.log('✅ Respuesta de la función:', JSON.stringify(data, null, 2))

    } catch (error) {
      console.error('❌ Error general en enviarFeedbackPorCorreo:', error)
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

      <Modal visible={mostrarFeedback} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.feedbackOverlay}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
          >
            <View style={styles.feedbackModalContainer}>
              <View style={styles.feedbackModal}>
                <View style={styles.feedbackHeader}>
                  <MaterialIcons name="chat-bubble-outline" size={32} color={COLORS.primary} />
                  <Text style={styles.feedbackTitle}>Tu opinión importa</Text>
                  <Text style={styles.feedbackSubtitle}>
                    Queremos darte la mejor experiencia. Cuéntanos qué tal estuvo 💪💜
                  </Text>
                </View>

                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setCalificacion(star)}
                      style={styles.starButton}
                    >
                      <MaterialIcons
                        name={star <= calificacion ? "star" : "star-border"}
                        size={40}
                        color={star <= calificacion ? "#FFD700" : COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Cuéntanos tu experiencia... (opcional)"
                  placeholderTextColor={COLORS.textSecondary}
                  multiline
                  numberOfLines={4}
                  value={comentario}
                  onChangeText={setComentario}
                  textAlignVertical="top"
                />

                <View style={styles.feedbackButtons}>
                  <TouchableOpacity
                    style={styles.feedbackButtonSecondary}
                    onPress={() => {
                      setMostrarFeedback(false)
                      guardarEntrenamientoConFeedback()
                    }}
                  >
                    <Text style={styles.feedbackButtonSecondaryText}>Omitir</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.feedbackButtonPrimary,
                      calificacion === 0 && { opacity: 0.6 }
                    ]}
                    onPress={guardarEntrenamientoConFeedback}
                    disabled={calificacion === 0}
                  >
                    <LinearGradient
                      colors={[COLORS.primary, '#8B7FE8']}
                      style={styles.feedbackButtonGradient}
                    >
                      <Text style={styles.feedbackButtonPrimaryText}>Enviar</Text>
                      <MaterialIcons name="send" size={18} color={COLORS.white} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {mostrarSuccess && (
        <Animated.View
          style={[
            styles.successToast,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={[COLORS.primary, '#8B7FE8']}
            style={styles.successToastGradient}
          >
            <View style={styles.successIconContainer}>
              <MaterialIcons name="celebration" size={48} color={COLORS.white} />
            </View>

            <Text style={styles.successTitle}>¡Felicidades!</Text>
            <Text style={styles.successSubtitle}>Entrenamiento completado</Text>

            <View style={styles.successStats}>
              <View style={styles.successStatItem}>
                <MaterialIcons name="schedule" size={24} color="#FFD700" />
                <Text style={styles.successStatValue}>{datosEntrenamiento?.duracionMinutos}</Text>
                <Text style={styles.successStatLabel}>minutos</Text>
              </View>

              <View style={styles.successStatDivider} />

              <View style={styles.successStatItem}>
                <MaterialIcons name="fitness-center" size={24} color="#FFD700" />
                <Text style={styles.successStatValue}>{ejerciciosCompletados.size}/{ejercicios.length}</Text>
                <Text style={styles.successStatLabel}>ejercicios</Text>
              </View>

              <View style={styles.successStatDivider} />

              <View style={styles.successStatItem}>
                <MaterialIcons name="local-fire-department" size={24} color="#FFD700" />
                <Text style={styles.successStatValue}>{datosEntrenamiento?.calorias}</Text>
                <Text style={styles.successStatLabel}>kcal</Text>
              </View>
            </View>

            <View style={styles.successXPContainer}>
              <MaterialIcons name="star" size={28} color="#FFD700" />
              <Text style={styles.successXPText}>+{datosEntrenamiento?.xpGanada} XP</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

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
  timerModalButtonText: { color: COLORS.white, textAlign: 'center', fontWeight: 'bold', fontSize: 16 },

  feedbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  feedbackModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  feedbackModal: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 28,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  feedbackHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  feedbackTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  feedbackSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  feedbackInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 100,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border + '40',
    fontWeight: '500',
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackButtonSecondary: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border + '40',
  },
  feedbackButtonSecondaryText: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 16,
  },
  feedbackButtonPrimary: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  feedbackButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  feedbackButtonPrimaryText: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
  },

  successToast: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 9999,
  },
  successToastGradient: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  successSubtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 32,
    fontWeight: '600',
  },
  successStats: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  successStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  successStatValue: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.white,
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  successStatLabel: {
    fontSize: 11,
    color: COLORS.white,
    opacity: 0.8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  successStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  successXPContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.4)',
  },
  successXPText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
})