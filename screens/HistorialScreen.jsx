import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { COLORS } from '../constants/colors'
import { supabase } from '../lib/supabase'

// Función para formatear minutos totales a "Xh Ym"
const formatTotalMinutes = (totalMinutos) => {
  if (totalMinutos === 0) return '0m'
  const hours = Math.floor(totalMinutos / 60)
  const minutes = totalMinutos % 60

  if (hours > 0) {
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim()
  }
  return `${minutes}m`
}

export default function HistorialScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [entrenamientos, setEntrenamientos] = useState([])
  const [expandido, setExpandido] = useState(null)
  const [estadisticas, setEstadisticas] = useState({
    totalEntrenamientos: 0,
    totalMinutos: 0,
    totalCalorias: 0,
    totalXP: 0,
    estaSemana: 0
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
        duracion_minutos,
        calorias_quemadas,
        xp_ganada,
        ejercicios_completados,
        rutina_id,
        rutinas_predefinidas (
          nombre,
          imagen_url
        )
      `)
        .eq('user_id', user.id)
        .order('fecha', { ascending: false })
        .limit(50)

      if (error) throw error

      // 👇 NUEVA LÓGICA: Obtener nombres de todos los ejercicios
      if (entrenamientosData && entrenamientosData.length > 0) {
        // Recolectar todos los IDs únicos de ejercicios
        const todosLosIds = new Set()
        entrenamientosData.forEach(entrenamiento => {
          if (Array.isArray(entrenamiento.ejercicios_completados)) {
            entrenamiento.ejercicios_completados.forEach(id => todosLosIds.add(id))
          }
        })

        // Obtener los datos de ejercicios de una sola vez
        if (todosLosIds.size > 0) {
          const { data: ejerciciosData } = await supabase
            .from('ejercicios')
            .select('id, nombre')
            .in('id', Array.from(todosLosIds))

          // Crear mapa de ID -> nombre
          const ejerciciosMap = {}
          ejerciciosData?.forEach(ej => {
            ejerciciosMap[ej.id] = ej.nombre
          })

          // Agregar los nombres a cada entrenamiento
          entrenamientosData.forEach(entrenamiento => {
            entrenamiento.ejerciciosConNombres = entrenamiento.ejercicios_completados?.map(id => ({
              id,
              nombre: ejerciciosMap[id] || 'Ejercicio desconocido'
            })) || []
          })
        }
      }

      setEntrenamientos(entrenamientosData || [])

      // ... resto del código de estadísticas sin cambios
      const total = entrenamientosData?.length || 0
      const minutos = entrenamientosData?.reduce((sum, e) => sum + (e.duracion_minutos || 0), 0) || 0
      const calorias = entrenamientosData?.reduce((sum, e) => sum + (e.calorias_quemadas || 0), 0) || 0
      const xp = entrenamientosData?.reduce((sum, e) => sum + (e.xp_ganada || 0), 0) || 0

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
        totalXP: xp,
        estaSemana: semana
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
    const date = new Date(fecha)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const ayer = new Date(hoy)
    ayer.setDate(ayer.getDate() - 1)

    const fechaEntrenamiento = new Date(date)
    fechaEntrenamiento.setHours(0, 0, 0, 0)

    if (fechaEntrenamiento.getTime() === hoy.getTime()) {
      return 'Hoy'
    } else if (fechaEntrenamiento.getTime() === ayer.getTime()) {
      return 'Ayer'
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      }).replace('.', '').toUpperCase()
    }
  }

  const formatearHora = (fecha) => {
    return new Date(fecha).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const toggleExpand = (id) => {
    setExpandido(expandido === id ? null : id)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    )
  }

  return (

    <LinearGradient
      colors={[COLORS.background, COLORS.surface]}
      style={styles.container}
    >
      {/* Header fijo con fondo */}
      <View style={styles.headerOverlay} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header Mejorado */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Historial</Text>
          <Text style={styles.subtitle}>Revisa y celebra tus logros 🏆</Text>
        </View>

        {/* Sección de XP Total */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primary + 'dd']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.xpCard}
        >
          <View style={styles.xpIcon}>
            <Text style={styles.xpIconText}>✨</Text>
          </View>
          <View style={styles.xpInfo}>
            <Text style={styles.xpLabel}>Puntos de Experiencia (XP) Total</Text>
            <Text style={styles.xpValue}>+{estadisticas.totalXP} XP</Text>
          </View>
        </LinearGradient>

        {/* Grid de Estadísticas */}
        <View style={styles.statsGrid}>
          {/* Total Entrenamientos */}
          <View style={styles.statCard}>
            <LinearGradient
              colors={[COLORS.primary + '10', COLORS.primary + '05']}
              style={styles.statGradient}
            >
              <Text style={styles.statEmoji}>💪</Text>
              <Text style={styles.statValue}>{estadisticas.totalEntrenamientos}</Text>
              <Text style={styles.statLabel}>Entrenos{'\n'}Completados</Text>
            </LinearGradient>
          </View>

          {/* Entrenamientos esta Semana */}
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#4ECDC410', '#4ECDC405']}
              style={styles.statGradient}
            >
              <Text style={styles.statEmoji}>🗓️</Text>
              <Text style={styles.statValue}>{estadisticas.estaSemana}</Text>
              <Text style={styles.statLabel}>Entrenos{'\n'}Esta Semana</Text>
            </LinearGradient>
          </View>

          {/* Tiempo Total */}
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#FF6B6B10', '#FF6B6B05']}
              style={styles.statGradient}
            >
              <Text style={styles.statEmoji}>⏱️</Text>
              <Text style={styles.statValue}>{formatTotalMinutes(estadisticas.totalMinutos)}</Text>
              <Text style={styles.statLabel}>Tiempo{'\n'}Entrenando</Text>
            </LinearGradient>
          </View>

          {/* Calorías Totales */}
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#FFD93D10', '#FFD93D05']}
              style={styles.statGradient}
            >
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statValue}>{estadisticas.totalCalorias}</Text>
              <Text style={styles.statLabel}>Kcal{'\n'}Quemadas</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Lista de Entrenamientos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entrenamientos Recientes</Text>

          {entrenamientos.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Sin entrenamientos aún</Text>
              <Text style={styles.emptyText}>
                Completa tu primer entrenamiento para verlo aquí
              </Text>
            </View>
          ) : (
            entrenamientos.map((entrenamiento) => {
              const isExpanded = expandido === entrenamiento.id
              const numEjercicios = Array.isArray(entrenamiento.ejercicios_completados)
                ? entrenamiento.ejercicios_completados.length
                : 0

              return (
                <TouchableOpacity
                  key={entrenamiento.id}
                  style={[styles.entrenamientoCard, isExpanded && styles.entrenamientoCardExpanded]}
                  onPress={() => toggleExpand(entrenamiento.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.entrenamientoHeader}>
                    <View style={styles.fechaContainer}>
                      <View style={styles.fechaBadge}>
                        <Text style={styles.fechaDia}>
                          {formatearFecha(entrenamiento.fecha)}
                        </Text>
                      </View>
                      <Text style={styles.fechaHora}>
                        {formatearHora(entrenamiento.fecha)}
                      </Text>
                    </View>

                    <View style={styles.headerRight}>
                      {entrenamiento.xp_ganada > 0 && (
                        <View style={styles.xpBadgeItem}>
                          <Text style={styles.xpBadgeIcon}>⭐</Text>
                          <Text style={styles.xpBadgeText}>+{entrenamiento.xp_ganada}</Text>
                        </View>
                      )}
                      <View style={styles.expandButton}>
                        <MaterialIcons
                          name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                          size={24}
                          color={COLORS.primary}
                        />
                      </View>
                    </View>
                  </View>

                  <Text style={styles.entrenamientoNombre}>
                    {entrenamiento.rutinas_predefinidas?.nombre || 'Rutina Desconocida'}
                  </Text>

                  <View style={styles.entrenamientoStats}>
                    <View style={styles.statBadge}>
                      <Text style={styles.statBadgeIcon}>⏱️</Text>
                      <Text style={styles.statBadgeText}>{entrenamiento.duracion_minutos} min</Text>
                    </View>

                    <View style={[styles.statBadge, styles.statBadgeOrange]}>
                      <Text style={styles.statBadgeIcon}>🔥</Text>
                      <Text style={styles.statBadgeText}>{entrenamiento.calorias_quemadas || 0} kcal</Text>
                    </View>

                    {numEjercicios > 0 && (
                      <View style={[styles.statBadge, styles.statBadgeGreen]}>
                        <Text style={styles.statBadgeIcon}>💪</Text>
                        <Text style={styles.statBadgeText}>
                          {numEjercicios} ejercicios
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Contenido Expandido */}
                  {isExpanded && (
                    <View style={styles.detallesContainer}>
                      <View style={styles.divider} />

                      <Text style={styles.detallesTitle}>📊 Resumen Detallado</Text>

                      <View style={styles.resumenBox}>
                        <View style={styles.resumenRow}>
                          <View style={styles.resumenItem}>
                            <Text style={styles.resumenEmoji}>⏱️</Text>
                            <View>
                              <Text style={styles.resumenLabel}>Duración</Text>
                              <Text style={styles.resumenValue}>{entrenamiento.duracion_minutos} min</Text>
                            </View>
                          </View>
                          <View style={styles.resumenItem}>
                            <Text style={styles.resumenEmoji}>🔥</Text>
                            <View>
                              <Text style={styles.resumenLabel}>Calorías</Text>
                              <Text style={styles.resumenValue}>{entrenamiento.calorias_quemadas || 0} kcal</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.resumenRow}>
                          <View style={styles.resumenItem}>
                            <Text style={styles.resumenEmoji}>⭐</Text>
                            <View>
                              <Text style={styles.resumenLabel}>XP Ganada</Text>
                              <Text style={[styles.resumenValue, { color: COLORS.primary }]}>
                                +{entrenamiento.xp_ganada || 0} XP
                              </Text>
                            </View>
                          </View>

                        </View>
                      </View>

                      {/* Lista de Ejercicios */}
                      {numEjercicios > 0 && entrenamiento.ejerciciosConNombres && (
                        <>
                          <Text style={styles.ejerciciosTitle}>
                            ✅ Ejercicios Completados ({numEjercicios})
                          </Text>
                          <View style={styles.ejerciciosList}>
                            {entrenamiento.ejerciciosConNombres.map((ejercicio, index) => (
                              <View key={ejercicio.id} style={styles.ejercicioItem}>
                                <View style={styles.ejercicioCheck}>
                                  <MaterialIcons name="done" size={16} color={COLORS.white} />
                                </View>
                                <Text style={styles.ejercicioNombre}>
                                  {ejercicio.nombre}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </>
                      )}

                    </View>
                  )}
                </TouchableOpacity>
              )
            })
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  scrollContent: {
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  xpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  xpIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  xpIconText: {
    fontSize: 28,
  },
  xpInfo: {
    flex: 1,
  },
  xpLabel: {
    fontSize: 13,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 4,
    fontWeight: '500',
  },
  xpValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    width: '48%',
  },
  statGradient: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  entrenamientoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  entrenamientoCardExpanded: {
    borderColor: COLORS.primary + '50',
    shadowOpacity: 0.15,
  },
  entrenamientoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fechaContainer: {
    flex: 1,
  },
  fechaBadge: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  fechaDia: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  fechaHora: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD93D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  xpBadgeIcon: {
    fontSize: 12,
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  entrenamientoNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 14,
  },
  entrenamientoStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  statBadgeOrange: {
    backgroundColor: '#FF6B6B10',
  },
  statBadgeGreen: {
    backgroundColor: '#4ECDC410',
  },
  statBadgeIcon: {
    fontSize: 14,
  },
  statBadgeText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  detallesContainer: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 20,
  },
  detallesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  resumenBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resumenRow: {
    flexDirection: 'row',
    gap: 12,
  },
  resumenItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 8,
  },
  resumenEmoji: {
    fontSize: 24,
  },
  resumenLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
    fontWeight: '500',
  },
  resumenValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  ejerciciosTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  ejerciciosList: {
    gap: 8,
    marginBottom: 20,
  },
  ejercicioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ejercicioCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ejercicioNombre: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
})