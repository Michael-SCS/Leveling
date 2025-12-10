import { MaterialIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { COLORS } from '../constants/colors'
import { supabase } from '../lib/supabase'

const { width } = Dimensions.get('window')

const formatTotalMinutes = (totalMinutos) => {
  if (totalMinutos === 0) return '0m'
  const hours = Math.floor(totalMinutos / 60)
  const minutes = totalMinutos % 60
  if (hours > 0) {
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim()
  }
  return `${minutes}m`
}

export default function HistorialScreen({ navigation }) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [entrenamientosAgrupados, setEntrenamientosAgrupados] = useState([])
  const [modalVisible, setModalVisible] = useState(false)
  const [rutinaSeleccionada, setRutinaSeleccionada] = useState(null)
  const [estadisticas, setEstadisticas] = useState({
    totalEntrenamientos: 0,
    totalMinutos: 0,
    totalCalorias: 0,
    estaSemana: 0,
  })

  useEffect(() => {
    loadHistorial()
  }, [])

  const loadHistorial = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: entrenamientosData, error } = await supabase
        .from('entrenamientos_completados')
        .select(`
          id,
          fecha,
          hora,
          duracion_minutos,
          calorias_quemadas,
          xp_ganada,
          ejercicios_completados,
          rutina_id,
          rutinas_predefinidas (
            nombre,
            imagen_url,
            nivel
          )
        `)
        .eq('user_id', user.id)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (error) throw error

      // Obtener nombres de ejercicios
      if (entrenamientosData && entrenamientosData.length > 0) {
        const todosLosIds = new Set()
        entrenamientosData.forEach(entrenamiento => {
          if (Array.isArray(entrenamiento.ejercicios_completados)) {
            entrenamiento.ejercicios_completados.forEach(id => todosLosIds.add(id))
          }
        })

        if (todosLosIds.size > 0) {
          const { data: ejerciciosData } = await supabase
            .from('ejercicios')
            .select('id, nombre')
            .in('id', Array.from(todosLosIds))

          const ejerciciosMap = {}
          ejerciciosData?.forEach(ej => {
            ejerciciosMap[ej.id] = ej.nombre
          })

          entrenamientosData.forEach(entrenamiento => {
            entrenamiento.ejerciciosConNombres = entrenamiento.ejercicios_completados?.map(id => ({
              id,
              nombre: ejerciciosMap[id] || 'Ejercicio desconocido'
            })) || []
          })
        }
      }

      // Agrupar por rutina_id
      const agrupados = {}
      entrenamientosData?.forEach(entrenamiento => {
        const rutinaId = entrenamiento.rutina_id
        if (!agrupados[rutinaId]) {
          agrupados[rutinaId] = {
            rutina_id: rutinaId,
            nombre: entrenamiento.rutinas_predefinidas?.nombre || 'Rutina Desconocida',
            imagen_url: entrenamiento.rutinas_predefinidas?.imagen_url,
            nivel: entrenamiento.rutinas_predefinidas?.nivel,
            veces_realizada: 0,
            ultima_fecha: entrenamiento.fecha,
            ultima_hora: entrenamiento.hora,
            total_ejercicios: 0,
            sesiones: []
          }
        }
        agrupados[rutinaId].veces_realizada += 1
        agrupados[rutinaId].total_ejercicios += entrenamiento.ejercicios_completados?.length || 0
        agrupados[rutinaId].sesiones.push(entrenamiento)
      })

      // Convertir a array y ordenar por fecha más reciente
      const arrayAgrupado = Object.values(agrupados).sort((a, b) => {
        const fechaA = new Date(a.ultima_fecha + ' ' + a.ultima_hora)
        const fechaB = new Date(b.ultima_fecha + ' ' + b.ultima_hora)
        return fechaB - fechaA
      })

      setEntrenamientosAgrupados(arrayAgrupado)

      // Calcular estadísticas
      const total = entrenamientosData?.length || 0
      const minutos = entrenamientosData?.reduce((sum, e) => sum + (e.duracion_minutos || 0), 0) || 0
      const calorias = entrenamientosData?.reduce((sum, e) => sum + (e.calorias_quemadas || 0), 0) || 0

      const hoy = new Date()
      const dayOfWeek = hoy.getDay()
      const diff = hoy.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const inicioSemana = new Date(hoy.setDate(diff))
      inicioSemana.setHours(0, 0, 0, 0)

      const semana = entrenamientosData?.filter(e =>
        new Date(e.fecha) >= inicioSemana
      ).length || 0

      setEstadisticas({
        totalEntrenamientos: total,
        totalMinutos: minutos,
        totalCalorias: calorias,
        estaSemana: semana,
      })

    } catch (error) {
      console.log('Error cargando historial:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadHistorial()
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return ""
    const [year, month, day] = fecha.split('-')
    const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]
    const mesAbreviado = meses[Number(month) - 1]
    return `${day} ${mesAbreviado}`
  }

  const formatearHora = (hora) => {
    if (!hora) return ""
    return hora.substring(0, 5)
  }

  const abrirDetalles = (rutina) => {
    setRutinaSeleccionada(rutina)
    setModalVisible(true)
  }

  if (loading) {
    return (
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={styles.loadingContainer}>
        <MaterialIcons name="history" size={60} color={COLORS.primary} />
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient colors={[COLORS.background, COLORS.surface]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Tu Historial</Text>
          <Text style={styles.subtitle}>Progreso constante 🔥</Text>
        </View>

        {/* Estadísticas Compactas */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialIcons name="fitness-center" size={20} color={COLORS.primary} />
            <Text style={styles.statValue}>{estadisticas.totalEntrenamientos}</Text>
            <Text style={styles.statLabel}>Sesiones</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="schedule" size={20} color="#FF6B6B" />
            <Text style={styles.statValue}>{formatTotalMinutes(estadisticas.totalMinutos)}</Text>
            <Text style={styles.statLabel}>Tiempo</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="local-fire-department" size={20} color="#FFD93D" />
            <Text style={styles.statValue}>{estadisticas.totalCalorias}</Text>
            <Text style={styles.statLabel}>Kcal</Text>
          </View>
        </View>

        {/* Lista de Rutinas Agrupadas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mis Rutinas</Text>

          {entrenamientosAgrupados.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="event-busy" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Sin entrenamientos aún</Text>
              <Text style={styles.emptyText}>Completa tu primera rutina</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('Rutinas')}
              >
                <Text style={styles.emptyButtonText}>Explorar Rutinas</Text>
              </TouchableOpacity>
            </View>
          ) : (
            entrenamientosAgrupados.map((rutina) => (
              <TouchableOpacity
                key={rutina.rutina_id}
                style={styles.rutinaCard}
                onPress={() => abrirDetalles(rutina)}
                activeOpacity={0.7}
              >
                {rutina.imagen_url && (
                  <Image
                    source={{ uri: rutina.imagen_url }}
                    style={styles.rutinaImage}
                    contentFit="cover"
                  />
                )}
                <View style={styles.rutinaInfo}>
                  <View style={styles.rutinaHeader}>
                    <Text style={styles.rutinaNombre} numberOfLines={1}>{rutina.nombre}</Text>
                    <View style={styles.contadorBadge}>
                      <Text style={styles.contadorTexto}>×{rutina.veces_realizada}</Text>
                    </View>
                  </View>
                  <View style={styles.rutinaFooter}>
                    <View style={styles.rutinaDetail}>
                      <MaterialIcons name="calendar-today" size={12} color={COLORS.textSecondary} />
                      <Text style={styles.rutinaDetailText}>{formatearFecha(rutina.ultima_fecha)}</Text>
                    </View>
                    <View style={styles.rutinaDetail}>
                      <MaterialIcons name="fitness-center" size={12} color={COLORS.textSecondary} />
                      <Text style={styles.rutinaDetailText}>{rutina.total_ejercicios} ejercicios</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={COLORS.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal de Detalles */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>{rutinaSeleccionada?.nombre}</Text>
                <Text style={styles.modalSubtitle}>
                  {rutinaSeleccionada?.veces_realizada} {rutinaSeleccionada?.veces_realizada === 1 ? 'sesión' : 'sesiones'} completadas
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {rutinaSeleccionada?.sesiones.map((sesion, index) => (
                <View key={sesion.id} style={styles.sesionCard}>
                  <View style={styles.sesionHeader}>
                    <View style={styles.sesionNumero}>
                      <Text style={styles.sesionNumeroText}>#{rutinaSeleccionada.sesiones.length - index}</Text>
                    </View>
                    <View style={styles.sesionFecha}>
                      <MaterialIcons name="calendar-today" size={14} color={COLORS.primary} />
                      <Text style={styles.sesionFechaText}>
                        {formatearFecha(sesion.fecha)} • {formatearHora(sesion.hora)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.sesionStats}>
                    <View style={styles.sesionStat}>
                      <MaterialIcons name="schedule" size={16} color="#FF6B6B" />
                      <Text style={styles.sesionStatText}>{sesion.duracion_minutos} min</Text>
                    </View>
                    <View style={styles.sesionStat}>
                      <MaterialIcons name="local-fire-department" size={16} color="#FFD93D" />
                      <Text style={styles.sesionStatText}>{sesion.calorias_quemadas} kcal</Text>
                    </View>
                    <View style={styles.sesionStat}>
                      <MaterialIcons name="fitness-center" size={16} color={COLORS.primary} />
                      <Text style={styles.sesionStatText}>{sesion.ejercicios_completados?.length || 0} ejercicios</Text>
                    </View>
                  </View>

                  {sesion.ejerciciosConNombres && sesion.ejerciciosConNombres.length > 0 && (
                    <View style={styles.ejerciciosContainer}>
                      {sesion.ejerciciosConNombres.map((ejercicio, idx) => (
                        <View key={ejercicio.id} style={styles.ejercicioChip}>
                          <MaterialIcons name="check-circle" size={14} color={COLORS.success} />
                          <Text style={styles.ejercicioChipText}>{ejercicio.nombre}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border + '30',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border + '30',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  rutinaCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border + '30',
  },
  rutinaImage: {
    width: 90,
    height: 90,
  },
  rutinaInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  rutinaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rutinaNombre: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    flex: 1,
  },
  contadorBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  contadorTexto: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.white,
  },
  rutinaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rutinaDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rutinaDetailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '30',
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  modalScroll: {
    padding: 20,
  },
  sesionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border + '30',
  },
  sesionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  sesionNumero: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sesionNumeroText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primary,
  },
  sesionFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sesionFechaText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '700',
  },
  sesionStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sesionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  sesionStatText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '700',
  },
  ejerciciosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ejercicioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  ejercicioChipText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
})