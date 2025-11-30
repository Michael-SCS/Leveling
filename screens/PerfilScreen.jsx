import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'
import { COLORS } from '../constants/colors'

// Componente de tarjeta de información reutilizable
const InfoCard = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
)

// Elemento de opción
const OptionItem = ({ icon, text, onPress, isDestructive = false }) => (
  <TouchableOpacity style={styles.optionButton} onPress={onPress}>
    <Text style={[styles.optionIcon, isDestructive && { color: COLORS.error }]}>{icon}</Text>
    <Text style={[styles.optionText, isDestructive && { color: COLORS.error }]}>{text}</Text>
    <Text style={styles.optionArrow}>›</Text>
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

  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.surface]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Mi Perfil</Text>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarShadow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userInfo?.nombre_completo?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          </View>
          <Text style={styles.name}>{userInfo?.nombre_completo}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Métricas */}
        <View style={[styles.section, styles.metricsCard]}>
          <Text style={styles.sectionTitle}>Mi Fitness Hoy</Text>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{userInfo?.nivel || 'N/A'}</Text>
              <Text style={styles.metricLabel}>Nivel</Text>
            </View>
            <View style={styles.metricSeparator} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{userInfo?.peso_actual || 'N/A'} kg</Text>
              <Text style={styles.metricLabel}>Peso</Text>
            </View>
            <View style={styles.metricSeparator} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{userInfo?.altura || 'N/A'} cm</Text>
              <Text style={styles.metricLabel}>Altura</Text>
            </View>
          </View>

          {/* Botón de subir de nivel */}
          {puedeSubir && userInfo?.nivel !== 'Avanzado' && (
            <TouchableOpacity
              style={styles.subirNivelButton}
              onPress={handleSubirNivel}
              disabled={checkingNivel}
            >
              {checkingNivel ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.subirNivelIcon}>⭐</Text>
                  <View style={styles.subirNivelTexts}>
                    <Text style={styles.subirNivelTitle}>¡Nivel Desbloqueado!</Text>
                    <Text style={styles.subirNivelSubtitle}>
                      Sube a un desafío mayor
                    </Text>
                  </View>
                  <Text style={styles.subirNivelArrow}>→</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Información Detallada */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles y Preferencias</Text>
          <View style={styles.detailedInfoCard}>
            <InfoCard label="Objetivo" value={userInfo?.objetivo} />
            <InfoCard label="Lugar de Entrenamiento" value={userInfo?.lugar_entrenamiento} />
            <InfoCard label="Días por Semana" value={`${userInfo?.dias_semana} días`} />
            <InfoCard label="Tiempo por Sesión" value={`${userInfo?.tiempo_sesion} min`} />
            <InfoCard label="Edad" value={`${userInfo?.edad} años`} />
            <InfoCard label="Género" value={userInfo?.genero} />
          </View>
        </View>

        {/* Opciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ajustes de la Cuenta</Text>
          <View style={styles.settingsGroup}>
            <OptionItem 
              icon="🏋️" 
              text="Cambiar Nivel de Experiencia" 
              onPress={showLevelOptions} 
            />
            <OptionItem 
              icon="⚙️" 
              text="Configuración de la Aplicación" 
              onPress={() => Alert.alert('Próximamente', 'Esta función estará disponible pronto')}
            />
            <OptionItem 
              icon="❓" 
              text="Ayuda y Soporte" 
              onPress={() => Alert.alert('Próximamente', 'Esta función estará disponible pronto')}
            />
          </View>
        </View>
        
        {/* Cerrar Sesión */}
        <OptionItem 
          icon="🚪" 
          text="Cerrar Sesión" 
          onPress={handleLogout} 
          isDestructive={true}
        />

        <Text style={styles.version}>Versión 1.0.0</Text>
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  scrollContent: {
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 30,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarShadow: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
        backgroundColor: COLORS.card,
        borderRadius: 60,
      },
    }),
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.surface,
  },
  avatarText: {
    fontSize: 50,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
  },
  email: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  metricsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 10,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricSeparator: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: 5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  subirNivelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    borderRadius: 12,
    padding: 18,
    marginTop: 15,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  subirNivelIcon: {
    fontSize: 28,
    marginRight: 15,
  },
  subirNivelTexts: {
    flex: 1,
  },
  subirNivelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 2,
  },
  subirNivelSubtitle: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
    fontWeight: '500',
  },
  subirNivelArrow: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: '700',
  },
  detailedInfoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '30',
  },
  infoLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  settingsGroup: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  optionIcon: {
    fontSize: 20,
    width: 30,
    textAlign: 'center',
    marginRight: 10,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  optionArrow: {
    fontSize: 24,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
  version: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 30,
    fontWeight: '300',
  },
})