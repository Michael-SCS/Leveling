import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
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
  const [entrenamientos, setEntrenamientos] = useState([])
  const [expandido, setExpandido] = useState(null)
  const [estadisticas, setEstadisticas] = useState({
    totalEntrenamientos: 0,
    totalMinutos: 0,
    totalCalorias: 0,
    totalXP: 0,
    estaSemana: 0,
    promedioDiario: 0,
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
        .limit(50)

      if (error) throw error

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

      setEntrenamientos(entrenamientosData || [])

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

      const promedioDiario = total > 0 ? Math.round(minutos / total) : 0

      setEstadisticas({
        totalEntrenamientos: total,
        totalMinutos: minutos,
        totalCalorias: calorias,
        totalXP: xp,
        estaSemana: semana,
        promedioDiario,
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
  if (!fecha) return "";

  // Supabase devuelve fecha tipo 'YYYY-MM-DD'
  const [year, month, day] = fecha.split('-');

  // Convertir el mes a abreviatura en español
  const meses = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
  const mesAbreviado = meses[Number(month)-1];

  return `${day} ${mesAbreviado} ${year}`;
};

const formatearHora = (hora) => {
  if (!hora) return "";

  // Supabase devuelve hora tipo 'HH:MM:SS', queremos solo HH:MM
  return hora.substring(0,5); 
};

  const toggleExpand = (id) => {
    setExpandido(expandido === id ? null : id)
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
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Tu Historial</Text>
            <Text style={styles.subtitle}>Cada sesión es un paso más cerca de tu objetivo 🎯</Text>
          </View>
        </View>

        {/* Grid de Estadísticas Principales - Estilo Card Horizontal */}
        <View style={styles.statsMainContainer}>
          {/* XP Total - Card Grande */}
          <LinearGradient
            colors={[COLORS.primary, COLORS.primary + 'dd']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.xpCardLarge}
          >
            <View style={styles.xpCardContent}>
              <Text style={styles.xpEmoji}>✨</Text>
              <View style={styles.xpInfo}>
                <Text style={styles.xpLabel}>XP Total Ganada</Text>
                <Text style={styles.xpValue}>{estadisticas.totalXP.toLocaleString()} XP</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Stats Grid 2x2 */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <LinearGradient colors={[COLORS.primary + '15', COLORS.primary + '08']} style={styles.statGradient}>
                <MaterialIcons name="fitness-center" size={28} color={COLORS.primary} />
                <Text style={styles.statValue}>{estadisticas.totalEntrenamientos}</Text>
                <Text style={styles.statLabel}>Sesiones</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient colors={['#4ECDC415', '#4ECDC408']} style={styles.statGradient}>
                <MaterialIcons name="event-available" size={28} color="#4ECDC4" />
                <Text style={styles.statValue}>{estadisticas.estaSemana}</Text>
                <Text style={styles.statLabel}>Esta Semana</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient colors={['#FF6B6B15', '#FF6B6B08']} style={styles.statGradient}>
                <MaterialIcons name="schedule" size={28} color="#FF6B6B" />
                <Text style={styles.statValue}>{formatTotalMinutes(estadisticas.totalMinutos)}</Text>
                <Text style={styles.statLabel}>Tiempo Total</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient colors={['#FFD93D15', '#FFD93D08']} style={styles.statGradient}>
                <MaterialIcons name="local-fire-department" size={28} color="#FFD93D" />
                <Text style={styles.statValue}>{estadisticas.totalCalorias.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Kcal Quemadas</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Promedio Diario */}
          {estadisticas.totalEntrenamientos > 0 && (
            <View style={styles.promedioCard}>
              <MaterialIcons name="insights" size={20} color={COLORS.primary} />
              <Text style={styles.promedioText}>
                Promedio por sesión: <Text style={styles.promedioValue}>{estadisticas.promedioDiario} min</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Lista de Entrenamientos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Todas tus Sesiones</Text>

          {entrenamientos.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="event-busy" size={48} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>Sin entrenamientos aún</Text>
              <Text style={styles.emptyText}>
                Completa tu primer entrenamiento para verlo aquí
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.emptyButtonText}>Explorar Rutinas</Text>
                <MaterialIcons name="arrow-forward" size={16} color={COLORS.white} />
              </TouchableOpacity>
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
                        <MaterialIcons name="calendar-today" size={12} color={COLORS.primary} />
                        <Text style={styles.fechaDia}>{formatearFecha(entrenamiento.fecha)}</Text>
                      </View>
                      <Text style={styles.fechaHora}>{formatearHora(entrenamiento.hora)}</Text>
                    </View>

                    <View style={styles.headerRight}>
                      {entrenamiento.xp_ganada > 0 && (
                        <View style={styles.xpBadgeItem}>
                          <MaterialIcons name="star" size={30} color="#ffffffff" />
                          <Text style={styles.xpBadgeText}>+{entrenamiento.xp_ganada}</Text>
                        </View>
                      )}
                      <View style={styles.expandButton}>
                        <MaterialIcons
                          name={isExpanded ? 'expand-less' : 'expand-more'}
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
                    {entrenamiento.rutinas_predefinidas?.nivel && (
                      <View style={styles.nivelBadge}>
                        <Text style={styles.nivelText}>{entrenamiento.rutinas_predefinidas.nivel}</Text>
                      </View>
                    )}
                    <View style={styles.statBadge}>
                      <MaterialIcons name="schedule" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.statBadgeText}>{entrenamiento.duracion_minutos} min</Text>
                    </View>

                    <View style={styles.statBadge}>
                      <MaterialIcons name="local-fire-department" size={14} color="#ff0000ff" />
                      <Text style={styles.statBadgeText}>{entrenamiento.calorias_quemadas || 0} kcal</Text>
                    </View>

                    {numEjercicios > 0 && (
                      <View style={styles.statBadge}>
                        <MaterialIcons name="fitness-center" size={14} color={COLORS.primary} />
                        <Text style={styles.statBadgeText}>{numEjercicios} ejercicios</Text>
                      </View>
                    )}
                  </View>

                  {isExpanded && (
                    <View style={styles.detallesContainer}>
                      <View style={styles.divider} />
                      {numEjercicios > 0 && entrenamiento.ejerciciosConNombres && (
                        <>
                          <Text style={styles.ejerciciosTitle}>
                            Ejercicios Completados
                          </Text>
                          <View style={styles.ejerciciosList}>
                            {entrenamiento.ejerciciosConNombres.map((ejercicio, index) => (
                              <View key={ejercicio.id} style={styles.ejercicioItem}>
                                <View style={styles.ejercicioNumber}>
                                  <Text style={styles.ejercicioNumberText}>{index + 1}</Text>
                                </View>
                                <Text style={styles.ejercicioNombre}>{ejercicio.nombre}</Text>
                                <MaterialIcons name="check-circle" size={20} color={COLORS.success} />
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
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
    lineHeight: 22,
  },
  statsMainContainer: {
    marginBottom: 32,
    gap: 16,
  },
  xpCardLarge: {
    borderRadius: 24,
    padding: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  xpCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  xpEmoji: {
    fontSize: 48,
  },
  xpInfo: {
    flex: 1,
  },
  xpLabel: {
    fontSize: 13,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  xpValue: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 56) / 2,
  },
  statGradient: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border + '30',
    gap: 8,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  promedioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border + '30',
  },
  promedioText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  promedioValue: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '900',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border + '30',
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  entrenamientoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border + '30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  entrenamientoCardExpanded: {
    borderColor: COLORS.primary + '40',
    shadowOpacity: 0.12,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary + '25',
  },
  fechaDia: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  fechaHora: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
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
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#333',
  },
  expandButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '25',
  },
  entrenamientoNombre: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  entrenamientoStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nivelBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  nivelText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.border + '40',
  },
  statBadgeText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '700',
  },
  detallesContainer: {
    marginTop: 20,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border + '40',
    marginBottom: 20,
  },
  detallesTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  resumenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  resumenItem: {
    width: (width - 84) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border + '30',
  },
  resumenLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  resumenValue: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  ejerciciosTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  ejerciciosList: {
    gap: 8,
  },
  ejercicioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border + '30',
  },
  ejercicioNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ejercicioNumberText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primary,
  },
  ejercicioNombre: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  bottomSpacer: {
    height: 40,
  },
})