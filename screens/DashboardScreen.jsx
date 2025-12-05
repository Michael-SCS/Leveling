import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
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
  const [fadeAnim] = useState(new Animated.Value(0))
  const [slideAnim] = useState(new Animated.Value(50))

  useEffect(() => {
    loadUserData()
    // Animación de entrada
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
        loadProgreso(user.id)
        loadProgresoMensual(user.id)
        loadStreak(user.id)
        loadRutinaRapida()
        if (userInfo) {
          const rutinaPrincipalId = rutinas.length > 0 ? rutinas[0].id : null
          loadOtrasRutinasSugeridas(userInfo.nivel, rutinaPrincipalId)
        }
      }
    })
    return unsubscribe
  }, [navigation, user, userInfo, rutinas])

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

      loadProgreso(supaUser.id)
      loadProgresoMensual(supaUser.id)
      loadStreak(supaUser.id)
      loadRutinaRapida()

      if (info) {
        await loadRutinasPersonalizadas(
          info.objetivo,
          info.nivel,
          info.lugar_entrenamiento,
          supaUser.id
        )
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
        query = query.neq('id', rutinaExcluidaId)
      }

      const { data, error } = await query.order('id', { ascending: true })

      if (error) throw error

      const shuffledData = (data || []).sort(() => Math.random() - 0.5)

      setOtrasRutinas(shuffledData || [])
    } catch (err) {
      console.log('Error cargando otras rutinas sugeridas:', err)
      setOtrasRutinas([])
    }
  }

  const loadProgresoMensual = async (userId) => {
    const today = new Date()
    const seisMesesAtras = new Date(today.setMonth(today.getMonth() - 6))
      .toISOString()
      .split('T')[0]
    try {
      const { data, error } = await supabase
        .from('entrenamientos_completados')
        .select('fecha, calorias_quemadas')
        .eq('user_id', userId)
        .gte('fecha', seisMesesAtras)
        .order('fecha', { ascending: true })
      if (error) throw error

      const datosAgregados = {}
      const nombresMeses = [
        'Ene',
        'Feb',
        'Mar',
        'Abr',
        'May',
        'Jun',
        'Jul',
        'Ago',
        'Sep',
        'Oct',
        'Nov',
        'Dic',
      ]

        ; (data || []).forEach((item) => {
          const fecha = new Date(item.fecha)
          const mesIndex = fecha.getMonth()
          const mesKey = `${nombresMeses[mesIndex]}-${fecha.getFullYear()}`
          if (!datosAgregados[mesKey]) {
            datosAgregados[mesKey] = 0
          }
          datosAgregados[mesKey] += item.calorias_quemadas || 0
        })

      const labels = Object.keys(datosAgregados).map((key) => key.split('-')[0])
      const chartData = Object.values(datosAgregados)

      setProgresoMensual({
        labels: labels.slice(-6),
        datasets: [{ data: chartData.slice(-6) }],
      })
    } catch (err) {
      console.log('Error cargando progreso mensual:', err)
    }
  }

  const loadProgreso = async (userId) => {
    try {
      const hoy = new Date().toISOString().split('T')[0]
      const today = new Date()
      const dayOfWeek = today.getDay()
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const inicioSemana = new Date(today.setDate(diff))
        .toISOString()
        .split('T')[0]
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
      const totalCalorias = (entrenamientosHoy || []).reduce(
        (sum, it) => sum + (it.calorias_quemadas || 0),
        0
      )
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
      else if (contador === 0)
        setMotivacion('Hoy es ideal para empezar tu racha ✨')
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

  const getObjetivoIcon = () => {
    const objetivo = userInfo?.objetivo?.toLowerCase() || ''
    if (objetivo.includes('perder') || objetivo.includes('peso'))
      return 'local-fire-department'
    if (objetivo.includes('masa') || objetivo.includes('muscular'))
      return 'fitness-center'
    if (objetivo.includes('resistencia')) return 'directions-run'
    return 'star'
  }

  const renderRutinaItem = ({ item }) => (
    <TouchableOpacity
      style={styles.rutinaCard}
      onPress={() => handleRutinaPress(item)}
      activeOpacity={0.85}
    >
      {item.imagen_url ? (
        <Image
          source={{ uri: item.imagen_url }}
          style={styles.rutinaImage}
          resizeMode="cover"
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
            <MaterialIcons name="calendar-today" size={12} color={COLORS.white} />
            <Text style={styles.rutinaMetaText}>{item.dias_semana} días</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )

  const renderRutinaRapidaCard = () => {
    if (!rutinaRapida) return null

    const item = rutinaRapida
    return (
      <TouchableOpacity
        style={styles.quickRutinaCard}
        onPress={() => handleRutinaPress(item)}
        activeOpacity={0.85}
      >
        {item.imagen_url ? (
          <Image
            source={{ uri: item.imagen_url }}
            style={styles.quickRutinaImage}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={['#FF6B6B', '#EE5A6F']}
            style={styles.quickRutinaImage}
          />
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.quickRutinaOverlay}
        >
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
            <Text style={styles.quickRutinaInfoText}>
              {item.duracion_minutos} minutos
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <LinearGradient
        colors={[COLORS.background, COLORS.surface]}
        style={styles.loadingContainer}
      >
        <View style={styles.loadingContent}>
          <MaterialIcons name="fitness-center" size={60} color={COLORS.primary} />
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ marginTop: 20 }}
          />
          <Text style={styles.loadingText}>Preparando tu espacio...</Text>
        </View>
      </LinearGradient>
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
        r: '6',
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
        fontWeight: '600',
      },
    }

    const totalCaloriasMensual = dataPoints.reduce((sum, val) => sum + val, 0)

    if (!totalMeses) {
      return (
        <View style={styles.chartContainerCard}>
          <View style={styles.chartHeaderRow}>
            <View style={styles.chartIconContainer}>
              <MaterialIcons name="show-chart" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.chartTitle}>Progreso Mensual</Text>
          </View>
          <View style={styles.emptyChartContainer}>
            <View style={styles.emptyChartIconCircle}>
              <MaterialIcons
                name="insert-chart"
                size={48}
                color={COLORS.textSecondary}
              />
            </View>
            <Text style={styles.emptyChartTitle}>¡Aún no hay datos!</Text>
            <Text style={styles.emptyChartText}>
              Completa tu primera rutina para ver tu progreso aquí.
            </Text>
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
            <View style={styles.chartIconContainer}>
              <MaterialIcons name="show-chart" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.chartTitle}>Progreso Mensual</Text>
          </View>
          <View style={styles.chartSummaryRight}>
            <View style={styles.chartSummaryInfo}>
              <Text style={styles.chartSummaryValue}>
                {totalCaloriasMensual.toLocaleString()}
              </Text>
              <Text style={styles.chartSummaryLabel}>
                Kcal ({totalMeses} meses)
              </Text>
            </View>
            <MaterialIcons
              name={
                isChartExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'
              }
              size={24}
              color={COLORS.textSecondary}
            />
          </View>
        </View>

        {isChartExpanded && (
          <View style={styles.chartExpandedContent}>
            <Text style={styles.chartExpandedTitle}>
              Histórico de Calorías Quemadas
            </Text>
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <LinearGradient
                colors={[COLORS.primary, '#8B7FE8']}
                style={styles.profileGradient}
              >
                <MaterialIcons name="person" size={24} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {motivacion ? (
            <View style={styles.motivacionContainer}>
              <LinearGradient
                colors={[COLORS.primary + '20', COLORS.primary + '10']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.motivacionGradient}
              >
                <MaterialIcons name="whatshot" size={18} color={COLORS.primary} />
                <Text style={styles.motivacionText}>{motivacion}</Text>
              </LinearGradient>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View
          style={[
            styles.statsGrid,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.statCard}>
            <LinearGradient
              colors={[COLORS.primary + '15', COLORS.primary + '05']}
              style={styles.statIconCircle}
            >
              <MaterialIcons name="today" size={24} color={COLORS.primary} />
            </LinearGradient>
            <Text style={styles.statNumber}>{progreso.hoy}</Text>
            <Text style={styles.statLabel}>Entrenamientos Hoy</Text>
            <View style={styles.statProgressBar}>
              <View
                style={[
                  styles.statProgressFill,
                  {
                    width: `${Math.min((progreso.hoy / 2) * 100, 100)}%`,
                    backgroundColor: COLORS.primary,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={['#4ECDC415', '#4ECDC405']}
              style={styles.statIconCircle}
            >
              <MaterialIcons name="date-range" size={24} color="#4ECDC4" />
            </LinearGradient>
            <Text style={styles.statNumber}>{progreso.semana}</Text>
            <Text style={styles.statLabel}>Esta Semana</Text>
            <View style={styles.statProgressBar}>
              <View
                style={[
                  styles.statProgressFill,
                  {
                    width: `${Math.min((progreso.semana / 7) * 100, 100)}%`,
                    backgroundColor: '#4ECDC4',
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={['#FF6B6B15', '#FF6B6B05']}
              style={styles.statIconCircle}
            >
              <MaterialIcons
                name="local-fire-department"
                size={24}
                color="#FF6B6B"
              />
            </LinearGradient>
            <Text style={styles.statNumber}>{progreso.calorias}</Text>
            <Text style={styles.statLabel}>Kcal Quemadas</Text>
            <View style={styles.statProgressBar}>
              <View
                style={[
                  styles.statProgressFill,
                  {
                    width: `${Math.min((progreso.calorias / 500) * 100, 100)}%`,
                    backgroundColor: '#FF6B6B',
                  },
                ]}
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.sectionHeaderContainer}>
            <View>
              <Text style={styles.sectionTitle}>Tu Rutina Principal</Text>
              <Text style={styles.sectionSubtitle}>
                Continúa donde lo dejaste
              </Text>
            </View>
            {streak > 0 && (
              <View style={styles.streakBadgeLarge}>
                <MaterialIcons
                  name="local-fire-department"
                  size={18}
                  color="#FFD700"
                />
                <Text style={styles.streakTextLarge}>{streak}</Text>
                <Text style={styles.streakLabelLarge}>días</Text>
              </View>
            )}
          </View>

          <View style={styles.heroCard}>
            {rutinas[0]?.imagen_url ? (
              <Image
                source={{ uri: rutinas[0].imagen_url }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={[COLORS.primary, COLORS.card]}
                style={styles.heroImage}
              >
                <MaterialIcons
                  name="fitness-center"
                  size={60}
                  color={COLORS.white + '30'}
                />
              </LinearGradient>
            )}

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.95)']}
              style={styles.heroOverlay}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <MaterialIcons
                    name={getObjetivoIcon()}
                    size={14}
                    color={COLORS.white}
                  />
                  <Text style={styles.heroBadgeText}>
                    {rutinas[0]?.nivel || 'Sin nivel'}
                  </Text>
                </View>
                {rutinas[0] && (
                  <View style={styles.heroLugarBadge}>
                    <MaterialIcons
                      name="location-on"
                      size={12}
                      color={COLORS.white}
                    />
                    <Text style={styles.heroLugarText}>{rutinas[0].lugar}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.heroTitle} numberOfLines={2}>
                {rutinas[0]?.nombre || 'Sin rutina asignada'}
              </Text>
              <Text style={styles.heroSubtitle} numberOfLines={3}>
                {rutinas[0]?.descripcion || 'Ve a Rutinas para elegir un plan.'}
              </Text>

              {rutinas[0] && (
                <View style={styles.heroMetaRow}>
                  <View style={styles.heroMetaItem}>
                    <MaterialIcons name="event" size={18} color={COLORS.primary} />
                    <View style={styles.heroMetaTextContainer}>
                      <Text style={styles.heroMetaValue}>
                        {rutinas[0]?.dias_semana || '—'}
                      </Text>
                      <Text style={styles.heroMetaLabel}>Días/Sem</Text>
                    </View>
                  </View>
                  <View style={styles.heroMetaItem}>
                    <MaterialIcons
                      name="schedule"
                      size={18}
                      color={COLORS.primary}
                    />
                    <View style={styles.heroMetaTextContainer}>
                      <Text style={styles.heroMetaValue}>
                        {rutinas[0]?.duracion_minutos || '—'} min
                      </Text>
                      <Text style={styles.heroMetaLabel}>Duración</Text>
                    </View>
                  </View>
                  <View style={styles.heroMetaItem}>
                    <MaterialIcons
                      name="local-fire-department"
                      size={18}
                      color="#FF6B6B"
                    />
                    <View style={styles.heroMetaTextContainer}>
                      <Text style={styles.heroMetaValue}>
                        ~{Math.round((rutinas[0]?.duracion_minutos || 0) * 8)}
                      </Text>
                      <Text style={styles.heroMetaLabel}>Kcal</Text>
                    </View>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.ctaButton}
                onPress={handleContinuar}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[COLORS.primary, '#8B7FE8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>
                    {rutinas[0] ? 'Continuar Plan' : 'Elegir Rutina'}
                  </Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={20}
                    color={COLORS.white}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Animated.View>

        {rutinaRapida && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <View>
                <Text style={styles.sectionTitle}>Entrenamiento Express</Text>
                <Text style={styles.sectionSubtitle}>
                  Perfecto para cuando tienes poco tiempo
                </Text>
              </View>
            </View>
            {renderRutinaRapidaCard()}
          </View>
        )}
        <ChartSection />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Explora Más Rutinas</Text>
              <Text style={styles.sectionSubtitle}>
                Personalizadas para nivel {userInfo?.nivel || 'Principiante'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Rutinas')}
              style={styles.verTodoButton}
            >
              <Text style={styles.verTodoText}>Ver todo</Text>
              <MaterialIcons
                name="arrow-forward"
                size={14}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          {loadingRutinas ? (
            <View style={styles.loadingRutinasContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingRutinasText}>
                Cargando rutinas...
              </Text>
            </View>
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
              <View style={styles.emptyIconCircle}>
                <MaterialIcons
                  name="search-off"
                  size={40}
                  color={COLORS.textSecondary}
                />
              </View>
              <Text style={styles.emptyTitle}>No hay más rutinas disponibles</Text>
              <Text style={styles.emptyText}>
                Nivel actual: {userInfo?.nivel || 'No definido'}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('Rutinas')}
              >
                <Text style={styles.emptyButtonText}>Explorar Todo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </LinearGradient>)
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
  loadingContent: {
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
  },
  header: {
    marginBottom: 28,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  motivacionContainer: {
    marginTop: 8,
  },
  motivacionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  motivacionText: {
    marginLeft: 8,
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: COLORS.border + '30',
  },
  statIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  statProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.border + '30',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  statProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  streakBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  streakTextLarge: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  streakLabelLarge: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.9,
  },
  verTodoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  verTodoText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  heroCard: {
    width: '100%',
    height: 360,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 15,
    borderWidth: 1,
    borderColor: COLORS.border + '20',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-end',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  heroBadgeText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroLugarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroLugarText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    color: COLORS.white,
    opacity: 0.95,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    fontWeight: '500',
  },
  heroMetaRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroMetaTextContainer: {
    flex: 1,
  },
  heroMetaValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  heroMetaLabel: {
    fontSize: 9,
    color: COLORS.white,
    opacity: 0.85,
    marginTop: 2,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  ctaText: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  quickRutinaCard: {
    width: '100%',
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.border + '20',
  },
  quickRutinaImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.45,
  },
  quickRutinaOverlay: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
  },
  quickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  quickBadgeText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  quickRutinaTitle: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  quickRutinaSubtitle: {
    color: COLORS.white,
    opacity: 0.9,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  quickRutinaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  quickRutinaInfoText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '800',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
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
  chartContainerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: COLORS.border + '30',
  },
  chartHeaderSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chartIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  chartSummaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chartSummaryInfo: {
    alignItems: 'flex-end',
  },
  chartSummaryValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  chartSummaryLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  chartExpandedContent: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.border + '40',
  },
  chartExpandedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 18,
    textAlign: 'center',
    letterSpacing: 0.3,
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
    paddingVertical: 50,
  },
  emptyChartIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.border + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyChartTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyChartText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  loadingRutinasContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingRutinasText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border + '40',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.border + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  emptyButton: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  emptyButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bottomSpacing: {
    height: 40,
  },
})