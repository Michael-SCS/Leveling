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
import { MaterialIcons } from '@expo/vector-icons'
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
  // ESTADO PARA EL GRÁFICO COLAPSABLE
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

      // Llamadas de carga
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

  // --- FUNCIÓN: Cargar la Rutina Rápida por Nombre ---
  const loadRutinaRapida = async () => {
    try {
      const { data, error } = await supabase
        .from('rutinas_predefinidas')
        .select('*')
        .eq('nombre', 'Break Activo de 10 Minutos') // Buscamos por el nombre exacto
        .single()

      if (error && error.code !== 'PGRST116') throw error

      setRutinaRapida(data || null)
    } catch (err) {
      console.log('Error cargando rutina rápida:', err)
      setRutinaRapida(null)
    }
  }
  // --------------------------------------------------------

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
        .limit(1) // Solo necesitamos la rutina principal aquí

      if (error) throw error

      const rutinaPrincipal = data[0] || null
      setRutinas(data || [])

      // Llamar a la función de sugerencias después de cargar la principal
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
    // Obtener la fecha de hace 6 meses
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

      // Agrupar y sumar calorías por mes
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

  // --- RENDERIZADO DE ITEM DE RUTINA (CARRUSEL INFERIOR) ---
  const renderRutinaItem = ({ item }) => (
    <TouchableOpacity
      style={styles.rutinaCard}
      onPress={() => handleRutinaPress(item)}
      activeOpacity={0.92}
    >
      {item.imagen_url ? (
        <Image source={{ uri: item.imagen_url }} style={styles.rutinaImage} resizeMode="cover" />
      ) : (
        <LinearGradient colors={[COLORS.surface, COLORS.card]} style={[styles.rutinaImage, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: COLORS.white }}>{item.nombre}</Text>
        </LinearGradient>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.rutinaGradient}
      >
        <View style={styles.rutinaBadge}>
          <Text style={styles.rutinaBadgeText}>{item.nivel}</Text>
        </View>

        <Text style={styles.rutinaNombre} numberOfLines={2}>{item.nombre}</Text>
        <Text style={styles.rutinaDescripcion} numberOfLines={2}>{item.descripcion}</Text>
      </LinearGradient>
    </TouchableOpacity>
  )

  // --- RENDERIZADO DE LA TARJETA DE RUTINA RÁPIDA ---
  const renderRutinaRapidaCard = () => {
    if (!rutinaRapida) return null;

    const item = rutinaRapida;
    return (
      <TouchableOpacity
        style={styles.quickRutinaCard}
        onPress={() => handleRutinaPress(item)}
        activeOpacity={0.9}
      >
        {item.imagen_url ? (
          <Image source={{ uri: item.imagen_url }} style={styles.quickRutinaImage} resizeMode="cover" />
        ) : null}

        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.quickRutinaOverlay}>
          <Text style={styles.quickRutinaTitle}>{item.nombre}</Text>
          <Text style={styles.quickRutinaSubtitle} numberOfLines={2}>
            {item.descripcion}
          </Text>
          <View style={styles.quickRutinaInfo}>
            <Text style={styles.quickRutinaInfoText}>⏱️ {item.duracion_minutos} min</Text>
            <Text style={styles.quickRutinaInfoText}>🔥 Rápido</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    )
  }
  // ------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando tu espacio...</Text>
      </View>
    )
  }

  // --- COMPONENTE DE GRÁFICO FUNCIONAL Y COLAPSABLE ---
  const ChartSection = () => {
    const dataPoints = progresoMensual.datasets[0].data
    const totalMeses = dataPoints.length

    // Configuración del gráfico
    const chartConfig = {
      backgroundColor: COLORS.card,
      backgroundGradientFrom: COLORS.card,
      backgroundGradientTo: COLORS.card,
      decimalPlaces: 0,
      color: (opacity = 1) => COLORS.primary, // Color de la línea principal
      labelColor: (opacity = 1) => COLORS.textSecondary,
      strokeWidth: 2,
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: COLORS.primary,
      },
      propsForVerticalLabels: {
        fontSize: 12,
      },
    }

    // Calcular el total de calorías de los últimos 6 meses para el resumen
    const totalCaloriasMensual = dataPoints.reduce((sum, val) => sum + val, 0)

    // Si no hay datos, mostramos el placeholder básico.
    if (!totalMeses) {
        return (
            <View style={[styles.chartContainerCard, {padding: 20}]}>
                <Text style={styles.chartTitle}>Calorías Quemadas (últimos 6 meses)</Text>
                <View style={styles.emptyChartContainer}>
                    <Text style={styles.emptyChartText}>📊</Text>
                    <Text style={styles.emptyChartText}>¡No hay datos de entrenamiento aún!</Text>
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
        {/* RESUMEN VISIBLE SIEMPRE */}
        <View style={styles.chartHeaderSummary}>
            <Text style={styles.chartTitle}>Progreso Mensual</Text>
            <View style={styles.chartSummaryInfo}>
                <Text style={styles.chartSummaryValue}>{totalCaloriasMensual}</Text>
                <Text style={styles.chartSummaryLabel}>Kcal quemadas ({totalMeses} meses)</Text>
            </View>
            <MaterialIcons
                name={isChartExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={24}
                color={COLORS.textSecondary}
            />
        </View>

        {/* CONTENIDO EXPANDIDO (GRÁFICO) */}
        {isChartExpanded && (
          <View style={styles.chartExpandedContent}>
             <Text style={[styles.chartTitle, { marginBottom: 15 }]}>Histórico de Calorías (últimos {totalMeses} meses)</Text>
             <LineChart
                data={progresoMensual}
                width={width - 40 - 10} // Ancho de la pantalla - padding horizontal total - pequeño margen extra
                height={220}
                chartConfig={chartConfig}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                  marginLeft: -30, // Ajuste para que el eje Y esté dentro del padding
                }}
                fromZero={true}
              />
          </View>
        )}
      </TouchableOpacity>
    )
  }
  // ------------------------------------------------------------------


  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.surface]}
      style={styles.container}
    >
      <View style={styles.headerOverlay} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 1. ENCABEZADO Y STATS */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hola</Text>
          <Text style={styles.name}>{userInfo?.nombre_completo || 'Usuario'}</Text>
          <Text style={styles.motivacionText}>{motivacion}</Text>
        </View>

        {/* RESUMEN DE PROGRESO DE HOY/SEMANA (LOS CÍRCULOS) */}
        <View style={styles.progressSummary}>
          <View style={styles.progressItem}>
            <View style={[styles.progressCircle, { shadowColor: COLORS.primary }]}>
              <Text style={styles.progressNumber}>{progreso.hoy}</Text>
            </View>
            <Text style={styles.progressLabel}>Entrenos Hoy</Text>
          </View>

          <View style={styles.progressItem}>
            <View style={[styles.progressCircle, { shadowColor: COLORS.primary }]}>
              <Text style={styles.progressNumber}>{progreso.semana}</Text>
            </View>
            <Text style={styles.progressLabel}>Esta Semana</Text>
          </View>

          <View style={styles.progressItem}>
            <View style={[styles.progressCircle, { backgroundColor: '#FF6B6B' }]}>
              <Text style={styles.progressNumber}>{progreso.calorias}</Text>
            </View>
            <Text style={styles.progressLabel}>Kcal Quemadas</Text>
          </View>
        </View>

        {/* 2. TARJETA DE RUTINA PRINCIPAL (TU PLAN) */}
        <Text style={styles.sectionTitle}>Tu Rutina Principal</Text>
        <View style={styles.heroCard}>
          {rutinas[0]?.imagen_url ? (
            <Image source={{ uri: rutinas[0].imagen_url }} style={styles.heroImage} resizeMode="cover" />
          ) : null}

          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.heroOverlay}>
            <Text style={styles.heroSmall}>{rutinas[0]?.nivel || 'Sin nivel'}</Text>
            <Text style={styles.heroTitle}>{rutinas[0]?.nombre || 'Sin rutina asignada'}</Text>
            <Text style={styles.heroSubtitle} numberOfLines={2}>
              {rutinas[0]?.descripcion || 'Ve a Rutinas para elegir un plan que se ajuste a tus metas.'}
            </Text>

            <View style={styles.heroMetaRow}>
              <View style={styles.heroMeta}>
                <Text style={styles.heroMetaLabel}>Días/Semana</Text>
                <Text style={styles.heroMetaValue}>{rutinas[0]?.dias_semana || '—'}</Text>
              </View>
              <View style={styles.heroMeta}>
                <Text style={styles.heroMetaLabel}>Duración</Text>
                <Text style={styles.heroMetaValue}>{rutinas[0]?.duracion_minutos || '—'} min</Text>
              </View>
              <View style={styles.heroMeta}>
                <Text style={styles.heroMetaLabel}>Racha Actual</Text>
                <Text style={styles.heroMetaValue}>{streak} días</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.ctaButton} onPress={handleContinuar} activeOpacity={0.9}>
              <Text style={styles.ctaText}>Continuar Plan</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* 3. RUTINA RÁPIDA */}
        {rutinaRapida && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entrenamiento Rápido</Text>
            <Text style={styles.sectionSubtitle}>¿Poco tiempo? ¡Haz esta rutina de {rutinaRapida.duracion_minutos} min!</Text>
            {renderRutinaRapidaCard()}
          </View>
        )}

        {/* 4. SECCIÓN DE GRÁFICO (Progreso) */}
        <ChartSection />

        {/* 5. OTRAS RUTINAS SUGERIDAS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Otras Rutinas Sugeridas</Text>
              <Text style={styles.sectionSubtitle}>Más planes para tu nivel ({userInfo?.nivel || 'Cargando...'})</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Rutinas')} style={styles.verTodoButton}>
              <Text style={styles.verTodoText}>Ver todo</Text>
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
              snapToInterval={width * 0.75 + 16}
              decelerationRate="fast"
              contentContainerStyle={styles.rutinasCarousel}
            />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No hay más rutinas sugeridas</Text>
              <Text style={styles.emptyText}>Quizá no haya suficientes rutinas en tu nivel: {userInfo?.nivel}</Text>
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  name: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 4,
  },
  motivacionText: {
    marginTop: 8,
    color: COLORS.primary,
    fontWeight: '600',
  },
  progressSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  progressItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  progressCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 8,
  },
  progressNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  verTodoButton: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  verTodoText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
  },

  // --- HERO CARD (Rutina Principal) ---
  heroCard: {
    width: '100%',
    height: 250,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 30,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  heroOverlay: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },
  heroSmall: {
    color: COLORS.white,
    opacity: 0.9,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: COLORS.white,
    opacity: 0.95,
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: '90%',
  },
  heroMetaRow: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroMeta: {
    flex: 1,
    marginRight: 10,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  heroMetaLabel: {
    fontSize: 10,
    color: COLORS.white,
    opacity: 0.8,
    textTransform: 'uppercase',
  },
  heroMetaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 4,
  },
  ctaButton: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ctaText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 16,
  },
  // --- FIN HERO CARD ---

  // --- RUTINA RÁPIDA (QUICK CARD) ---
  quickRutinaCard: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
    backgroundColor: COLORS.card,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickRutinaImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
  quickRutinaOverlay: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
  },
  quickRutinaTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  quickRutinaSubtitle: {
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
    fontSize: 12,
    maxWidth: '80%',
  },
  quickRutinaInfo: {
    flexDirection: 'row',
    marginTop: 8,
  },
  quickRutinaInfoText: {
    fontSize: 12,
    color: COLORS.white,
    backgroundColor: COLORS.primary + '50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
    fontWeight: '600',
  },
  // --- FIN RUTINA RÁPIDA ---


  // --- CARRUSEL DE RUTINAS (Inferior) ---
  rutinasCarousel: {
    paddingRight: 24,
  },
  rutinaCard: {
    width: width * 0.75,
    height: 180,
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  rutinaImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
  rutinaGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'flex-end',
  },
  rutinaBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  rutinaBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  rutinaNombre: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  rutinaDescripcion: {
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 6,
    fontSize: 12,
  },
  // --- FIN CARRUSEL DE RUTINAS ---

  // --- ESTILOS DE GRÁFICOS (COLAPSABLES) ---
  chartContainerCard: { // Estilo para la tarjeta expandible
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 15,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartHeaderSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  chartSummaryInfo: {
    alignItems: 'flex-end',
    marginRight: 10,
  },
  chartSummaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  chartSummaryLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  chartExpandedContent: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  emptyChartContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyChartText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 5,
  },
  // --- FIN ESTILOS DE GRÁFICOS ---

  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
})