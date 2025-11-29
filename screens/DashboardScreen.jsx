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

  useEffect(() => {
    loadUserData()
  }, [])

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
      
    } catch (error) {
      console.log('Error cargando datos:', error)
      Alert.alert('Error', 'No se pudieron cargar tus datos')
    } finally {
      setLoading(false)
    }
  }

  const loadRutinasPersonalizadas = async (objetivo, nivel, lugar) => {
    setLoadingRutinas(true)
    try {
      // Convertir nivel texto a rango numérico
      let nivelMin = 1, nivelMax = 5

      if (nivel === 'Principiante') {
        nivelMin = 1
        nivelMax = 5
      } else if (nivel === 'Intermedio') {
        nivelMin = 6
        nivelMax = 15
      } else if (nivel === 'Avanzado') {
        nivelMin = 16
        nivelMax = 100
      }

      // Solo buscar rutinas del nivel actual del usuario
      const { data, error } = await supabase
        .from('rutinas_predefinidas')
        .select('*')
        .eq('objetivo', objetivo)
        .eq('nivel', nivel) // Solo su nivel exacto
        .in('lugar', [lugar, 'Ambos'])
        .order('created_at', { ascending: false })
        .limit(5)

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
        colors={['transparent', 'rgba(0,0,0,0.85)']}
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
          <Text style={styles.rutinaInfoText}>
            📅 {item.dias_semana} días
          </Text>
          <Text style={styles.rutinaInfoText}>
            ⏱️ {item.duracion_minutos} min
          </Text>
          <Text style={styles.rutinaInfoText}>
            📍 {item.lugar}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )

  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.surface]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, 👋</Text>
            <Text style={styles.name}>{userInfo?.nombre_completo || 'Usuario'}</Text>
          </View>
        </View>

        {/* Tarjeta de Progreso */}
        <View style={styles.progressCard}>
          <Text style={styles.cardTitle}>Tu Progreso de Hoy</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
              <Text style={styles.progressNumber}>0</Text>
              <Text style={styles.progressLabel}>Entrenamientos</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressItem}>
              <Text style={styles.progressNumber}>0</Text>
              <Text style={styles.progressLabel}>Esta semana</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressItem}>
              <Text style={styles.progressNumber}>0</Text>
              <Text style={styles.progressLabel}>Calorías</Text>
            </View>
          </View>
        </View>

        {/* Tarjeta de Objetivo */}
        <View style={styles.objetivoCard}>
          <View style={styles.objetivoHeader}>
            <Text style={styles.objetivoIcon}>🎯</Text>
            <View style={styles.objetivoTexts}>
              <Text style={styles.objetivoLabel}>Tu Objetivo</Text>
              <Text style={styles.objetivoValue}>{userInfo?.objetivo}</Text>
            </View>
          </View>
          <View style={styles.objetivoStats}>
            <View style={styles.objetivoStat}>
              <Text style={styles.objetivoStatLabel}>Nivel</Text>
              <Text style={styles.objetivoStatValue}>{userInfo?.nivel}</Text>
            </View>
            <View style={styles.objetivoStat}>
              <Text style={styles.objetivoStatLabel}>Frecuencia</Text>
              <Text style={styles.objetivoStatValue}>{userInfo?.dias_semana}x semana</Text>
            </View>
          </View>
        </View>

        {/* Sección de Rutinas Personalizadas con Carrusel */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Rutinas Para Ti</Text>
              <Text style={styles.sectionSubtitle}>
                Basadas en tu objetivo
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Rutinas')}
              style={styles.verTodoButton}
            >
              <Text style={styles.verTodoText}>Ver todo</Text>
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
    paddingTop: 70, // Espacio para el notch/status bar
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
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
  progressNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  progressDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  objetivoCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  objetivoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  objetivoIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  objetivoTexts: {
    flex: 1,
  },
  objetivoLabel: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.8,
    marginBottom: 4,
  },
  objetivoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  objetivoStats: {
    flexDirection: 'row',
    gap: 16,
  },
  objetivoStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
  },
  objetivoStatLabel: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
    marginBottom: 4,
  },
  objetivoStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  verTodoButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  verTodoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  rutinasCarousel: {
    paddingRight: 24,
  },
  rutinaCard: {
    width: 280,
    height: 240,
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rutinaImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  rutinaGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  rutinaBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rutinaBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  rutinaNombre: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  rutinaDescripcion: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 12,
  },
  rutinaInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  rutinaInfoText: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    fontSize: 48,
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
  },
})