import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  FlatList
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'
import { COLORS } from '../constants/colors'

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [rutinas, setRutinas] = useState([])
  const [loadingRutinas, setLoadingRutinas] = useState(false)
  const [progreso, setProgreso] = useState({
    hoy: 0,
    semana: 0,
    calorias: 0
  })

  useEffect(() => {
    loadUserData()
  }, [])

  // Recargar progreso cuando la pantalla recibe foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user) {
        loadProgreso(user.id)
      }
    })
    return unsubscribe
  }, [navigation, user])

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        navigation.replace('Login')
        return
      }

      setUser(user)

      const { data: info, error } = await supabase
        .from('usuarios_info')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      setUserInfo(info)
      loadRutinasPersonalizadas(info.objetivo, info.nivel, info.lugar_entrenamiento)
      loadProgreso(user.id)
      
    } catch (error) {
      console.log('Error cargando datos:', error)
      Alert.alert('Error', 'No se pudieron cargar tus datos')
    } finally {
      setLoading(false)
    }
  }

  const loadProgreso = async (userId) => {
    try {
      const hoy = new Date().toISOString().split('T')[0]
      
      // Obtener inicio de la semana (lunes)
      const today = new Date()
      const dayOfWeek = today.getDay()
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const inicioSemana = new Date(today.setDate(diff)).toISOString().split('T')[0]

      // Entrenamientos de hoy
      const { data: entrenamientosHoy, error: errorHoy } = await supabase
        .from('entrenamientos_completados')
        .select('id, calorias_quemadas')
        .eq('user_id', userId)
        .eq('fecha', hoy)

      if (errorHoy) {
        console.log('Error entrenamientos hoy:', errorHoy)
      }

      // Entrenamientos de esta semana
      const { data: entrenamientosSemana, error: errorSemana } = await supabase
        .from('entrenamientos_completados')
        .select('id')
        .eq('user_id', userId)
        .gte('fecha', inicioSemana)

      if (errorSemana) {
        console.log('Error entrenamientos semana:', errorSemana)
      }

      // Calcular calorías totales de hoy
      const totalCalorias = entrenamientosHoy?.reduce((sum, item) => {
        return sum + (item.calorias_quemadas || 0)
      }, 0) || 0

      console.log('Progreso cargado:', {
        hoy: entrenamientosHoy?.length || 0,
        semana: entrenamientosSemana?.length || 0,
        calorias: totalCalorias
      })

      setProgreso({
        hoy: entrenamientosHoy?.length || 0,
        semana: entrenamientosSemana?.length || 0,
        calorias: totalCalorias
      })

    } catch (error) {
      console.log('Error cargando progreso:', error)
    }
  }

  const loadRutinasPersonalizadas = async (objetivo, nivel, lugar) => {
    setLoadingRutinas(true)
    try {
      const { data, error } = await supabase
        .from('rutinas_predefinidas')
        .select('*')
        .eq('objetivo', objetivo)
        .eq('nivel', nivel)
        .in('lugar', [lugar, 'Ambos'])
        .order('created_at', { ascending: false })

      if (error) throw error

      setRutinas(data || [])
    } catch (error) {
      console.log('Error cargando rutinas:', error)
    } finally {
      setLoadingRutinas(false)
    }
  }

  const handleRutinaPress = (rutina) => {
    navigation.navigate('RutinaDetalle', { rutinaId: rutina.id })
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    )
  }

  const renderRutinaItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.rutinaCard}
      onPress={() => handleRutinaPress(item)}
      activeOpacity={0.9}
    >
      {item.imagen_url && (
        <Image 
          source={{ uri: item.imagen_url }} 
          style={styles.rutinaImage}
          resizeMode="cover"
        />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.rutinaGradient}
      >
        <View style={styles.rutinaBadge}>
          <Text style={styles.rutinaBadgeText}>{item.nivel}</Text>
        </View>
        <Text style={styles.rutinaNombre}>{item.nombre}</Text>
        <Text style={styles.rutinaDescripcion} numberOfLines={2}>
          {item.descripcion}
        </Text>
        <View style={styles.rutinaInfo}>
          <Text style={styles.rutinaInfoText}>📅 {item.dias_semana} días</Text>
          <Text style={styles.rutinaInfoText}>⏱️ {item.duracion_minutos} min</Text>
          <Text style={styles.rutinaInfoText}>📍 {item.lugar}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )

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
        {/* Header Centrado y Mejorado */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hola 👋</Text>
          <Text style={styles.name}>{userInfo?.nombre_completo || 'Usuario'}</Text>
          <View style={styles.separator} />
        </View>

        {/* Tarjeta de Progreso Mejorada */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.cardTitle}>Tu Progreso de Hoy</Text>
            <Text style={styles.cardSubtitle}>Sigue así! 💪</Text>
          </View>
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primary + 'dd']}
                style={styles.progressCircle}
              >
                <Text style={styles.progressNumber}>{progreso.hoy}</Text>
              </LinearGradient>
              <Text style={styles.progressLabel}>Entrenamientos</Text>
            </View>
            <View style={styles.progressItem}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primary + 'dd']}
                style={styles.progressCircle}
              >
                <Text style={styles.progressNumber}>{progreso.semana}</Text>
              </LinearGradient>
              <Text style={styles.progressLabel}>Esta semana</Text>
            </View>
            <View style={styles.progressItem}>
              <LinearGradient
                colors={['#FF6B6B', '#FF8E53']}
                style={styles.progressCircle}
              >
                <Text style={styles.progressNumber}>{progreso.calorias}</Text>
              </LinearGradient>
              <Text style={styles.progressLabel}>Calorías</Text>
            </View>
          </View>
        </View>

        {/* Tarjeta de Objetivo Mejorada */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primary + 'dd']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.objetivoCard}
        >
          <View style={styles.objetivoHeader}>
            <View style={styles.objetivoIconContainer}>
              <Text style={styles.objetivoIcon}>🎯</Text>
            </View>
            <View style={styles.objetivoTexts}>
              <Text style={styles.objetivoLabel}>Tu Objetivo</Text>
              <Text style={styles.objetivoValue}>{userInfo?.objetivo}</Text>
            </View>
          </View>
          <View style={styles.objetivoStats}>
            <View style={styles.objetivoStat}>
              <Text style={styles.objetivoStatEmoji}>💪</Text>
              <Text style={styles.objetivoStatLabel}>Nivel</Text>
              <Text style={styles.objetivoStatValue}>{userInfo?.nivel}</Text>
            </View>
            <View style={styles.objetivoStat}>
              <Text style={styles.objetivoStatEmoji}>📅</Text>
              <Text style={styles.objetivoStatLabel}>Frecuencia</Text>
              <Text style={styles.objetivoStatValue}>{userInfo?.dias_semana}x semana</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Sección de Rutinas Mejorada */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Rutinas para ti</Text>
              <Text style={styles.sectionSubtitle}>Basadas en tu perfil</Text>
            </View>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Rutinas')}
              style={styles.verTodoButton}
            >
              <Text style={styles.verTodoText}>Ver todo</Text>
              <Text style={styles.verTodoIcon}>→</Text>
            </TouchableOpacity>
          </View>
          
          {loadingRutinas ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : rutinas.length > 0 ? (
            <FlatList
              data={rutinas}
              renderItem={renderRutinaItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={310}
              decelerationRate="fast"
              contentContainerStyle={styles.rutinasCarousel}
            />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No hay rutinas disponibles</Text>
              <Text style={styles.emptyText}>
                Estamos preparando rutinas personalizadas para ti
              </Text>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
    textAlign: 'center',
  },
  separator: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginTop: 12,
  },
  progressCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  progressItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  progressNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  objetivoCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  objetivoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  objetivoIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  objetivoIcon: {
    fontSize: 32,
  },
  objetivoTexts: {
    flex: 1,
  },
  objetivoLabel: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 4,
    fontWeight: '500',
  },
  objetivoValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  objetivoStats: {
    flexDirection: 'row',
    gap: 12,
  },
  objetivoStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  objetivoStatEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  objetivoStatLabel: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 6,
    fontWeight: '500',
  },
  objetivoStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  verTodoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  verTodoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 4,
  },
  verTodoIcon: {
    fontSize: 16,
    color: COLORS.primary,
  },
  rutinasCarousel: {
    paddingRight: 24,
  },
  rutinaCard: {
    width: 290,
    height: 260,
    borderRadius: 20,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
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
    padding: 20,
    justifyContent: 'flex-end',
  },
  rutinaBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: COLORS.primary,
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
  rutinaNombre: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  rutinaDescripcion: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.95,
    marginBottom: 12,
    lineHeight: 20,
  },
  rutinaInfo: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  rutinaInfoText: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
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
})