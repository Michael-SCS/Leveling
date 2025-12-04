import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { LineChart } from 'react-native-chart-kit'
import { COLORS } from '../constants/colors'
import { supabase } from '../lib/supabase'

const { width } = Dimensions.get('window')

export default function DashboardScreen({ navigation }) {
  // Estados
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [rutinas, setRutinas] = useState([])
  const [otrasRutinas, setOtrasRutinas] = useState([])
  const [rutinaRapida, setRutinaRapida] = useState(null)
  const [loadingRutinas, setLoadingRutinas] = useState(false)
  const [progreso, setProgreso] = useState({
    hoy: 0,
    semana: 0,
    calorias: 0,
  })
  const [progresoMensual, setProgresoMensual] = useState({
    labels: [],
    datasets: [{ data: [] }],
  })
  const [streak, setStreak] = useState(0)
  const [motivacion, setMotivacion] = useState('')
  const [isChartExpanded, setIsChartExpanded] = useState(false)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user) {
        loadProgreso(user.id)
        loadProgresoMensual(user.id)
        loadStreak(user.id)
        loadRutinaRapida()
        if (userInfo) {
            const rutinaPrincipalId = rutinas.length > 0 ? rutinas[0].id : null;
            loadOtrasRutinasSugeridas(userInfo.nivel, rutinaPrincipalId)
        }
      }
    })
    return unsubscribe
  }, [navigation, user, userInfo, rutinas])

  const loadUserData = async () => {
    try {
      const { data: { user: supaUser } } = await supabase.auth.getUser()

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

      loadProgreso(supaUser.id)
      loadProgresoMensual(supaUser.id)
      loadStreak(supaUser.id)
      loadRutinaRapida()

      if (info) {
        await loadRutinasPersonalizadas(info.objetivo, info.nivel, info.lugar_entrenamiento, supaUser.id)
      }

    } catch (err) {
      console.log('Error cargando datos iniciales:', err)
      Alert.alert('Error', 'No se pudieron cargar tus datos')
    } finally {
      setLoading(false)
    }
  }

  const loadRutinaRapida = async () => {
    try {
      const { data, error } = await supabase
        .from('rutinas_predefinidas')
        .select('*')
        .eq('nombre', 'Break Activo de 10 Minutos')
        .single()

      if (error && error.code !== 'PGRST116') throw error

      setRutinaRapida(data || null)
    } catch (err) {
      console.log('Error cargando rutina rápida:', err)
      setRutinaRapida(null)
    }
  }

  const loadRutinasPersonalizadas = async (objetivo, nivel, lugar, userId) => {
    setLoadingRutinas(true)
    try {
      const { data, error } = await supabase
        .from('rutinas_predefinidas')
        .select('*')
        .eq('objetivo', objetivo)
        .eq('nivel', nivel)
        .in('lugar', [lugar, 'Ambos'])
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error

      const rutinaPrincipal = data[0] || null
      setRutinas(data || [])

      if (nivel) {
          loadOtrasRutinasSugeridas(nivel, rutinaPrincipal?.id)
      }

    } catch (err) {
      console.log('Error cargando rutinas principales:', err)
    } finally {
      setLoadingRutinas(false)
    }
  }

  const loadOtrasRutinasSugeridas = async (nivel, rutinaExcluidaId) => {
    try {
      let query = supabase
        .from('rutinas_predefinidas')
        .select('*')
        .eq('nivel', nivel)
        .limit(4)

      if (rutinaExcluidaId) {
          query = query.neq('id', rutinaExcluidaId);
      }

      const { data, error } = await query.order('id', { ascending: true });

      if (error) throw error

      const shuffledData = (data || []).sort(() => Math.random() - 0.5)

      setOtrasRutinas(shuffledData || [])

    } catch (err) {
      console.log('Error cargando otras rutinas sugeridas:', err)
      setOtrasRutinas([])
    }
  }

  const loadProgresoMensual = async (userId) => {
    const today = new Date();
    const seisMesesAtras = new Date(today.setMonth(today.getMonth() - 6)).toISOString().split('T')[0];
    try {
      const { data, error } = await supabase
        .from('entrenamientos_completados')
        .select('fecha, calorias_quemadas')
        .eq('user_id', userId)
        .gte('fecha', seisMesesAtras)
        .order('fecha', { ascending: true });
      if (error) throw error;

      const datosAgregados = {};
      const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

      (data || []).forEach(item => {
        const fecha = new Date(item.fecha);
        const mesIndex = fecha.getMonth();
        const mesKey = `${nombresMeses[mesIndex]}-${fecha.getFullYear()}`;
        if (!datosAgregados[mesKey]) { datosAgregados[mesKey] = 0; }
        datosAgregados[mesKey] += item.calorias_quemadas || 0;
      });

      const labels = Object.keys(datosAgregados).map(key => key.split('-')[0]);
      const chartData = Object.values(datosAgregados);

      setProgresoMensual({
        labels: labels.slice(-6),
        datasets: [{ data: chartData.slice(-6) }],
      });
    } catch (err) {
      console.log('Error cargando progreso mensual:', err);
    }
  }

  const loadProgreso = async (userId) => {
    try {
      const hoy = new Date().toISOString().split('T')[0]
      const today = new Date()
      const dayOfWeek = today.getDay()
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const inicioSemana = new Date(today.setDate(diff)).toISOString().split('T')[0]
      const { data: entrenamientosHoy, error: errorHoy } = await supabase
        .from('entrenamientos_completados')
        .select('id, calorias_quemadas')
        .eq('user_id', userId)
        .eq('fecha', hoy)
      if (errorHoy) console.log('Error entrenamientos hoy:', errorHoy)
      const { data: entrenamientosSemana, error: errorSemana } = await supabase
        .from('entrenamientos_completados')
        .select('id')
        .eq('user_id', userId)
        .gte('fecha', inicioSemana)
      if (errorSemana) console.log('Error entrenamientos semana:', errorSemana)
      const totalCalorias = (entrenamientosHoy || []).reduce((sum, it) => sum + (it.calorias_quemadas || 0), 0)
      setProgreso({
        hoy: (entrenamientosHoy || []).length,
        semana: (entrenamientosSemana || []).length,
        calorias: totalCalorias,
      })
    } catch (err) {
      console.log('Error cargando progreso:', err)
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
      const fechasSet = new Set(fechas)
      let contador = 0
      let cursor = new Date()
      while (true) {
        const dayStr = cursor.toISOString().split('T')[0]
        if (fechasSet.has(dayStr)) {
          contador += 1
          cursor.setDate(cursor.getDate() - 1)
        } else {
          break
        }
      }
      setStreak(contador)
      if (contador >= 7) setMotivacion('¡Racha excelente! Sigue así 🔥')
      else if (contador >= 3) setMotivacion('Vas muy bien — no pares 💪')
      else if (contador === 0) setMotivacion('Hoy es ideal para empezar tu racha ✨')
      else setMotivacion('Bien! Un paso más y haces racha 🎯')
    } catch (err) {
      console.log('Error calculando streak:', err)
      setStreak(0)
    }
  }

  const handleContinuar = () => {
    if (rutinas.length > 0) {
      navigation.navigate('RutinaDetalle', { rutinaId: rutinas[0].id })
    } else {
      navigation.navigate('Rutinas')
    }
  }

  const handleRutinaPress = (rutina) => {
    navigation.navigate('RutinaDetalle', { rutinaId: rutina.id })
  }

  const renderRutinaItem = ({ item }) => (
    <TouchableOpacity
      style={styles.rutinaCard}
      onPress={() => handleRutinaPress(item)}
      activeOpacity={0.85}
    >
      {item.imagen_url ? (
        <Image source={{ uri: item.imagen_url }} style={styles.rutinaImage} resizeMode="cover" />
      ) : (
        <LinearGradient colors={[COLORS.primary, COLORS.card]} style={[styles.rutinaImage, styles.placeholderGradient]}>
          <MaterialIcons name="fitness-center" size={32} color={COLORS.white} />
        </LinearGradient>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.rutinaGradient}
      >
        <View style={styles.rutinaBadge}>
          <Text style={styles.rutinaBadgeText}>{item.nivel}</Text>
        </View>

        <Text style={styles.rutinaNombre} numberOfLines={2}>{item.nombre}</Text>
        <View style={styles.rutinaMetaRow}>
          <View style={styles.rutinaMetaItem}>
            <MaterialIcons name="schedule" size={12} color={COLORS.white} />
            <Text style={styles.rutinaMetaText}>{item.duracion_minutos} min</Text>
          </View>
          <View style={styles.rutinaMetaItem}>
            <MaterialIcons name="calendar-today" size={12} color={COLORS.white} />
            <Text style={styles.rutinaMetaText}>{item.dias_semana} días</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )

  const renderRutinaRapidaCard = () => {
    if (!rutinaRapida) return null;

    const item = rutinaRapida;
    return (
      <TouchableOpacity
        style={styles.quickRutinaCard}
        onPress={() => handleRutinaPress(item)}
        activeOpacity={0.85}
      >
        {item.imagen_url ? (
          <Image source={{ uri: item.imagen_url }} style={styles.quickRutinaImage} resizeMode="cover" />
        ) : (
          <LinearGradient colors={['#FF6B6B', '#EE5A6F']} style={styles.quickRutinaImage} />
        )}

        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.quickRutinaOverlay}>
          <View style={styles.quickBadge}>
            <MaterialIcons name="bolt" size={14} color="#FFD700" />
            <Text style={styles.quickBadgeText}>RÁPIDO</Text>
          </View>
          <Text style={styles.quickRutinaTitle}>{item.nombre}</Text>
          <Text style={styles.quickRutinaSubtitle} numberOfLines={2}>
            {item.descripcion}
          </Text>
          <View style={styles.quickRutinaInfo}>
            <MaterialIcons name="schedule" size={14} color={COLORS.white} />
            <Text style={styles.quickRutinaInfoText}>{item.duracion_minutos} minutos</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando tu espacio...</Text>
      </View>
    )
  }

  const ChartSection = () => {
    const dataPoints = progresoMensual.datasets[0].data
    const totalMeses = dataPoints.length

    const chartConfig = {
      backgroundColor: COLORS.card,
      backgroundGradientFrom: COLORS.card,
      backgroundGradientTo: COLORS.card,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(108, 92, 231, ${opacity})`,
      labelColor: (opacity = 1) => COLORS.textSecondary,
      strokeWidth: 3,
      propsForDots: {
        r: '5',
        strokeWidth: '2',
        stroke: COLORS.primary,
        fill: COLORS.card,
      },
      propsForBackgroundLines: {
        strokeDasharray: '',
        stroke: COLORS.border,
        strokeWidth: 1,
      },
      propsForLabels: {
        fontSize: 11,
      },
    }

    const totalCaloriasMensual = dataPoints.reduce((sum, val) => sum + val, 0)

    if (!totalMeses) {
        return (
            <View style={styles.chartContainerCard}>
                <View style={styles.chartHeaderRow}>
                  <MaterialIcons name="show-chart" size={20} color={COLORS.primary} />
                  <Text style={styles.chartTitle}>Progreso Mensual</Text>
                </View>
                <View style={styles.emptyChartContainer}>
                    <MaterialIcons name="insert-chart" size={48} color={COLORS.textSecondary} />
                    <Text style={styles.emptyChartTitle}>¡Aún no hay datos!</Text>
                    <Text style={styles.emptyChartText}>Completa una rutina para ver tu progreso.</Text>
                </View>
            </View>
        )
    }

    return (
      <TouchableOpacity
        style={styles.chartContainerCard}
        onPress={() => setIsChartExpanded(!isChartExpanded)}
        activeOpacity={0.9}
      >
        <View style={styles.chartHeaderSummary}>
            <View style={styles.chartHeaderRow}>
              <MaterialIcons name="show-chart" size={20} color={COLORS.primary} />
              <Text style={styles.chartTitle}>Progreso Mensual</Text>
            </View>
            <View style={styles.chartSummaryRight}>
              <View style={styles.chartSummaryInfo}>
                  <Text style={styles.chartSummaryValue}>{totalCaloriasMensual.toLocaleString()}</Text>
                  <Text style={styles.chartSummaryLabel}>Kcal ({totalMeses} meses)</Text>
              </View>
              <MaterialIcons
                  name={isChartExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                  size={24}
                  color={COLORS.textSecondary}
              />
            </View>
        </View>

        {isChartExpanded && (
          <View style={styles.chartExpandedContent}>
             <Text style={styles.chartExpandedTitle}>Histórico de Calorías Quemadas</Text>
             <View style={styles.chartWrapper}>
               <LineChart
                  data={progresoMensual}
                  width={width - 70}
                  height={240}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withInnerLines={true}
                  withOuterLines={true}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  withDots={true}
                  withShadow={false}
                  fromZero={true}
                  segments={4}
                />
             </View>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.surface]}
      style={styles.container}
    >
      <View style={styles.headerOverlay} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.greeting}>Hola 👋</Text>
          <Text style={styles.name}>{userInfo?.nombre_completo || 'Usuario'}</Text>
          <View style={styles.motivacionContainer}>
            <MaterialIcons name="whatshot" size={16} color={COLORS.primary} />
            <Text style={styles.motivacionText}>{motivacion}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: COLORS.primary + '20' }]}>
              <MaterialIcons name="today" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.statNumber}>{progreso.hoy}</Text>
            <Text style={styles.statLabel}>Hoy</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#4ECDC420' }]}>
              <MaterialIcons name="date-range" size={22} color="#4ECDC4" />
            </View>
            <Text style={styles.statNumber}>{progreso.semana}</Text>
            <Text style={styles.statLabel}>Esta Semana</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FF6B6B20' }]}>
              <MaterialIcons name="local-fire-department" size={22} color="#FF6B6B" />
            </View>
            <Text style={styles.statNumber}>{progreso.calorias}</Text>
            <Text style={styles.statLabel}>Kcal Hoy</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionTitle}>Tu Rutina Principal</Text>
          <Text style={styles.sectionSubtitle}>Continúa donde lo dejaste</Text>
        </View>

        <View style={styles.heroCard}>
          {rutinas[0]?.imagen_url ? (
            <Image source={{ uri: rutinas[0].imagen_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[COLORS.primary, COLORS.card]} style={styles.heroImage} />
          )}

          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.92)']} style={styles.heroOverlay}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{rutinas[0]?.nivel || 'Sin nivel'}</Text>
              </View>
              <View style={styles.streakBadge}>
                <MaterialIcons name="local-fire-department" size={16} color="#FFD700" />
                <Text style={styles.streakText}>{streak} días</Text>
              </View>
            </View>

            <Text style={styles.heroTitle} numberOfLines={2}>{rutinas[0]?.nombre || 'Sin rutina asignada'}</Text>
            <Text style={styles.heroSubtitle} numberOfLines={3}>
              {rutinas[0]?.descripcion || 'Ve a Rutinas para elegir un plan.'}
            </Text>

            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaItem}>
                <MaterialIcons name="event" size={16} color={COLORS.primary} />
                <View style={styles.heroMetaTextContainer}>
                  <Text style={styles.heroMetaValue}>{rutinas[0]?.dias_semana || '—'}</Text>
                  <Text style={styles.heroMetaLabel}>Días/Sem</Text>
                </View>
              </View>
              <View style={styles.heroMetaItem}>
                <MaterialIcons name="schedule" size={16} color={COLORS.primary} />
                <View style={styles.heroMetaTextContainer}>
                  <Text style={styles.heroMetaValue}>{rutinas[0]?.duracion_minutos || '—'} min</Text>
                  <Text style={styles.heroMetaLabel}>Duración</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.ctaButton} onPress={handleContinuar} activeOpacity={0.85}>
              <Text style={styles.ctaText}>Continuar Plan</Text>
              <MaterialIcons name="arrow-forward" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {rutinaRapida && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={styles.sectionTitle}>Entrenamiento Rápido</Text>
              <Text style={styles.sectionSubtitle}>Perfecto para hoy</Text>
            </View>
            {renderRutinaRapidaCard()}
          </View>
        )}

        <ChartSection />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Rutinas Sugeridas</Text>
              <Text style={styles.sectionSubtitle}>Nivel {userInfo?.nivel || 'Principiante'}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Rutinas')} style={styles.verTodoButton}>
              <Text style={styles.verTodoText}>Ver todo</Text>
              <MaterialIcons name="arrow-forward" size={12} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {loadingRutinas ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : otrasRutinas.length > 0 ? (
            <FlatList
              data={otrasRutinas}
              renderItem={renderRutinaItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={width * 0.7 + 16}
              decelerationRate="fast"
              contentContainerStyle={styles.rutinasCarousel}
            />
          ) : (
            <View style={styles.emptyCard}>
              <MaterialIcons name="search-off" size={40} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>No hay más rutinas</Text>
              <Text style={styles.emptyText}>Nivel: {userInfo?.nivel}</Text>
            </View>
          )}
        </View>

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
    paddingTop: 90,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  name: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 8,
  },
  motivacionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  motivacionText: {
    marginLeft: 6,
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeaderContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  verTodoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  verTodoText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  heroCard: {
    width: '100%',
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 32,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  heroOverlay: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  heroBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
paddingHorizontal: 10,
paddingVertical: 6,
borderRadius: 12,
gap: 4,
},
streakText: {
color: '#FFD700',
fontSize: 12,
fontWeight: '800',
},
heroTitle: {
color: COLORS.white,
fontSize: 24,
fontWeight: '900',
marginBottom: 8,
},
heroSubtitle: {
color: COLORS.white,
opacity: 0.9,
fontSize: 14,
lineHeight: 20,
marginBottom: 14,
},
heroMetaRow: {
flexDirection: 'row',
marginBottom: 16,
gap: 12,
},
heroMetaItem: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: 'rgba(255,255,255,0.1)',
paddingHorizontal: 12,
paddingVertical: 10,
borderRadius: 12,
gap: 8,
flex: 1,
},
heroMetaTextContainer: {
flex: 1,
},
heroMetaValue: {
fontSize: 15,
fontWeight: '800',
color: COLORS.white,
},
heroMetaLabel: {
fontSize: 9,
color: COLORS.white,
opacity: 0.8,
marginTop: 2,
},
ctaButton: {
backgroundColor: COLORS.primary,
paddingVertical: 14,
borderRadius: 14,
alignItems: 'center',
flexDirection: 'row',
justifyContent: 'center',
gap: 8,
},
ctaText: {
color: COLORS.white,
fontWeight: '900',
fontSize: 16,
},
quickRutinaCard: {
width: '100%',
height: 130,
borderRadius: 18,
overflow: 'hidden',
backgroundColor: COLORS.card,
shadowColor: '#000',
shadowOffset: { width: 0, height: 6 },
shadowOpacity: 0.15,
shadowRadius: 12,
elevation: 6,
},
quickRutinaImage: {
...StyleSheet.absoluteFillObject,
width: '100%',
height: '100%',
opacity: 0.5,
},
quickRutinaOverlay: {
flex: 1,
padding: 16,
justifyContent: 'center',
},
quickBadge: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: 'rgba(255,215,0,0.2)',
paddingHorizontal: 10,
paddingVertical: 4,
borderRadius: 10,
alignSelf: 'flex-start',
marginBottom: 10,
gap: 4,
},
quickBadgeText: {
color: '#FFD700',
fontSize: 11,
fontWeight: '900',
},
quickRutinaTitle: {
color: COLORS.white,
fontSize: 18,
fontWeight: '900',
marginBottom: 6,
},
quickRutinaSubtitle: {
color: COLORS.white,
opacity: 0.9,
fontSize: 13,
marginBottom: 10,
},
quickRutinaInfo: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: COLORS.primary + '40',
paddingHorizontal: 10,
paddingVertical: 6,
borderRadius: 10,
alignSelf: 'flex-start',
gap: 6,
},
quickRutinaInfoText: {
fontSize: 12,
color: COLORS.white,
fontWeight: '700',
},
rutinasCarousel: {
paddingRight: 20,
},
rutinaCard: {
width: width * 0.7,
height: 200,
borderRadius: 18,
marginRight: 16,
overflow: 'hidden',
backgroundColor: COLORS.card,
shadowColor: '#000',
shadowOffset: { width: 0, height: 6 },
shadowOpacity: 0.15,
shadowRadius: 12,
elevation: 6,
},
rutinaImage: {
...StyleSheet.absoluteFillObject,
width: '100%',
height: '100%',
opacity: 0.6,
},
placeholderGradient: {
justifyContent: 'center',
alignItems: 'center',
},
rutinaGradient: {
flex: 1,
padding: 16,
justifyContent: 'flex-end',
},
rutinaBadge: {
position: 'absolute',
top: 14,
left: 14,
backgroundColor: COLORS.primary,
paddingHorizontal: 12,
paddingVertical: 6,
borderRadius: 12,
},
rutinaBadgeText: {
color: COLORS.white,
fontSize: 11,
fontWeight: '900',
},
rutinaNombre: {
color: COLORS.white,
fontSize: 17,
fontWeight: '900',
marginBottom: 10,
},
rutinaMetaRow: {
flexDirection: 'row',
gap: 8,
},
rutinaMetaItem: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: 'rgba(255,255,255,0.15)',
paddingHorizontal: 8,
paddingVertical: 5,
borderRadius: 8,
gap: 4,
},
rutinaMetaText: {
color: COLORS.white,
fontSize: 11,
fontWeight: '700',
},
chartContainerCard: {
backgroundColor: COLORS.card,
borderRadius: 18,
padding: 18,
marginBottom: 32,
shadowColor: '#000',
shadowOffset: { width: 0, height: 6 },
shadowOpacity: 0.12,
shadowRadius: 12,
elevation: 6,
},
chartHeaderSummary: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
paddingBottom: 12,
},
chartHeaderRow: {
flexDirection: 'row',
alignItems: 'center',
gap: 8,
},
chartTitle: {
fontSize: 17,
fontWeight: '900',
color: COLORS.text,
},
chartSummaryRight: {
flexDirection: 'row',
alignItems: 'center',
gap: 8,
},
chartSummaryInfo: {
alignItems: 'flex-end',
},
chartSummaryValue: {
fontSize: 20,
fontWeight: '900',
color: COLORS.primary,
},
chartSummaryLabel: {
fontSize: 10,
color: COLORS.textSecondary,
fontWeight: '600',
},
chartExpandedContent: {
marginTop: 16,
paddingTop: 16,
borderTopWidth: 1,
borderTopColor: COLORS.border,
},
chartExpandedTitle: {
fontSize: 14,
fontWeight: '700',
color: COLORS.textSecondary,
marginBottom: 16,
textAlign: 'center',
},
chartWrapper: {
alignItems: 'center',
overflow: 'hidden',
},
chart: {
borderRadius: 16,
paddingRight: 0,
},
emptyChartContainer: {
alignItems: 'center',
paddingVertical: 40,
},
emptyChartTitle: {
fontSize: 16,
fontWeight: '800',
color: COLORS.text,
marginTop: 12,
marginBottom: 6,
},
emptyChartText: {
fontSize: 13,
color: COLORS.textSecondary,
textAlign: 'center',
},
emptyCard: {
backgroundColor: COLORS.card,
borderRadius: 16,
padding: 32,
alignItems: 'center',
borderWidth: 1,
borderColor: COLORS.border,
},
emptyTitle: {
fontSize: 16,
fontWeight: '800',
color: COLORS.text,
marginTop: 12,
marginBottom: 6,
},
emptyText: {
fontSize: 13,
color: COLORS.textSecondary,
textAlign: 'center',
},
})