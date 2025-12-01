import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'
import { COLORS } from '../constants/colors'

export default function RutinasScreen({ navigation }) {
  const [loading, setLoading] = useState(true)
  const [rutinas, setRutinas] = useState([])
  const [userInfo, setUserInfo] = useState(null)
  const [filtroNivel, setFiltroNivel] = useState('Todas')

  useEffect(() => {
    loadRutinas()
  }, [])

  const loadRutinas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: info } = await supabase
        .from('usuarios_info')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setUserInfo(info)

      const { data, error } = await supabase
        .from('rutinas_predefinidas')
        .select('*')
        .eq('objetivo', info.objetivo)
        .order('nivel', { ascending: true })

      if (error) throw error

      console.log(`Total rutinas para ${info.objetivo}:`, data?.length || 0)
      setRutinas(data || [])
    } catch (error) {
      console.log('Error cargando rutinas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRutinaPress = (rutina) => {
    navigation.navigate('RutinaDetalle', { rutinaId: rutina.id })
  }

  const getNivelColor = (nivel) => {
    switch(nivel) {
      case 'Principiante': return '#4ECDC4'
      case 'Intermedio': return '#FFD93D'
      case 'Avanzado': return '#FF6B6B'
      default: return COLORS.primary
    }
  }

  const rutinasFiltradas = filtroNivel === 'Todas' 
    ? rutinas 
    : rutinas.filter(r => r.nivel === filtroNivel)

  const contarPorNivel = (nivel) => {
    return rutinas.filter(r => r.nivel === nivel).length
  }

  if (loading) {
    return (
      <LinearGradient
        colors={[COLORS.background, COLORS.surface]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando rutinas...</Text>
      </LinearGradient>
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
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Rutinas</Text>
          <View style={styles.objetivoTag}>
            <Text style={styles.objetivoIcon}>🎯</Text>
            <Text style={styles.objetivoText}>{userInfo?.objetivo}</Text>
          </View>
        </View>

        {/* Estadísticas - Solo 2 cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{rutinas.length}</Text>
            <Text style={styles.statLabel}>Total Rutinas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userInfo?.dias_semana}</Text>
            <Text style={styles.statLabel}>Días/Semana</Text>
          </View>
        </View>

        {/* Filtros de Nivel */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterTitle}>Filtrar por nivel</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                filtroNivel === 'Todas' && styles.filterChipActive
              ]}
              onPress={() => setFiltroNivel('Todas')}
            >
              <Text style={[
                styles.filterChipText,
                filtroNivel === 'Todas' && styles.filterChipTextActive
              ]}>
                Todas ({rutinas.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                filtroNivel === 'Principiante' && styles.filterChipActive,
                { borderColor: '#4ECDC4' }
              ]}
              onPress={() => setFiltroNivel('Principiante')}
            >
              <Text style={[
                styles.filterChipText,
                filtroNivel === 'Principiante' && styles.filterChipTextActive
              ]}>
                Principiante ({contarPorNivel('Principiante')})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                filtroNivel === 'Intermedio' && styles.filterChipActive,
                { borderColor: '#FFD93D' }
              ]}
              onPress={() => setFiltroNivel('Intermedio')}
            >
              <Text style={[
                styles.filterChipText,
                filtroNivel === 'Intermedio' && styles.filterChipTextActive
              ]}>
                Intermedio ({contarPorNivel('Intermedio')})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                filtroNivel === 'Avanzado' && styles.filterChipActive,
                { borderColor: '#FF6B6B' }
              ]}
              onPress={() => setFiltroNivel('Avanzado')}
            >
              <Text style={[
                styles.filterChipText,
                filtroNivel === 'Avanzado' && styles.filterChipTextActive
              ]}>
                Avanzado ({contarPorNivel('Avanzado')})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Lista de Rutinas */}
        <View style={styles.rutinasContainer}>
          <Text style={styles.rutinasTitle}>
            {filtroNivel === 'Todas' 
              ? `Todas las rutinas (${rutinasFiltradas.length})`
              : `Nivel ${filtroNivel} (${rutinasFiltradas.length})`
            }
          </Text>

          {rutinasFiltradas.length > 0 ? (
            rutinasFiltradas.map((rutina) => (
              <TouchableOpacity 
                key={rutina.id}
                style={styles.rutinaCard}
                activeOpacity={0.9}
                onPress={() => handleRutinaPress(rutina)}
              >
                {rutina.imagen_url && (
                  <Image 
                    source={{ uri: rutina.imagen_url }} 
                    style={styles.rutinaImage}
                    resizeMode="cover"
                  />
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.9)']}
                  style={styles.rutinaGradient}
                >
                  <View style={styles.rutinaTop}>
                    <View style={[
                      styles.rutinaBadge,
                      { backgroundColor: getNivelColor(rutina.nivel) }
                    ]}>
                      <Text style={styles.rutinaBadgeText}>{rutina.nivel}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.rutinaContent}>
                    <Text style={styles.rutinaNombre}>{rutina.nombre}</Text>
                    <Text style={styles.rutinaDescripcion} numberOfLines={2}>
                      {rutina.descripcion}
                    </Text>
                    <View style={styles.rutinaInfo}>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoIcon}>📅</Text>
                        <Text style={styles.infoText}>{rutina.dias_semana} días</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoIcon}>⏱️</Text>
                        <Text style={styles.infoText}>{rutina.duracion_minutos} min</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoIcon}>📍</Text>
                        <Text style={styles.infoText}>{rutina.lugar}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.verDetallesButton}>
                      <Text style={styles.verDetallesText}>Ver Detalles</Text>
                      <Text style={styles.verDetallesIcon}>→</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>
                No hay rutinas de nivel {filtroNivel}
              </Text>
              <Text style={styles.emptyText}>
                Intenta con otro filtro o explora todas las rutinas
              </Text>
              <TouchableOpacity 
                style={styles.resetFilterButton}
                onPress={() => setFiltroNivel('Todas')}
              >
                <Text style={styles.resetFilterText}>Ver Todas</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {rutinas.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No hay rutinas disponibles</Text>
            <Text style={styles.emptyText}>
              Pronto habrá más rutinas para tu objetivo
            </Text>
          </View>
        )}
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  scrollContent: {
    paddingTop: 110, // Aumentado para que no tape el título
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  objetivoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  objetivoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  objetivoText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  filterContainer: {
    marginBottom: 24,
    paddingLeft: 24,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  filterScroll: {
    paddingRight: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  rutinasContainer: {
    paddingHorizontal: 24,
  },
  rutinasTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  rutinaCard: {
    height: 320, // Aumentado para que quepa todo
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  rutinaImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  rutinaGradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  rutinaTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  rutinaBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  rutinaBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  rutinaContent: {
    padding: 20,
  },
  rutinaNombre: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  rutinaDescripcion: {
    fontSize: 15,
    color: COLORS.white,
    opacity: 0.95,
    marginBottom: 16,
    lineHeight: 22,
  },
  rutinaInfo: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  infoIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '600',
  },
  verDetallesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  verDetallesText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  verDetallesIcon: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 20,
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
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  resetFilterButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetFilterText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
})