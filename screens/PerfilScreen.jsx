import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { COLORS } from '../constants/colors'
import { supabase } from '../lib/supabase'

const InfoCard = ({ label, value, emoji }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLeft}>
      {emoji && <Text style={styles.infoEmoji}>{emoji}</Text>}
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
)

const OptionItem = ({ icon, text, onPress, isDestructive = false, showArrow = true }) => (
  <TouchableOpacity 
    style={[styles.optionButton, isDestructive && styles.optionButtonDestructive]} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.optionIconContainer, isDestructive && styles.optionIconDestructive]}>
      <Text style={styles.optionIcon}>{icon}</Text>
    </View>
    <Text style={[styles.optionText, isDestructive && { color: COLORS.error }]}>{text}</Text>
    {showArrow && <Text style={styles.optionArrow}>›</Text>}
  </TouchableOpacity>
)

export default function PerfilScreen({ navigation }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [puedeSubir, setPuedeSubir] = useState(false)
  const [checkingNivel, setCheckingNivel] = useState(false)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user) {
        loadUserData()
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
      checkNivelProgress(user.id)
    } catch (error) {
      console.log('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkNivelProgress = async (userId) => {
    try {
      const { data, error } = await supabase
        .rpc('puede_subir_nivel', { usuario_id: userId })
      
      if (!error && data === true) {
        setPuedeSubir(true)
      }
    } catch (error) {
      console.log('Error checking nivel:', error)
    }
  }

  const handleSubirNivel = () => {
    Alert.alert(
      '🎉 ¡Felicidades!',
      '¿Estás listo para subir de nivel? Esto desbloqueará rutinas más desafiantes.',
      [
        { text: 'Aún no', style: 'cancel' },
        {
          text: '¡A por ello!',
          onPress: async () => {
            setCheckingNivel(true)
            try {
              const { data, error } = await supabase
                .rpc('subir_nivel', { usuario_id: user.id })
              
              if (error) throw error
              
              Alert.alert(
                '¡Éxito! 🚀',
                `¡Felicidades! Ahora eres nivel ${data}. ¡Nuevas rutinas desbloqueadas!`,
                [{ text: 'Genial', onPress: () => loadUserData() }]
              )
            } catch (error) {
              Alert.alert('Error', 'No se pudo subir de nivel')
            } finally {
              setCheckingNivel(false)
            }
          }
        }
      ]
    )
  }

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Seguro que quieres salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut()
            navigation.replace('Login')
          }
        }
      ]
    )
  }

  const actualizarNivel = async (nuevoNivel) => {
    try {
      const { error } = await supabase
        .from('usuarios_info')
        .update({ 
          nivel: nuevoNivel,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (error) throw error

      Alert.alert('✅ Actualizado', `Tu nivel ahora es: ${nuevoNivel}`)
      loadUserData()
    } catch (error) {
      console.log('Error actualizando nivel:', error)
      Alert.alert('Error', 'No se pudo actualizar el nivel')
    }
  }

  const showLevelOptions = () => {
    Alert.alert(
      'Cambiar Nivel',
      'Selecciona tu nivel de experiencia actual.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Principiante', onPress: () => actualizarNivel('Principiante') },
        { text: 'Intermedio', onPress: () => actualizarNivel('Intermedio') },
        { text: 'Avanzado', onPress: () => actualizarNivel('Avanzado') }
      ],
      { cancelable: true }
    )
  }

  if (loading) {
    return (
      <LinearGradient
        colors={[COLORS.background, COLORS.surface]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando Perfil...</Text>
      </LinearGradient>
    )
  }

  const calcularIMC = () => {
    if (userInfo?.peso_actual && userInfo?.altura) {
      const alturaMetros = userInfo.altura / 100
      const imc = userInfo.peso_actual / (alturaMetros * alturaMetros)
      return imc.toFixed(1)
    }
    return 'N/A'
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
        {/* Header con Avatar Centrado */}
        <View style={styles.headerContainer}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primary + 'dd']}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {userInfo?.nombre_completo?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </LinearGradient>
          </View>
          <Text style={styles.name}>{userInfo?.nombre_completo}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.separator} />
        </View>

        {/* Badge de Nivel con Gradiente */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primary + 'dd']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.nivelCard}
        >
          <View style={styles.nivelIconContainer}>
            <Text style={styles.nivelIcon}>🏋️</Text>
          </View>
          <View style={styles.nivelInfo}>
            <Text style={styles.nivelLabel}>Nivel Actual</Text>
            <Text style={styles.nivelValue}>{userInfo?.nivel || 'N/A'}</Text>
          </View>
          {puedeSubir && userInfo?.nivel !== 'Avanzado' && (
            <TouchableOpacity 
              style={styles.nivelUpButton}
              onPress={handleSubirNivel}
              disabled={checkingNivel}
            >
              {checkingNivel ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.nivelUpIcon}>⬆️</Text>
              )}
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* Métricas Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <LinearGradient
              colors={[COLORS.primary + '20', COLORS.primary + '10']}
              style={styles.metricGradient}
            >
              <Text style={styles.metricEmoji}>⚖️</Text>
              <Text style={styles.metricValue}>{userInfo?.peso_actual || 'N/A'}</Text>
              <Text style={styles.metricLabel}>kg</Text>
            </LinearGradient>
          </View>

          <View style={styles.metricCard}>
            <LinearGradient
              colors={['#4ECDC420', '#4ECDC410']}
              style={styles.metricGradient}
            >
              <Text style={styles.metricEmoji}>📏</Text>
              <Text style={styles.metricValue}>{userInfo?.altura || 'N/A'}</Text>
              <Text style={styles.metricLabel}>cm</Text>
            </LinearGradient>
          </View>

          <View style={styles.metricCard}>
            <LinearGradient
              colors={['#FF6B6B20', '#FF6B6B10']}
              style={styles.metricGradient}
            >
              <Text style={styles.metricEmoji}>📊</Text>
              <Text style={styles.metricValue}>{calcularIMC()}</Text>
              <Text style={styles.metricLabel}>IMC</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Información Detallada */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles del Perfil</Text>
          <View style={styles.detailedInfoCard}>
            <InfoCard emoji="🎯" label="Objetivo" value={userInfo?.objetivo || 'N/A'} />
            <InfoCard emoji="📍" label="Lugar" value={userInfo?.lugar_entrenamiento || 'N/A'} />
            <InfoCard emoji="📅" label="Frecuencia" value={`${userInfo?.dias_semana || 0} días/semana`} />
            <InfoCard emoji="⏱️" label="Duración" value={`${userInfo?.tiempo_sesion || 0} min/sesión`} />
            <InfoCard emoji="🎂" label="Edad" value={`${userInfo?.edad || 'N/A'} años`} />
            <InfoCard emoji="👤" label="Género" value={userInfo?.genero || 'N/A'} />
          </View>
        </View>

        {/* Opciones de Configuración */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración</Text>
          <View style={styles.optionsContainer}>
            <OptionItem 
              icon="🔄" 
              text="Cambiar Nivel" 
              onPress={showLevelOptions} 
            />
            <OptionItem 
              icon="⚙️" 
              text="Ajustes de la App" 
              onPress={() => Alert.alert('Próximamente', 'Esta función estará disponible pronto')}
            />
            <OptionItem 
              icon="❓" 
              text="Ayuda y Soporte" 
              onPress={() => Alert.alert('Próximamente', 'Esta función estará disponible pronto')}
            />
            <OptionItem 
              icon="ℹ️" 
              text="Acerca de" 
              onPress={() => Alert.alert('Versión 1.0.0', 'Tu app de fitness personalizada')}
            />
          </View>
        </View>

        {/* Botón de Cerrar Sesión */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Versión 1.0.0</Text>
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
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.card,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  email: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  separator: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginTop: 12,
  },
  nivelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nivelIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  nivelIcon: {
    fontSize: 28,
  },
  nivelInfo: {
    flex: 1,
  },
  nivelLabel: {
    fontSize: 13,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 4,
    fontWeight: '500',
  },
  nivelValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  nivelUpButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nivelUpIcon: {
    fontSize: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  metricCard: {
    flex: 1,
  },
  metricGradient: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 110,
    justifyContent: 'center',
  },
  metricEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  detailedInfoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '40',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  optionsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '40',
  },
  optionButtonDestructive: {
    borderBottomWidth: 0,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionIconDestructive: {
    backgroundColor: COLORS.error + '20',
  },
  optionIcon: {
    fontSize: 20,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  optionArrow: {
    fontSize: 24,
    color: COLORS.textSecondary,
    opacity: 0.5,
    fontWeight: '300',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    borderWidth: 2,
    borderColor: COLORS.error + '40',
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.error,
  },
  version: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 24,
    fontWeight: '400',
    opacity: 0.6,
  },
})