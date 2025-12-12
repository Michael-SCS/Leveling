import { MaterialIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
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

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [streak, setStreak] = useState(0)
  const [motivacion, setMotivacion] = useState('')
  const [entrenamientosHoy, setEntrenamientosHoy] = useState([])
  const [favoritos, setFavoritos] = useState([])
  const [iniciosRapidos, setIniciosRapidos] = useState([])
  const [actividadReciente, setActividadReciente] = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [fadeAnim] = useState(new Animated.Value(0))
  const [slideAnim] = useState(new Animated.Value(50))

  useEffect(() => {
    loadUserData()
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user) {
        loadUserData()
        loadStreak(user.id)
        loadEntrenamientosData()
      }
    })
    return unsubscribe
  }, [navigation, user])

  const loadUserData = async () => {
    try {
      const {
        data: { user: supaUser },
      } = await supabase.auth.getUser()

      if (!supaUser) {
        setLoading(false)
        return
      }
      setUser(supaUser)

      const { data: info, error } = await supabase
        .from('usuarios_info')
        .select('*')
        .eq('user_id', supaUser.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.log('Error al obtener usuarios_info:', error.message || error)
        setUserInfo(null)
      } else {
        setUserInfo(info)
      }

      loadStreak(supaUser.id)
      loadEntrenamientosData()
    } catch (err) {
      console.log('Error cargando datos iniciales:', err)
      Alert.alert('Error', 'No se pudieron cargar tus datos')
    } finally {
      setLoading(false)
    }
  }

  const loadStreak = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('entrenamientos_completados')
        .select('fecha')
        .eq('user_id', userId)
        .order('fecha', { ascending: false })

      if (error) {
        console.log('Error cargando historico para streak:', error)
        setStreak(0)
        return
      }

      const fechas = (data || []).map((d) => d.fecha).filter(Boolean)
      const fechasSet = new Set(fechas.map(f => f.substring(0, 10)))

      let contador = 0
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      let cursor = new Date(hoy)
      const hoyStr = hoy.toISOString().substring(0, 10)

      if (fechasSet.has(hoyStr)) {
        contador = 1
        cursor.setDate(cursor.getDate() - 1)
      } else {
        cursor.setDate(cursor.getDate() - 1)
      }

      while (true) {
        const dayStr = cursor.toISOString().substring(0, 10)

        if (fechasSet.has(dayStr)) {
          contador += 1
          cursor.setDate(cursor.getDate() - 1)
        } else break
      }

      setStreak(contador)

      if (contador >= 7) setMotivacion('¡Racha imparable! Eres una máquina 🔥')
      else if (contador >= 3) setMotivacion('¡Excelente consistencia! Sigue así 💪')
      else if (contador === 0) setMotivacion('Hoy es el día perfecto para entrenar ✨')
      else setMotivacion('¡Vas por buen camino! No te detengas 🎯')
    } catch (err) {
      console.log('Error calculando streak:', err)
      setStreak(0)
    }
  }

  const getObjetivosCompatibles = (objetivo) => {
    const mapeo = {
      'Perder peso': ['Perder peso', 'Tonificar', 'Mejorar resistencia'],
      'Ganar músculo': ['Ganar músculo', 'Tonificar', 'Aumentar fuerza'],
      'Tonificar': ['Tonificar', 'Perder peso', 'Mejorar resistencia'],
      'Mejorar resistencia': ['Mejorar resistencia', 'Perder peso', 'Tonificar'],
      'Aumentar fuerza': ['Aumentar fuerza', 'Ganar músculo', 'Tonificar']
    }
    return mapeo[objetivo] || [objetivo]
  }

  const loadEntrenamientosData = async () => {
    setLoadingData(true)
    try {
      // Obtener fecha de hoy
      const hoy = new Date().toISOString().split('T')[0]
      
      // Filtrar por objetivo del usuario
      let queryBuilder = supabase.from('rutinas_predefinidas').select('*')
      
      if (userInfo?.objetivo) {
        const objetivosCompatibles = getObjetivosCompatibles(userInfo.objetivo)
        queryBuilder = queryBuilder.in('objetivo', objetivosCompatibles)
      }

      const { data: rutinasFiltradas, error: errorFiltradas } = await queryBuilder.limit(20)

      if (errorFiltradas) throw errorFiltradas

      // Generar seed basado en la fecha para consistencia del día
      const seed = parseInt(hoy.replace(/-/g, ''))
      const seededRandom = (index) => {
        const x = Math.sin(seed + index) * 10000
        return x - Math.floor(x)
      }

      // Ordenar con seed del día
      const rutinasOrdenadas = (rutinasFiltradas || [])
        .map((item, index) => ({ item, sort: seededRandom(index) }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ item }) => item)

      setEntrenamientosHoy(rutinasOrdenadas.slice(0, 6))

      // Cargar favoritos desde rutinas_favoritas
      if (user) {
        const { data: favoritosData, error: errorFavoritos } = await supabase
          .from('rutinas_favoritas')
          .select(`
            rutina_id,
            rutinas_predefinidas (*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (!errorFavoritos && favoritosData && favoritosData.length > 0) {
          const rutinasFavoritas = favoritosData
            .filter(item => item.rutinas_predefinidas)
            .map(item => ({
              ...item.rutinas_predefinidas,
              esFavorito: true
            }))
          
          setFavoritos(rutinasFavoritas)
        } else {
          setFavoritos([])
        }
      }

      // Cargar inicios rápidos (rutinas cortas)
      const { data: rapidosData, error: errorRapidos } = await supabase
        .from('rutinas_predefinidas')
        .select('*')
        .lte('duracion_minutos', 20)
        .limit(10)

      if (errorRapidos) throw errorRapidos

      const rapidosShuffled = (rapidosData || []).sort(() => Math.random() - 0.5)
      setIniciosRapidos(rapidosShuffled.slice(0, 5))

      // Cargar actividad reciente (solo 2 últimas)
      if (user) {
        const { data: recenteData, error: errorReciente } = await supabase
          .from('entrenamientos_completados')
          .select(`
            id,
            fecha,
            duracion_minutos,
            calorias_quemadas,
            xp_ganada,
            rutina_id,
            rutinas_predefinidas (
              nombre,
              nivel,
              imagen_url
            )
          `)
          .eq('user_id', user.id)
          .order('fecha', { ascending: false })
          .limit(2)

        if (!errorReciente) {
          setActividadReciente(recenteData || [])
        }
      }
    } catch (err) {
      console.log('Error cargando entrenamientos:', err)
    } finally {
      setLoadingData(false)
    }
  }

  const handleRutinaPress = (rutina) => {
    navigation.navigate('RutinaDetalle', { rutinaId: rutina.id })
  }

  const getFechaHoy = () => {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ]
    const hoy = new Date()
    return `${dias[hoy.getDay()]}, ${hoy.getDate()} de ${meses[hoy.getMonth()]}`
  }

  const formatearFecha = (fechaString) => {
    if (!fechaString) return 'Hace poco'
    
    const fecha = new Date(fechaString)
    const ahora = new Date()
    const diffMs = ahora - fecha
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDias === 0) return 'Hoy'
    if (diffDias === 1) return 'Ayer'
    if (diffDias < 7) return `Hace ${diffDias} días`
    if (diffDias < 30) return `Hace ${Math.floor(diffDias / 7)} semanas`
    
    const dia = fecha.getDate()
    const mes = fecha.toLocaleDateString('es', { month: 'short' })
    return `${dia} ${mes}`
  }

  const renderRutinaCard = ({ item }) => (
    <TouchableOpacity
      style={styles.rutinaCard}
      onPress={() => handleRutinaPress(item)}
      activeOpacity={0.85}
    >
      {item.imagen_url ? (
        <Image
          source={{ uri: item.imagen_url }}
          style={styles.rutinaImage}
          contentFit="cover"
        />
      ) : (
        <LinearGradient
          colors={[COLORS.primary, COLORS.card]}
          style={[styles.rutinaImage, styles.placeholderGradient]}
        >
          <MaterialIcons name="fitness-center" size={32} color={COLORS.white} />
        </LinearGradient>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.95)']}
        style={styles.rutinaGradient}
      >
        <View style={styles.rutinaBadge}>
          <Text style={styles.rutinaBadgeText}>{item.nivel}</Text>
        </View>

        {item.esFavorito && (
          <View style={styles.favoritoCountBadge}>
            <MaterialIcons name="favorite" size={12} color="#FF6B6B" />
          </View>
        )}

        <Text style={styles.rutinaNombre} numberOfLines={2}>
          {item.nombre}
        </Text>

        <View style={styles.rutinaMetaRow}>
          <View style={styles.rutinaMetaItem}>
            <MaterialIcons name="schedule" size={12} color={COLORS.white} />
            <Text style={styles.rutinaMetaText}>
              {item.duracion_minutos} min
            </Text>
          </View>
          <View style={styles.rutinaMetaItem}>
            <MaterialIcons name="local-fire-department" size={12} color="#FF6B6B" />
            <Text style={styles.rutinaMetaText}>
              ~{Math.round((item.duracion_minutos || 0) * 8)} kcal
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )

  if (loading) {
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
        <View style={styles.loadingContent}>
          <MaterialIcons name="fitness-center" size={60} color={COLORS.primary} />
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ marginTop: 20 }}
          />
          <Text style={styles.loadingText}>Preparando tu espacio...</Text>
        </View>
      </View>
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
        {/* HEADER */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Hola de nuevo 👋</Text>
              <Text style={styles.name}>
                {userInfo?.nombre_completo || 'Usuario'}
              </Text>
              <Text style={styles.fecha}>{getFechaHoy()}</Text>
            </View>

            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Perfil')}
            >
              <LinearGradient
                colors={[COLORS.primary, '#8B7FE8']}
                style={styles.profileGradient}
              >
                <MaterialIcons name="person" size={24} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* RACHA */}
        <Animated.View style={[styles.rachaContainer, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['#FF6B6B', '#EE5A6F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.rachaCard}
          >
            <View style={styles.rachaLeft}>
              <View style={styles.fuegoContainer}>
                <MaterialIcons name="local-fire-department" size={48} color="#FFD700" />
                <View style={styles.streakBubble}>
                  <Text style={styles.streakNumber}>{streak}</Text>
                </View>
              </View>
              <View style={styles.rachaTextContainer}>
                <Text style={styles.rachaTitle}>Tu Racha</Text>
                <Text style={styles.rachaDias}>{streak} {streak === 1 ? 'día' : 'días'}</Text>
              </View>
            </View>
            <View style={styles.rachaRight}>
              <Text style={styles.motivacionText}>{motivacion}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* OPCIONES PARA HOY */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Opciones para Hoy</Text>
              <Text style={styles.sectionSubtitle}>
                {userInfo?.objetivo ? `Para tu objetivo: ${userInfo.objetivo}` : 'Personalizadas para ti'}
              </Text>
            </View>
            <View style={styles.todayBadge}>
              <MaterialIcons name="today" size={16} color={COLORS.primary} />
            </View>
          </View>

          {loadingData ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : entrenamientosHoy.length > 0 ? (
            <FlatList
              data={entrenamientosHoy}
              renderItem={renderRutinaCard}
              keyExtractor={(item) => `hoy-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={width * 0.7 + 16}
              decelerationRate="fast"
              contentContainerStyle={styles.rutinasCarousel}
            />
          ) : (
            <View style={styles.emptyCard}>
              <MaterialIcons name="event-busy" size={40} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No hay entrenamientos disponibles</Text>
            </View>
          )}
        </View>

        {/* INICIOS RÁPIDOS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Inicios Rápidos</Text>
              <Text style={styles.sectionSubtitle}>Entrenamientos cortos y efectivos</Text>
            </View>
            <View style={styles.rapidoBadge}>
              <MaterialIcons name="bolt" size={16} color="#FFD700" />
            </View>
          </View>

          {loadingData ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : iniciosRapidos.length > 0 ? (
            <FlatList
              data={iniciosRapidos}
              renderItem={renderRutinaCard}
              keyExtractor={(item) => `rapido-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={width * 0.7 + 16}
              decelerationRate="fast"
              contentContainerStyle={styles.rutinasCarousel}
            />
          ) : (
            <View style={styles.emptyCard}>
              <MaterialIcons name="fitness-center" size={40} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No hay inicios rápidos disponibles</Text>
            </View>
          )}
        </View>

        {/* TUS FAVORITOS */}
        {favoritos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Tus Favoritos</Text>
                <Text style={styles.sectionSubtitle}>Las rutinas que más amas</Text>
              </View>
              <View style={styles.favoritoBadge}>
                <MaterialIcons name="favorite" size={16} color="#FF6B6B" />
              </View>
            </View>

            <FlatList
              data={favoritos}
              renderItem={renderRutinaCard}
              keyExtractor={(item) => `fav-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={width * 0.7 + 16}
              decelerationRate="fast"
              contentContainerStyle={styles.rutinasCarousel}
            />
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
  loadingContent: {
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
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  name: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  fecha: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  profileButton: {
    marginLeft: 16,
  },
  profileGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  rachaContainer: {
    marginBottom: 10,
  },
  rachaCard: {
    borderRadius: 30,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#ff0000ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    borderColor: 'black',
    overflow: 'hidden',
  },
  rachaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  fuegoContainer: {
    position: 'relative',
  },
  streakBubble: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  streakNumber: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '900',
  },
  rachaTextContainer: {
    gap: 2,
  },
  rachaTitle: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rachaDias: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  rachaRight: {
    flex: 1,
    marginLeft: 16,
  },
  motivacionText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  todayBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoritoBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rapidoBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,215,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rutinasCarousel: {
    paddingRight: 20,
  },
  rutinaCard: {
    width: width * 0.7,
    height: 220,
    borderRadius: 20,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border + '20',
  },
  rutinaImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.55,
  },
  placeholderGradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rutinaGradient: {
    flex: 1,
    padding: 18,
    justifyContent: 'flex-end',
  },
  rutinaBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  rutinaBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rutinaNombre: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rutinaMetaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rutinaMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  rutinaMetaText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  loadingSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  favoritoCountBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border + '40',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  verTodoButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verTodoTextSmall: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  actividadContainer: {
    gap: 12,
  },
  sesionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border + '40',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  sesionImageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  sesionImage: {
    width: '100%',
    height: '100%',
  },
  sesionImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  sesionContent: {
    padding: 16,
  },
  sesionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
  },
  sesionXpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD93D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sesionXpText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#333',
  },
  sesionNombre: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  sesionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  sesionStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sesionStatText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  sesionNivelBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sesionNivelText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  sesionFecha: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
})