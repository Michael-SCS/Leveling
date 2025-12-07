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
  const [esFavorito, setEsFavorito] = useState(false)

  const [mostrarFeedback, setMostrarFeedback] = useState(false)
  const [calificacion, setCalificacion] = useState(0)
  const [comentario, setComentario] = useState('')
  const [mostrarSuccess, setMostrarSuccess] = useState(false)
  const [datosEntrenamiento, setDatosEntrenamiento] = useState(null)
  const [fadeAnim] = useState(new Animated.Value(0))
  const [scaleAnim] = useState(new Animated.Value(0.8))

  useEffect(() => {
    loadRutinaDetalle()
    checkFavorito()
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

  const checkFavorito = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('rutinas_favoritas')
        .select('id')
        .eq('user_id', user.id)
        .eq('rutina_id', rutinaId)
        .single()

      setEsFavorito(!!data)
    } catch (error) {
      console.log('Error verificando favorito:', error)
    }
  }

  const toggleFavorito = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión')
        return
      }

      if (esFavorito) {
        const { error } = await supabase
          .from('rutinas_favoritas')
          .delete()
          .eq('user_id', user.id)
          .eq('rutina_id', rutinaId)

        if (error) throw error
        setEsFavorito(false)
        Alert.alert('✓', 'Eliminado de favoritos')
      } else {
        const { error } = await supabase
          .from('rutinas_favoritas')
          .insert([{
            user_id: user.id,
            rutina_id: rutinaId
          }])

        if (error) throw error
        setEsFavorito(true)
        Alert.alert('❤️', 'Agregado a favoritos')
      }
    } catch (error) {
      console.log('Error toggle favorito:', error)
      Alert.alert('Error', 'No se pudo actualizar favoritos')
    }
  }

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

  const guardarEntrenamientoConFeedback = async (omitido = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const ejerciciosIds = ejercicios
        .filter(e => ejerciciosCompletados.has(e.id))
        .map(e => e.ejercicios.id)

      const calificacionFinal = calificacion > 0 ? calificacion : null
      const comentarioFinal = comentario || null

      const now = new Date()
      const fechaActual = now.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/[^0-9-]/g, '')

      const horaActual = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })

      const { error } = await supabase
        .from('entrenamientos_completados')
        .insert([{
          user_id: user.id,
          rutina_id: rutinaId,
          duracion_minutos: datosEntrenamiento.duracionMinutos,
          calorias_quemadas: datosEntrenamiento.calorias,
          xp_ganada: datosEntrenamiento.xpGanada,
          ejercicios_completados: ejerciciosIds,
          fecha: fechaActual,
          hora: horaActual,
          calificacion: calificacionFinal,
          comentario: comentarioFinal
        }])

      if (error) throw error
      // 📧 Enviar feedback por correo
      if (calificacionFinal || comentarioFinal) {
        enviarFeedbackPorCorreo(user, calificacionFinal, comentarioFinal)
      }
      
      setMostrarFeedback(false)
      setEntrenandoActivo(false)
      setTiempoInicio(null)
      setCalificacion(0)
      setComentario('')

      setMostrarSuccess(true)
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start()

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 0.8, duration: 300, useNativeDriver: true }),
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
      const estrellas = calificacion ? '⭐'.repeat(calificacion) : 'N/A'
      const calificacionTexto = calificacion ? `${calificacion}/5` : 'Omitida';

      const asunto = `Nuevo Feedback: ${estrellas} (${calificacionTexto}) - ${rutina?.nombre}`

      const mensaje = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: 'Arial', sans-serif; 
      margin: 0; 
      padding: 0; 
      background: #f1f3f9;
      color: #333;
    }

    .container { 
      max-width: 650px; 
      margin: 30px auto; 
      background: #ffffff; 
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0px 8px 25px rgba(0,0,0,0.08);
    }

    .header {
      background: linear-gradient(135deg, #5e60ce 0%, #7400b8 100%);
      padding: 40px 20px;
      text-align: center;
      color: #fff;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: bold;
    }

    .content {
      padding: 30px;
      background: #fafbff;
    }

    .card {
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      border: 1px solid #e6e8f0;
      box-shadow: 0px 4px 12px rgba(0,0,0,0.05);
    }

    .label {
      font-weight: bold;
      color: #5e60ce;
    }

    .rating {
      font-size: 34px;
      text-align: center;
      margin: 12px 0;
    }

    .comment {
      background: #ffffff;
      padding: 20px;
      border-left: 5px solid #5e60ce;
      border-radius: 8px;
      font-style: italic;
      line-height: 1.6;
      color: #444;
    }

    .stats p {
      margin: 6px 0;
      font-size: 15px;
    }

    .footer {
      text-align: center; 
      padding: 20px;
      font-size: 13px;
      color: #9aa0b5;
    }
  </style>
</head>

<body>

<div class="container">

  <div class="header">
    <h1>💪 Nuevo Feedback de Entrenamiento</h1>
  </div>

  <div class="content">

    <!-- Usuario -->
    <div class="card">
      <p><span class="label">👤 Usuario:</span> ${nombreUsuario}</p>
      <p><span class="label">📧 Email:</span> ${user.email}</p>
      <p><span class="label">🏋️ Rutina:</span> ${rutina?.nombre}</p>
      <p><span class="label">📅 Fecha:</span> 
        ${new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}
      </p>
    </div>

    <!-- Calificación -->
    <div class="card">
      <p><span class="label">⭐ Calificación:</span></p>
      <div class="rating">${estrellas} <br>(${calificacionTexto})</div>
    </div>

    <!-- Comentario -->
    ${
      comentario 
      ? `
      <div class="card comment">
        <p><span class="label">💬 Comentario del usuario:</span></p>
        <p>"${comentario}"</p>
      </div>
      `
      : `
      <div class="card" style="text-align:center; color:#999;">
        <p>Sin comentarios adicionales</p>
      </div>
      `
    }

    <!-- Stats -->
    <div class="card stats">
      <p><span class="label">📊 Estadísticas del entrenamiento:</span></p>
      <p>⏱️ <strong>Duración:</strong> ${datosEntrenamiento.duracionMinutos} minutos</p>
      <p>🔥 <strong>Calorías quemadas:</strong> ${datosEntrenamiento.calorias} kcal</p>
      <p>🏃 <strong>Ejercicios completados:</strong> ${ejerciciosCompletados.size}/${ejercicios.length}</p>
      <p>⭐ <strong>XP Ganada:</strong> ${datosEntrenamiento.xpGanada}</p>
    </div>

  </div>

  <div class="footer">
    <p>Este es un correo automático del sistema de feedback de FitApp.</p>
    <p>No respondas a este mensaje.</p>
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

  const parsearParteTrabajada = (partes) => {
    // Si ya es un array, devolverlo limpio
    if (Array.isArray(partes)) {
      return partes.filter(Boolean)
    }
    // Si es string, hacer split
    if (typeof partes === 'string') {
      return partes.split(',').map(p => p.trim()).filter(Boolean)
    }
    // Si es null/undefined, devolver array vacío
    return []
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const partesDelCuerpo = parsearParteTrabajada(rutina?.parte_trabajada || '')

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* HEADER CON IMAGEN */}
        <View style={styles.headerContainer}>
          {rutina?.imagen_url && (
            <Image
              source={{ uri: rutina.imagen_url }}
              style={styles.headerImage}
              contentFit="cover"
            />
          )}

          {/* Botones superiores */}
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.iconButton}
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
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={toggleFavorito}
            >
              <MaterialIcons
                name={esFavorito ? "favorite" : "favorite-border"}
                size={24}
                color={esFavorito ? "#FF6B6B" : "#FFFFFF"}
              />
            </TouchableOpacity>
          </View>

          {/* Timer flotante */}
          {entrenandoActivo && (
            <View style={styles.timerFloating}>
              <MaterialIcons name="timer" size={20} color="#FFFFFF" />
              <Text style={styles.timerFloatingText}>{formatearTiempo(tiempoTranscurrido)}</Text>
            </View>
          )}
        </View>

        {/* INFORMACIÓN DE LA RUTINA - FONDO NEGRO */}
        <View style={styles.infoSection}>
          <Text style={styles.titulo}>{rutina?.nombre?.toUpperCase()}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <MaterialIcons name="signal-cellular-alt" size={16} color="#FFFFFF" />
              <Text style={styles.metaText}>{rutina?.nivel}</Text>
            </View>

            <View style={styles.metaBadge}>
              <MaterialIcons name="fitness-center" size={16} color="#FFFFFF" />
              <Text style={styles.metaText}>
                {rutina?.equipo ? 'Con equipo' : 'Sin equipo'}
              </Text>
            </View>

            <View style={styles.metaBadge}>
              <MaterialIcons name="place" size={16} color="#FFFFFF" />
              <Text style={styles.metaText}>{rutina?.lugar || 'No especificado'}</Text>
            </View>
          </View>

          <Text style={styles.descripcion}>{rutina?.descripcion}</Text>

          {/* PARTES DEL CUERPO TRABAJADAS */}
          {partesDelCuerpo.length > 0 && (
            <View style={styles.partesSection}>
              <Text style={styles.partesTitle}>💪 Partes trabajadas</Text>
              <View style={styles.partesTags}>
                {partesDelCuerpo.map((parte, index) => (
                  <View key={index} style={styles.parteTag}>
                    <Text style={styles.parteTagText}>{parte}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* EJERCICIOS */}
        <View style={styles.ejerciciosSection}>
          <Text style={styles.ejerciciosSectionTitle}>
            Ejercicios ({ejercicios.length})
          </Text>

          {ejercicios.map((item, index) => {
            const completado = ejerciciosCompletados.has(item.id)

            return (
              <View
                key={item.id}
                style={[styles.ejercicioCard, completado && styles.ejercicioCardCompletado]}
              >
                <View style={styles.ejercicioHeader}>
                  <Text style={styles.ejercicioNumero}>{index + 1}</Text>
                  <Text style={styles.ejercicioNombre}>{item.ejercicios?.nombre}</Text>

                  {entrenandoActivo && (
                    <TouchableOpacity
                      onPress={() => toggleEjercicioCompletado(item.id)}
                      style={[
                        styles.checkButton,
                        completado && styles.checkButtonCompletado
                      ]}
                    >
                      <MaterialIcons
                        name={completado ? "check" : "radio-button-unchecked"}
                        size={24}
                        color={completado ? "#4CAF50" : "#666"}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.ejercicioSeries}>
                  {item.series} series × {item.repeticiones} reps
                </Text>

                {item.ejercicios?.gif_url && (
                  <Image
                    source={{ uri: item.ejercicios.gif_url }}
                    style={styles.ejercicioGif}
                    contentFit="cover"
                    autoplay
                    loop
                  />
                )}

                {item.ejercicios?.instrucciones && (
                  <Text style={styles.ejercicioInstrucciones}>
                    {item.ejercicios.instrucciones}
                  </Text>
                )}

                {entrenandoActivo && (
                  <TouchableOpacity
                    style={styles.descansoButton}
                    onPress={() => iniciarDescanso(item, item.tiempo_descanso_segundos)}
                  >
                    <MaterialIcons name="schedule" size={18} color="#FFFFFF" />
                    <Text style={styles.descansoButtonText}>
                      Descanso ({item.tiempo_descanso_segundos || 60}s)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })}
        </View>

        {/* BOTÓN PRINCIPAL */}
        <View style={styles.bottomButtonContainer}>
          {!entrenandoActivo ? (
            <TouchableOpacity style={styles.startButton} onPress={handleIniciarEntrenamiento}>
              <LinearGradient
                colors={[COLORS.primary, '#8B7FE8']}
                style={styles.startButtonGradient}
              >
                <MaterialIcons name="play-arrow" size={28} color="#FFFFFF" />
                <Text style={styles.startButtonText}>Iniciar Entrenamiento</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.startButton, ejerciciosCompletados.size === 0 && styles.startButtonDisabled]}
              onPress={handleFinalizarEntrenamiento}
              disabled={ejerciciosCompletados.size === 0}
            >
              <LinearGradient
                colors={['#4CAF50', '#45a049']}
                style={styles.startButtonGradient}
              >
                <MaterialIcons name="check-circle" size={28} color="#FFFFFF" />
                <Text style={styles.startButtonText}>Finalizar</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* MODAL TIMER DESCANSO */}
      <Modal visible={mostrarTimer} transparent animationType="fade">
        <View style={styles.timerModalOverlay}>
          <View style={styles.timerModal}>
            <Text style={styles.timerModalTitle}>⏸️ Descanso</Text>

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
              Ejercicio Actual: {ejercicioActual?.ejercicios?.nombre}
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

      {/* MODAL FEEDBACK */}
      <Modal visible={mostrarFeedback} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.feedbackOverlay}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1}>
            <View style={styles.feedbackModalContainer}>
              <View style={styles.feedbackModal}>
                <View style={styles.feedbackHeader}>
                  <MaterialIcons name="chat-bubble-outline" size={32} color={COLORS.primary} />
                  <Text style={styles.feedbackTitle}>Tu opinión importa</Text>
                  <Text style={styles.feedbackSubtitle}>
                    ¿Qué tal estuvo el entrenamiento?
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
                      setCalificacion(0)
                      setComentario('')
                      guardarEntrenamientoConFeedback(true)
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
                      <MaterialIcons name="send" size={18} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* SUCCESS TOAST */}
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
            <MaterialIcons name="celebration" size={48} color="#FFFFFF" />
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
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },

  // HEADER
  headerContainer: {
    height: 300,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerButtons: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  timerFloating: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  timerFloatingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // SECCIÓN INFO
  infoSection: {
    backgroundColor: '#000000',
    padding: 24,
    paddingTop: 28,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: 1,
    lineHeight: 34,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  metaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  descripcion: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.9,
  },

  // PARTES DEL CUERPO
  partesSection: {
    marginTop: 8,
  },
  partesTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  partesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  parteTag: {
    backgroundColor: COLORS.primary + '30',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '50',
  },
  parteTagText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // EJERCICIOS
  ejerciciosSection: {
    padding: 24,
    paddingTop: 8,
  },
  ejerciciosSectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 20,
  },
  ejercicioCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  ejercicioCardCompletado: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a2a1a',
  },
  ejercicioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  ejercicioNumero: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 32,
  },
  ejercicioNombre: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  checkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkButtonCompletado: {
    backgroundColor: '#4CAF5020',
  },
  ejercicioSeries: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 14,
  },
  ejercicioGif: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#000',
  },
  ejercicioInstrucciones: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.8,
    marginBottom: 12,
  },
  descansoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  descansoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // BOTÓN PRINCIPAL
  bottomButtonContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // MODAL TIMER
  timerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerModal: {
    backgroundColor: '#1a1a1a',
    padding: 32,
    borderRadius: 24,
    width: '85%',
    alignItems: 'center',
  },
  timerModalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 24,
  },
  timerModalTiempo: {
    fontSize: 64,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 12,
  },
  timerModalNext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
  },
  timerModalButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  timerModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  // MODAL FEEDBACK
  feedbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  feedbackModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  feedbackModal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 28,
    paddingBottom: 40,
  },
  feedbackHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  feedbackTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  feedbackSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
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
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 100,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
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
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#333',
  },
  feedbackButtonSecondaryText: {
    color: '#999',
    fontWeight: '700',
    fontSize: 16,
  },
  feedbackButtonPrimary: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  feedbackButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  feedbackButtonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },

  // SUCCESS TOAST
  successToast: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 9999,
  },
  successToastGradient: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 32,
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
    color: '#FFFFFF',
    marginTop: 8,
  },
  successStatLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
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
  },
  successXPText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFD700',
  },
})