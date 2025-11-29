import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'
import { COLORS } from '../constants/colors'

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
  const [serieActual, setSerieActual] = useState(1)
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

      // Cargar TODOS los ejercicios de la rutina (sin filtrar por día)
      const { data: ejerciciosData, error: ejerciciosError } = await supabase
        .from('rutina_predefinida_ejercicios')
        .select(`
          *,
          ejercicios (*)
        `)
        .eq('rutina_id', rutinaId)
        .order('dia_semana', { ascending: true })
        .order('orden', { ascending: true })

      if (ejerciciosError) throw ejerciciosError
      setEjercicios(ejerciciosData || [])
    } catch (error) {
      console.log('Error cargando detalle:', error)
      Alert.alert('Error', 'No se pudo cargar la rutina')
    } finally {
      setLoading(false)
    }
  }

  const handleIniciarEntrenamiento = () => {
    setEntrenandoActivo(true)
    setTiempoInicio(Date.now())
    setEjerciciosCompletados(new Set())
    Alert.alert('¡Vamos! 💪', 'Entrenamiento iniciado. ¡Dale con todo!')
  }

  const toggleEjercicioCompletado = (ejercicioId) => {
    const nuevosCompletados = new Set(ejerciciosCompletados)
    if (nuevosCompletados.has(ejercicioId)) {
      nuevosCompletados.delete(ejercicioId)
    } else {
      nuevosCompletados.add(ejercicioId)
    }
    setEjerciciosCompletados(nuevosCompletados)
  }

  const iniciarDescanso = (ejercicio, segundos) => {
    setEjercicioActual(ejercicio)
    setTimerDescanso(segundos)
    setMostrarTimer(true)
  }

  const calcularXPGanada = () => {
    const porcentajeCompletado = (ejerciciosCompletados.size / ejercicios.length) * 100
    let xpBase = 50

    // Bonus por completar todo
    if (porcentajeCompletado === 100) xpBase += 50

    // Bonus por tiempo (menos de 60 min)
    if (tiempoTranscurrido < 3600) xpBase += 20

    return Math.floor(xpBase * (porcentajeCompletado / 100))
  }

  const calcularCaloriasQuemadas = () => {
    // Fórmula aproximada: 5 calorías por minuto de entrenamiento intenso
    const minutos = Math.floor(tiempoTranscurrido / 60)
    return minutos * 5
  }

  const handleFinalizarEntrenamiento = async () => {
    if (ejerciciosCompletados.size === 0) {
      Alert.alert('Espera', 'Marca al menos un ejercicio como completado')
      return
    }

    const xpGanada = calcularXPGanada()
    const calorias = calcularCaloriasQuemadas()
    const duracionMinutos = Math.floor(tiempoTranscurrido / 60)

    try {
      // Obtener user_id
      const { data: { user } } = await supabase.auth.getUser()

      // Guardar entrenamiento
      const { data: entrenamiento, error: errorEntrenamiento } = await supabase
        .from('entrenamientos_completados')
        .insert([{
          user_id: user.id,
          rutina_id: rutinaId,
          duracion_minutos: duracionMinutos,
          calorias_quemadas: calorias,
          xp_ganada: xpGanada,
          ejercicios_completados: Array.from(ejerciciosCompletados),
        }])
        .select()
        .single()

      if (errorEntrenamiento) throw errorEntrenamiento

      // Agregar XP al usuario
      const { data: nivelData, error: errorXP } = await supabase
        .rpc('agregar_xp', {
          usuario_id: user.id,
          xp_ganada: xpGanada
        })

      if (errorXP) console.log('Error agregando XP:', errorXP)

      // Mostrar resumen
      const subioNivel = nivelData?.[0]?.subio_nivel || false
      const nuevoNivel = nivelData?.[0]?.nuevo_nivel || 0

      let mensaje = `🔥 ¡Entrenamiento completado!\n\n`
      mensaje += `⏱️ Duración: ${duracionMinutos} min\n`
      mensaje += `💪 Ejercicios: ${ejerciciosCompletados.size}/${ejercicios.length}\n`
      mensaje += `🔥 Calorías: ~${calorias} kcal\n`
      mensaje += `⭐ XP ganada: +${xpGanada}\n`

      if (subioNivel) {
        mensaje += `\n🎉 ¡SUBISTE AL NIVEL ${nuevoNivel}!`
      }

      Alert.alert('¡Felicidades!', mensaje, [
        { text: 'Genial', onPress: () => navigation.goBack() }
      ])

    } catch (error) {
      console.log('Error guardando entrenamiento:', error)
      Alert.alert('Error', 'No se pudo guardar el entrenamiento')
    }
  }

  const formatearTiempo = (segundos) => {
    const mins = Math.floor(segundos / 60)
    const secs = segundos % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const progresoEjercicios = ejercicios.length > 0
    ? (ejerciciosCompletados.size / ejercicios.length) * 100
    : 0

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.background, COLORS.surface]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (entrenandoActivo) {
                Alert.alert(
                  'Entrenamiento en curso',
                  '¿Quieres salir sin finalizar?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Salir', onPress: () => navigation.goBack(), style: 'destructive' }
                  ]
                )
              } else {
                navigation.goBack()
              }
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

        <Text style={styles.headerTitle}>{rutina?.nombre}</Text>

        {entrenandoActivo && (
          <View style={styles.progresoContainer}>
            <View style={styles.progresoBar}>
              <View style={[styles.progresoFill, { width: `${progresoEjercicios}%` }]} />
            </View>
            <Text style={styles.progresoText}>
              {ejerciciosCompletados.size}/{ejercicios.length} ejercicios
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* Lista de ejercicios */}
      <ScrollView
        style={styles.ejerciciosScroll}
        contentContainerStyle={styles.ejerciciosContent}
        showsVerticalScrollIndicator={false}
      >
        {ejercicios.map((item, index) => {
          const completado = ejerciciosCompletados.has(item.id)

          return (
            <View
              key={item.id}
              style={[
                styles.ejercicioCard,
                completado && styles.ejercicioCardCompletado
              ]}
            >
              <View style={styles.ejercicioHeader}>
                <View style={styles.ejercicioNumero}>
                  <Text style={styles.ejercicioNumeroText}>{index + 1}</Text>
                </View>

                <View style={styles.ejercicioInfo}>
                  <Text style={styles.ejercicioNombre}>
                    {item.ejercicios.nombre}
                  </Text>
                  <Text style={styles.ejercicioCategoria}>
                    {item.ejercicios.categoria}
                  </Text>
                  <Text style={styles.ejercicioSeries}>
                    {item.series} series × {item.repeticiones} reps
                  </Text>
                </View>

                {entrenandoActivo && (
                  <TouchableOpacity
                    style={[
                      styles.checkButton,
                      completado && styles.checkButtonActive
                    ]}
                    onPress={() => toggleEjercicioCompletado(item.id)}
                  >
                    <Text style={styles.checkIcon}>
                      {completado ? '✓' : '○'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Instrucciones */}
              {item.ejercicios.instrucciones && (
                <View style={styles.instruccionesBox}>
                  <Text style={styles.instruccionesTitle}>📋 Cómo hacerlo</Text>
                  <Text style={styles.instruccionesText}>
                    {item.ejercicios.instrucciones}
                  </Text>
                </View>
              )}

              {/* Botón de descanso */}
              {entrenandoActivo && !completado && (
                <TouchableOpacity
                  style={styles.descansoButton}
                  onPress={() => iniciarDescanso(item, item.descanso_segundos)}
                >
                  <Text style={styles.descansoButtonText}>
                    ⏱️ Descanso ({item.descanso_segundos}s)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )
        })}

        {/* Botón de acción */}
        {!entrenandoActivo ? (
          <TouchableOpacity
            style={styles.iniciarButton}
            onPress={handleIniciarEntrenamiento}
          >
            <Text style={styles.iniciarButtonText}>Iniciar Entrenamiento</Text>
            <Text style={styles.iniciarButtonIcon}>🔥</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.iniciarButton,
              styles.finalizarButton,
              ejerciciosCompletados.size === 0 && styles.buttonDisabled
            ]}
            onPress={handleFinalizarEntrenamiento}
            disabled={ejerciciosCompletados.size === 0}
          >
            <Text style={styles.iniciarButtonText}>Finalizar Entrenamiento</Text>
            <Text style={styles.iniciarButtonIcon}>✓</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Timer Modal */}
      <Modal
        visible={mostrarTimer}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.timerModalOverlay}>
          <View style={styles.timerModal}>
            <Text style={styles.timerModalTitle}>Descanso</Text>
            <Text style={styles.timerModalTiempo}>{formatearTiempo(timerDescanso)}</Text>
            <Text style={styles.timerModalEjercicio}>
              {ejercicioActual?.ejercicios?.nombre}
            </Text>
            <TouchableOpacity
              style={styles.timerModalButton}
              onPress={() => setMostrarTimer(false)}
            >
              <Text style={styles.timerModalButtonText}>Saltar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  timerText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  progresoContainer: {
    marginTop: 8,
  },
  progresoBar: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progresoFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  progresoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  ejerciciosScroll: {
    flex: 1,
  },
  ejerciciosContent: {
    padding: 20,
  },
  ejercicioCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  ejercicioCardCompletado: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '15',
  },
  ejercicioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ejercicioNumero: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ejercicioNumeroText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  ejercicioInfo: {
    flex: 1,
  },
  ejercicioNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  ejercicioCategoria: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  ejercicioSeries: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  checkButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkButtonActive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success,
  },
  checkIcon: {
    fontSize: 24,
    color: COLORS.white,
  },
  instruccionesBox: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  instruccionesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  instruccionesText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  descansoButton: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  descansoButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  iniciarButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  finalizarButton: {
    backgroundColor: COLORS.success,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  iniciarButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginRight: 8,
  },
  iniciarButtonIcon: {
    fontSize: 20,
  },
  bottomSpacer: {
    height: 20,
  },
  timerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerModal: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '80%',
  },
  timerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  timerModalTiempo: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 16,
  },
  timerModalEjercicio: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  timerModalButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  timerModalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
})