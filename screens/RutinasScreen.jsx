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

const { width, height } = Dimensions.get('window')

const scale = (size) => (width / 375) * size
const verticalScale = (size) => (height / 812) * size
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor

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

      const { data: userInfo } = await supabase
        .from('usuarios_info')
        .select('objetivo')
        .eq('user_id', user.id)
        .single()

      const objetivo = userInfo?.objetivo

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
        <MaterialIcons name="fitness-center" size={moderateScale(60)} color={COLORS.primary} />
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: verticalScale(20) }} />
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
            paddingTop: insets.top + verticalScale(16),
            paddingBottom: Math.max(insets.bottom, verticalScale(20)) + verticalScale(20)
          }
        ]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.headerContainer, { opacity: fadeAnim }]}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{objetivoUsuario || 'Tus Rutinas'}</Text>
            <Text style={styles.subtitle}>{rutinasFiltradas.length} entrenamientos</Text>
          </View>
        </Animated.View>

        {/* Filtros Compactos */}
        <View style={styles.filtrosCompactos}>
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
                  {nivel === 'Todas' ? nivel : nivel}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Lista de Rutinas */}
        <Animated.View style={[styles.rutinasContainer, { opacity: fadeAnim }]}>
          {rutinasFiltradas.map((rutina) => (
            <TouchableOpacity
              key={rutina.id}
              style={styles.rutinaCard}
              onPress={() => handleRutinaPress(rutina)}
              activeOpacity={0.8}
            >
              {/* Imagen a la izquierda */}
              <View style={styles.rutinaImageContainer}>
                <Image
                  source={{ uri: rutina.imagen_url }}
                  style={styles.rutinaImage}
                  contentFit="cover"
                />
              </View>

              {/* Contenido a la derecha */}
              <View style={styles.rutinaInfo}>
                <Text style={styles.rutinaNombre} numberOfLines={2}>
                  {rutina.nombre}
                </Text>
                
                <View style={styles.rutinaMetaRow}>
                  <Text style={styles.rutinaDuracion}>
                    {rutina.duracion_minutos} min
                  </Text>
                  <View style={styles.metaDivider} />
                  <Text style={styles.rutinaNivel}>
                    {rutina.nivel}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Empty State */}
        {rutinasFiltradas.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="fitness-center" size={moderateScale(48)} color={COLORS.textSecondary} />
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
    marginTop: verticalScale(16),
    fontSize: moderateScale(16),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: scale(20),
  },
  headerContainer: {
    marginBottom: verticalScale(20),
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: moderateScale(32),
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: verticalScale(4),
  },
  subtitle: {
    fontSize: moderateScale(14),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filtrosCompactos: {
    marginBottom: verticalScale(20),
  },
  filtroChipsContainer: {
    paddingRight: scale(20),
    gap: scale(8),
  },
  filterChip: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(20),
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border + '40',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  rutinasContainer: {
    gap: verticalScale(12),
  },
  rutinaCard: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(12),
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border + '30',
    padding: scale(12),
    gap: scale(12),
  },
  rutinaImageContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: moderateScale(10),
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  rutinaImage: {
    width: '100%',
    height: '100%',
  },
  rutinaInfo: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: verticalScale(2),
  },
  rutinaNombre: {
    fontSize: moderateScale(16),
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: verticalScale(8),
    lineHeight: moderateScale(20),
  },
  rutinaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rutinaDuracion: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: COLORS.primary,
  },
  metaDivider: {
    width: moderateScale(4),
    height: moderateScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: COLORS.textSecondary + '40',
    marginHorizontal: scale(8),
  },
  rutinaNivel: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(24),
    padding: scale(40),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border + '40',
    marginTop: verticalScale(20),
  },
  emptyIconCircle: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  emptyTitle: {
    fontSize: moderateScale(20),
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
})