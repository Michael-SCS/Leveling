import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'
import Button from '../components/Button'
import { COLORS } from '../constants/colors'

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
      
      // Verificar si puede subir de nivel
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
      
      if (!error && data) {
        setPuedeSubir(true)
      }
    } catch (error) {
      console.log('Error checking nivel:', error)
    }
  }

  const handleSubirNivel = async () => {
    Alert.alert(
      '🎉 ¡Felicidades!',
      '¿Estás listo para subir de nivel? Esto desbloqueará rutinas más desafiantes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Subir de Nivel',
          onPress: async () => {
            setCheckingNivel(true)
            try {
              const { data, error } = await supabase
                .rpc('subir_nivel', { usuario_id: user.id })
              
              if (error) throw error
              
              Alert.alert(
                '¡Éxito! 🚀',
                `Ahora eres nivel ${data}. ¡Nuevas rutinas desbloqueadas!`,
                [{ text: 'OK', onPress: () => loadUserData() }]
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
      '¿Cerrar sesión?',
      '¿Estás seguro que quieres salir?',
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
      loadUserData() // Recargar datos
    } catch (error) {
      console.log('Error actualizando nivel:', error)
      Alert.alert('Error', 'No se pudo actualizar el nivel')
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
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
        <Text style={styles.title}>Perfil</Text>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userInfo?.nombre_completo?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{userInfo?.nombre_completo}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Información Personal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Personal</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Edad</Text>
              <Text style={styles.infoValue}>{userInfo?.edad} años</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Género</Text>
              <Text style={styles.infoValue}>{userInfo?.genero}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Peso</Text>
              <Text style={styles.infoValue}>{userInfo?.peso_actual} kg</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Altura</Text>
              <Text style={styles.infoValue}>{userInfo?.altura} cm</Text>
            </View>
          </View>
        </View>

        {/* Objetivos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Objetivos y Preferencias</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Objetivo</Text>
              <Text style={styles.infoValue}>{userInfo?.objetivo}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nivel</Text>
              <View style={styles.nivelContainer}>
                <Text style={styles.infoValue}>{userInfo?.nivel}</Text>
                {puedeSubir && (
                  <View style={styles.nivelBadge}>
                    <Text style={styles.nivelBadgeText}>¡Listo para subir!</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Días por semana</Text>
              <Text style={styles.infoValue}>{userInfo?.dias_semana} días</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tiempo por sesión</Text>
              <Text style={styles.infoValue}>{userInfo?.tiempo_sesion} min</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lugar</Text>
              <Text style={styles.infoValue}>{userInfo?.lugar_entrenamiento}</Text>
            </View>
          </View>

          {/* Botón de subir de nivel */}
          {puedeSubir && userInfo?.nivel !== 'Avanzado' && (
            <TouchableOpacity
              style={styles.subirNivelButton}
              onPress={handleSubirNivel}
              disabled={checkingNivel}
            >
              <Text style={styles.subirNivelIcon}>🚀</Text>
              <View style={styles.subirNivelTexts}>
                <Text style={styles.subirNivelTitle}>¡Sube de Nivel!</Text>
                <Text style={styles.subirNivelSubtitle}>
                  Has completado suficientes entrenamientos
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Opciones */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              Alert.alert(
                'Cambiar Nivel',
                'Selecciona tu nuevo nivel de experiencia',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Principiante',
                    onPress: () => actualizarNivel('Principiante')
                  },
                  {
                    text: 'Intermedio',
                    onPress: () => actualizarNivel('Intermedio')
                  },
                  {
                    text: 'Avanzado',
                    onPress: () => actualizarNivel('Avanzado')
                  }
                ],
                { cancelable: true }
              )
            }}
          >
            <Text style={styles.optionIcon}>✏️</Text>
            <Text style={styles.optionText}>Editar Nivel</Text>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton}>
            <Text style={styles.optionIcon}>⚙️</Text>
            <Text style={styles.optionText}>Configuración</Text>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton}>
            <Text style={styles.optionIcon}>❓</Text>
            <Text style={styles.optionText}>Ayuda y Soporte</Text>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Botón de Cerrar Sesión */}
        <Button
          title="Cerrar Sesión"
          onPress={handleLogout}
          variant="outline"
          style={styles.logoutButton}
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
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 32,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '30',
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  nivelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nivelBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nivelBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
  },
  subirNivelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  subirNivelIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  subirNivelTexts: {
    flex: 1,
  },
  subirNivelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 2,
  },
  subirNivelSubtitle: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.9,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  optionArrow: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  logoutButton: {
    marginTop: 16,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 24,
  },
})