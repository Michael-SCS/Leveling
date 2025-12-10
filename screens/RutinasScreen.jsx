import { MaterialIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Dimensions,
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

const { width } = Dimensions.get('window')

export default function RutinasScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [rutinas, setRutinas] = useState([])
  const [filtroNivel, setFiltroNivel] = useState('Todas')
  const [filtroEquipo, setFiltroEquipo] = useState('Todos')
  const [objetivoUsuario, setObjetivoUsuario] = useState(null)
  const [fadeAnim] = useState(new Animated.Value(0))

  useEffect(() => {
    loadUserObjetivo()
    loadRutinas()
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserObjetivo()
    })
    return unsubscribe
  }, [navigation])

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Cargar objetivo del usuario
      const { data: userInfo } = await supabase
        .from('usuarios_info')
        .select('objetivo')
        .eq('user_id', user.id)
        .single()

      const objetivo = userInfo?.objetivo

      // Cargar solo rutinas que coincidan con el objetivo
      let query = supabase.from('rutinas_predefinidas').select('*')
      
      if (objetivo) {
        query = query.eq('objetivo', objetivo)
      }

      const { data, error } = await query.order('nivel', { ascending: true })

      if (error) throw error
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
    switch (nivel) {
      case 'Principiante': return '#4CAF50'
      case 'Intermedio': return '#FF9800'
      case 'Avanzado': return '#F44336'
      default: return COLORS.primary
    }
  }

  const rutinasFiltradas = rutinas.filter((rutina) => {
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
        <MaterialIcons name="fitness-center" size={60} color={COLORS.primary} />
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Cargando rutinas...</Text>
      </LinearGradient>
    )
  }

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
        <Animated.View style={[styles.headerContainer, { opacity: fadeAnim }]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>Tus Rutinas</Text>
            </View>
          </View>
        </Animated.View>

        {/* Filtros Compactos */}
        <View style={styles.filtrosCompactos}>
          {/* Filtro Nivel */}
          <View style={styles.filtroGroup}>
            <Text style={styles.filtroGroupLabel}>Nivel</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtroChipsContainer}
            >
              {['Todas', 'Principiante', 'Intermedio', 'Avanzado'].map((nivel) => (
                <TouchableOpacity
                  key={nivel}
                  style={[
                    styles.filterChip,
                    filtroNivel === nivel && styles.filterChipActive
                  ]}
                  onPress={() => setFiltroNivel(nivel)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.filterChipText,
                    filtroNivel === nivel && styles.filterChipTextActive
                  ]}>
                    {nivel}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Filtro Equipo */}
          <View style={styles.filtroGroup}>
            <Text style={styles.filtroGroupLabel}>Equipo</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtroChipsContainer}
            >
              {['Todos', 'Sin Equipo', 'Con Equipo'].map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.filterChip,
                    filtroEquipo === tipo && styles.filterChipActive
                  ]}
                  onPress={() => setFiltroEquipo(tipo)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons 
                    name={tipo === 'Sin Equipo' ? 'person' : tipo === 'Con Equipo' ? 'fitness-center' : 'apps'} 
                    size={14} 
                    color={filtroEquipo === tipo ? COLORS.white : COLORS.textSecondary} 
                  />
                  <Text style={[
                    styles.filterChipText,
                    filtroEquipo === tipo && styles.filterChipTextActive
                  ]}>
                    {tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Contador de Rutinas */}
        <View style={styles.contadorContainer}>
          <Text style={styles.contadorText}>
            {rutinasFiltradas.length} {rutinasFiltradas.length === 1 ? 'rutina encontrada' : 'rutinas encontradas'}
          </Text>
        </View>

        {/* Lista de Rutinas */}
        <Animated.View style={[styles.rutinasContainer, { opacity: fadeAnim }]}>
          {rutinasFiltradas.map((rutina, index) => (
            <Animated.View
              key={rutina.id}
              style={[
                styles.rutinaCardWrapper,
                {
                  opacity: fadeAnim,
                  transform: [{
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  }]
                }
              ]}
            >
              <TouchableOpacity
                style={styles.rutinaCard}
                onPress={() => handleRutinaPress(rutina)}
                activeOpacity={0.9}
              >
                {/* Imagen */}
                <View style={styles.rutinaImageContainer}>
                  <Image
                    source={{ uri: rutina.imagen_url }}
                    style={styles.rutinaImage}
                    contentFit="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.9)']}
                    style={styles.imageGradient}
                  />
                  
                  {/* Badge Nivel */}
                  <View style={[
                    styles.nivelBadge,
                    { backgroundColor: getNivelColor(rutina.nivel) }
                  ]}>
                    <Text style={styles.nivelBadgeText}>{rutina.nivel}</Text>
                  </View>
                </View>

                {/* Contenido */}
                <View style={styles.rutinaContent}>
                  <Text style={styles.rutinaNombre} numberOfLines={2}>
                    {rutina.nombre}
                  </Text>

                  {rutina.descripcion && (
                    <Text style={styles.rutinaDescripcion} numberOfLines={2}>
                      {rutina.descripcion}
                    </Text>
                  )}

                  {/* Meta Info */}
                  <View style={styles.rutinaMetaContainer}>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="schedule" size={16} color={COLORS.primary} />
                      <Text style={styles.metaText}>{rutina.duracion_minutos} min</Text>
                    </View>

                    <View style={styles.metaDivider} />

                    <View style={styles.metaItem}>
                      <MaterialIcons 
                        name={rutina.equipo ? 'fitness-center' : 'person'} 
                        size={16} 
                        color={COLORS.primary} 
                      />
                      <Text style={styles.metaText}>
                        {rutina.equipo ? 'Con equipo' : 'Sin equipo'}
                      </Text>
                    </View>

                    {rutina.lugar && (
                      <>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaItem}>
                          <MaterialIcons 
                            name={rutina.lugar === 'Casa' ? 'home' : 'fitness-center'} 
                            size={16} 
                            color={COLORS.primary} 
                          />
                          <Text style={styles.metaText}>{rutina.lugar}</Text>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Botón Ver Detalles */}
                  <View style={styles.verDetallesButton}>
                    <Text style={styles.verDetallesText}>Ver ejercicios</Text>
                    <MaterialIcons name="arrow-forward" size={25} color={'white'} />
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Empty State */}
        {rutinasFiltradas.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="fitness-center" size={48} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No hay rutinas disponibles</Text>
            <Text style={styles.emptyText}>
              {objetivoUsuario 
                ? `No encontramos rutinas para tu objetivo: ${objetivoUsuario}. Intenta ajustar los filtros.`
                : 'Intenta ajustar los filtros para ver más rutinas.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
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
    paddingHorizontal: 20,
  },
  headerContainer: {
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    textAlign: 'center',
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  objetivoBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
  },
  filtrosCompactos: {
    marginBottom: 20,
  },
  filtroGroup: {
    marginBottom: 16,
  },
  filtroGroupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  filtroChipsContainer: {
    paddingRight: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border + '40',
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  contadorContainer: {
    marginBottom: 20,
  },
  contadorText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  rutinasContainer: {
    gap: 16,
  },
  rutinaCardWrapper: {
    marginBottom: 4,
  },
  rutinaCard: {
    backgroundColor: COLORS.card,
    borderRadius:20,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 6,
    shadowColor: '#ffffffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  rutinaImageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  rutinaImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  nivelBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  nivelBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rutinaContent: {
    padding: 20,
  },
  rutinaNombre: {
    fontSize: 20,
    textAlign: 'center',
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  rutinaDescripcion: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
    textAlign: 'justify'
  },
  rutinaMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textSecondary + '40',
    marginHorizontal: 12,
  },
  verDetallesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 2,
  },
  verDetallesText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.3,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border + '40',
    marginTop: 20,
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
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
})