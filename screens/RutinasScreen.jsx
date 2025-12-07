import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS } from '../constants/colors'
import { supabase } from '../lib/supabase'

export default function RutinasScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [rutinas, setRutinas] = useState([])
  const [filtroNivel, setFiltroNivel] = useState('Todas')
  const [filtroEquipo, setFiltroEquipo] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false)
  const [objetivoUsuario, setObjetivoUsuario] = useState(null)

  useEffect(() => {
    loadUserObjetivo()
    loadRutinas()
  }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserObjetivo()
    })
    return unsubscribe
  }, [navigation])

  // ==================== FUNCIONES DE CARGA ====================
  const loadUserObjetivo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('usuarios_info')
        .select('objetivo')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setObjetivoUsuario(data?.objetivo)
    } catch (error) {
      console.log('Error cargando objetivo del usuario:', error)
    }
  }

  const loadRutinas = async () => {
    try {
      const { data, error } = await supabase
        .from('rutinas_predefinidas')
        .select('*')
        .order('nivel', { ascending: true })

      if (error) throw error
      setRutinas(data || [])
    } catch (error) {
      console.log('Error cargando rutinas:', error)
    } finally {
      setLoading(false)
    }
  }

  // ==================== FUNCIONES DE NAVEGACIÓN ====================
  const handleRutinaPress = (rutina) => {
    navigation.navigate('RutinaDetalle', { rutinaId: rutina.id })
  }

  // ==================== FUNCIONES DE COLOR Y ESTILO ====================
  const getNivelColor = (nivel) => {
    switch (nivel) {
      case 'Principiante': return '#00a2ffff'
      case 'Intermedio': return '#ffcc00ff'
      case 'Avanzado': return '#FF0000ff'
      default: return COLORS.primary
    }
  }

  const getChipColor = (categoria) => {
    switch (categoria) {
      case 'Principiante': return '#00a2ffff'
      case 'Intermedio': return '#ffcc00ff'
      case 'Avanzado': return '#ff0000ff'
      case 'Sin Equipo': return '#00b7ffff'
      case 'Con Equipo': return '#00b7ffff'
      case 'Cuerpo Completo': return '#00b7ffff'
      case 'Piernas': return '#00b7ffff'
      case 'Brazos': return '#00b7ffff'
      case 'Abdomen': return '#00b7ffff'
      case 'Espalda': return '#00b7ffff'
      case 'Pecho': return '#00b7ffff'
      case 'Fuerza': return '#ff004cff'
      case 'Resistencia': return '#ff004cff'
      case 'Flexibilidad': return '#ff004cff'
      case 'Cardio': return '#ff004cff'
      case 'Hipertrofia': return '#ff004cff'
      case 'Pérdida de Grasa': return '#ff004cff'
      case 'Fitness General': return '#ff004cff'
      case 'Casa': return '#ffc8efff'
      case 'Gimnasio': return '#001527ff'
      case 'Todos':
      case 'Todas': 
        return COLORS.primary
      default: 
        return COLORS.primary
    }
  }

  // ==================== FUNCIONES DE ICONOS Y ETIQUETAS ====================
  const getIconAndLabel = (key, value) => {
    const safeValue = value ? String(value) : null
    
    switch (key) {
      case 'parte_trabajada':
        const parteIconMap = {
          'Cuerpo Completo': 'accessibility-new',
          'Piernas': 'directions-run',
          'Brazos': 'fitness-center',
          'Abdomen': 'self-improvement',
          'Espalda': 'airline-seat-recline-normal',
          'Pecho': 'sports-martial-arts',
        }
        return { 
          icon: parteIconMap[safeValue] || 'accessibility-new',
          label: safeValue || 'Cuerpo Completo',
          color: '#000000ff'
        }
      case 'objetivo':
        const objetivoIconMap = {
          'Fuerza': 'fitness-center',
          'Resistencia': 'sports-score',
          'Flexibilidad': 'self-improvement',
          'Cardio': 'favorite',
          'Hipertrofia': 'trending-up',
          'Pérdida de Grasa': 'local-fire-department',
          'Fitness General': 'whatshot',
        }
        return { 
          icon: objetivoIconMap[safeValue] || 'whatshot',
          label: safeValue || 'Fitness General',
          color: '#4CAF50' 
        }
      case 'duracion_minutos':
        return { 
          icon: 'timer', 
          label: `${safeValue || '--'} min`,
          color: '#2196F3'
        }
      case 'lugar':
        const lugarIconMap = {
          'Casa': 'home',
          'Gimnasio': 'fitness-center',
          'Ambos': 'location-on'
        }
        return { 
          icon: lugarIconMap[safeValue] || 'location-on',
          label: safeValue || 'Ambos',
          color: '#FB8C00'
        }
       case 'equipo':
        return {
          icon: value ? 'hardware' : 'person',
          label: value ? 'Con Equipo' : 'Sin Equipo',
          color: value ? '#E91E63' : '#9E9E9E'
        }
      default:
        return { 
          icon: 'info', 
          label: safeValue || 'Información',
          color: COLORS.card
        }
    }
  }

  // ==================== FILTRADO DE RUTINAS ====================
  const rutinasFiltradas = rutinas.filter((rutina) => {
    // Filtro por objetivo del usuario
    if (objetivoUsuario && rutina.objetivo !== objetivoUsuario) {
      return false
    }

    if (busqueda.trim() !== '') {
      const nombreLower = rutina.nombre.toLowerCase()
      const busquedaLower = busqueda.toLowerCase()
      if (!nombreLower.includes(busquedaLower)) {
        return false
      }
    }
    
    if (filtroNivel !== 'Todas' && rutina.nivel !== filtroNivel) {
      return false
    }
    
    if (filtroEquipo !== 'Todos') {
      if (filtroEquipo === 'Sin Equipo' && rutina.equipo !== false) {
        return false
      }
      if (filtroEquipo === 'Con Equipo' && rutina.equipo !== true) {
        return false
      }
    }
    
    return true
  })

  // ==================== RENDERIZADO DE TARJETAS ====================
  const renderRutinaCard = (rutina) => {
    const infoItems = [
      { key: 'parte_trabajada', value: rutina.parte_trabajada },
      { key: 'objetivo', value: rutina.objetivo },
      { key: 'duracion_minutos', value: rutina.duracion_minutos },
      { key: 'lugar', value: rutina.lugar },
      { key: 'equipo', value: rutina.equipo },
    ]

    return (
      <TouchableOpacity
        key={rutina.id}
        style={styles.rutinaCard}
        onPress={() => handleRutinaPress(rutina)}
        activeOpacity={0.85}
      >
        <Image 
          source={{ uri: rutina.imagen_url }} 
          style={styles.rutinaImage} 
        />

        <LinearGradient 
          colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.95)"]} 
          style={styles.rutinaGradient}
        >
          {/* Header */}
          <View style={styles.rutinaHeader}>
            <Text style={styles.rutinaNombre} numberOfLines={1}>
              {rutina.nombre}
            </Text>

            <View style={[
              styles.rutinaBadge, 
              { backgroundColor: getNivelColor(rutina.nivel) }
            ]}> 
              <Text style={styles.rutinaBadgeText}>
                {rutina.nivel}
              </Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.rutinaContent}>
            {/* Info Items */}
            <View style={styles.rutinaInfo}>
              {infoItems.map((item, index) => {
                const { icon, label, color } = getIconAndLabel(item.key, item.value)
                
                return (
                  <View 
                    key={index} 
                    style={[
                      styles.infoItem,
                      { backgroundColor: color }
                    ]}
                  >
                    <MaterialIcons 
                      name={icon} 
                      size={14} 
                      color={COLORS.white} 
                      style={styles.infoIcon} 
                    />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                )
              })}
            </View>

            {/* Descripción */}
            <Text style={styles.rutinaDescripcion} numberOfLines={2}>
              {rutina.descripcion || 'Sin descripción disponible.'}
            </Text>

            {/* Botón */}
            <TouchableOpacity 
              style={styles.verDetallesButton}
              onPress={() => handleRutinaPress(rutina)}
              activeOpacity={0.8}
            >
              <Text style={styles.verDetallesText}>Ver ejercicios</Text>
              <MaterialIcons 
                name="arrow-forward" 
                size={18} 
                color={COLORS.primary} 
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  // ==================== PANTALLA DE CARGA ====================
  if (loading) {
    return (
      <LinearGradient 
        colors={[COLORS.background, COLORS.surface]} 
        style={styles.loadingContainer}
      >
        <StatusBar 
          translucent 
          backgroundColor="transparent" 
          barStyle="light-content" 
        />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando rutinas...</Text>
      </LinearGradient>
    )
  }

  // ==================== RENDER PRINCIPAL ====================
  return (
    <View style={styles.container}>
      <StatusBar 
        translucent 
        backgroundColor="transparent" 
        barStyle="light-content" 
      />
      
      <LinearGradient 
        colors={[COLORS.background, COLORS.surface]} 
        style={StyleSheet.absoluteFill}
      />

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 20) + 90
          }
        ]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Rutinas</Text>
          <Text style={styles.subtitle}>
            {objetivoUsuario 
              ? `Rutinas para: ${objetivoUsuario}` 
              : 'Escoge una rutina por nivel'}
          </Text>
        </View>

        {/* Botón de expandir/colapsar filtros */}
        <TouchableOpacity
          style={styles.filtrosToggle}
          onPress={() => setFiltrosExpandidos(!filtrosExpandidos)}
          activeOpacity={0.7}
        >
          <View style={styles.filtrosToggleContent}>
            <MaterialIcons name="filter-list" size={20} color={COLORS.text} />
            <Text style={styles.filtrosToggleText}>Filtros avanzados</Text>
          </View>
          <MaterialIcons 
            name={filtrosExpandidos ? "expand-less" : "expand-more"} 
            size={24} 
            color={COLORS.text} 
          />
        </TouchableOpacity>

        {/* Filtros desplegables */}
        {filtrosExpandidos && (
          <View style={styles.filtrosContainer}>
            {/* Filtro de Nivel */}
            <View style={styles.filtroSection}>
              <Text style={styles.filtroLabel}>Nivel</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.filtroScrollView}
              >
                {['Todas', 'Principiante', 'Intermedio', 'Avanzado'].map((nivel) => (
                  <TouchableOpacity
                    key={nivel}
                    style={[
                      styles.filterChip, 
                      filtroNivel === nivel && { 
                        backgroundColor: getChipColor(nivel) 
                      }
                    ]}
                    onPress={() => setFiltroNivel(nivel)}
                  >
                    <Text style={[
                      styles.filterChipText, 
                      filtroNivel === nivel && { color: COLORS.white }
                    ]}>
                      {nivel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Filtro de Equipo */}
            <View style={styles.filtroSection}>
              <Text style={styles.filtroLabel}>Equipo</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.filtroScrollView}
              >
                {['Todos', 'Sin Equipo', 'Con Equipo'].map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.filterChip, 
                      filtroEquipo === tipo && { 
                        backgroundColor: getChipColor(tipo) 
                      }
                    ]}
                    onPress={() => setFiltroEquipo(tipo)}
                  >
                    <Text style={[
                      styles.filterChipText, 
                      filtroEquipo === tipo && { color: COLORS.white }
                    ]}>
                      {tipo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Lista de Rutinas */}
        <View style={styles.rutinasContainer}>
          {rutinasFiltradas.map((rutina) => renderRutinaCard(rutina))}
        </View>

        {/* Mensaje vacío */}
        {rutinasFiltradas.length === 0 && (
          <View style={styles.emptyCard}>
            <MaterialIcons name="fitness-center" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No hay rutinas</Text>
            <Text style={styles.emptyText}>
              {objetivoUsuario 
                ? `No hay rutinas disponibles para tu objetivo: ${objetivoUsuario}. Cambia el filtro para ver otras rutinas.`
                : 'Cambia el filtro para ver otras rutinas disponibles.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

// ==================== ESTILOS ====================
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
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  headerContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
    marginTop: 8,
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
    marginBottom: 12,
  },
  filtrosToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filtrosToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filtrosToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  filtrosContainer: {
    backgroundColor: COLORS.card,
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filtroSection: {
    marginBottom: 16,
  },
  filtroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  filtroScrollView: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  rutinasContainer: {
    paddingHorizontal: 24,
  },
  rutinaCard: {
    height: 350,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  rutinaImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  rutinaGradient: {
    flex: 1,
    justifyContent: 'space-between',
  },
  rutinaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  rutinaNombre: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
    marginRight: 10,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rutinaBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    alignSelf: 'flex-start',
  },
  rutinaBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  rutinaContent: {
    padding: 20,
  },
  rutinaDescripcion: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 16,
    lineHeight: 20,
  },
  rutinaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  infoIcon: {
    marginRight: 4,
    color: COLORS.white,
  },
  infoText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  verDetallesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  verDetallesText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  emptyCard: {
    marginHorizontal: 24,
    marginTop: 20,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
})