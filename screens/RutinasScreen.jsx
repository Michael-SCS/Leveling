import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'
import { COLORS } from '../constants/colors'

export default function RutinasScreen({ navigation }) {
  const [loading, setLoading] = useState(true)
  const [rutinas, setRutinas] = useState([])
  const [userInfo, setUserInfo] = useState(null)

  useEffect(() => {
    loadRutinas()
  }, [])

  const loadRutinas = async () => {
    try {
      // Obtener info del usuario
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: info } = await supabase
        .from('usuarios_info')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setUserInfo(info)

      // Cargar TODAS las rutinas que coincidan con el objetivo
      // SIN filtrar por nivel - mostrar todas
      const { data, error } = await supabase
        .from('rutinas_predefinidas')
        .select('*')
        .eq('objetivo', info.objetivo)
        .order('nivel', { ascending: true })

      if (error) throw error

      console.log(`Total rutinas para ${info.objetivo}:`, data?.length || 0)
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
        <Text style={styles.title}>Rutinas</Text>
        <Text style={styles.subtitle}>
          Objetivo: {userInfo?.objetivo}
        </Text>

        {rutinas.map((rutina) => (
          <TouchableOpacity 
            key={rutina.id}
            style={styles.rutinaCard}
            activeOpacity={0.8}
            onPress={() => handleRutinaPress(rutina)}
          >
            {rutina.imagen_url && (
              <Image 
                source={{ uri: rutina.imagen_url }} 
                style={styles.rutinaImage}
                resizeMode="cover"
              />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.rutinaGradient}
            >
              <View style={styles.rutinaBadge}>
                <Text style={styles.rutinaBadgeText}>{rutina.nivel}</Text>
              </View>
              <Text style={styles.rutinaNombre}>{rutina.nombre}</Text>
              <Text style={styles.rutinaDescripcion} numberOfLines={2}>
                {rutina.descripcion}
              </Text>
              <View style={styles.rutinaInfo}>
                <Text style={styles.rutinaInfoText}>
                  📅 {rutina.dias_semana} días
                </Text>
                <Text style={styles.rutinaInfoText}>
                  ⏱️ {rutina.duracion_minutos} min
                </Text>
                <Text style={styles.rutinaInfoText}>
                  📍 {rutina.lugar}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        {rutinas.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No hay rutinas disponibles</Text>
            <Text style={styles.emptyText}>
              Pronto habrá más rutinas para ti
            </Text>
          </View>
        )}
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  rutinaCard: {
    height: 240,
    borderRadius: 16,
    marginBottom: 16,
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
    marginTop: 40,
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