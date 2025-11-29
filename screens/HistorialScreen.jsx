import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'
import { COLORS } from '../constants/colors'

export default function HistorialScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [entrenamientos, setEntrenamientos] = useState([])
  const [estadisticas, setEstadisticas] = useState({
    totalEntrenamientos: 0,
    totalMinutos: 0,
    totalCalorias: 0,
    totalXP: 0,
    estaSemana: 0
  })

  useEffect(() => {
    loadHistorial()
  }, [])

  const loadHistorial = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Cargar entrenamientos con info de rutina
      const { data: entrenamientosData, error } = await supabase
        .from('entrenamientos_completados')
        .select(`
          *,
          rutinas_predefinidas (
            nombre,
            imagen_url
          )
        `)
        .eq('user_id', user.id)
        .order('fecha', { ascending: false })
        .limit(50)

      if (error) throw error

      setEntrenamientos(entrenamientosData || [])

      // Calcular estadísticas
      const total = entrenamientosData?.length || 0
      const minutos = entrenamientosData?.reduce((sum, e) => sum + (e.duracion_minutos || 0), 0) || 0
      const calorias = entrenamientosData?.reduce((sum, e) => sum + (e.calorias_quemadas || 0), 0) || 0
      const xp = entrenamientosData?.reduce((sum, e) => sum + (e.xp_ganada || 0), 0) || 0

      // Entrenamientos de esta semana
      const haceUnaSemana = new Date()
      haceUnaSemana.setDate(haceUnaSemana.getDate() - 7)
      const semana = entrenamientosData?.filter(e =>
        new Date(e.fecha) >= haceUnaSemana
      ).length || 0

      setEstadisticas({
        totalEntrenamientos: total,
        totalMinutos: minutos,
        totalCalorias: calorias,
        totalXP: xp,
        estaSemana: semana
      })

    } catch (error) {
      console.log('Error cargando historial:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadHistorial()
  }

  const formatearFecha = (fecha) => {
    const date = new Date(fecha)
    const hoy = new Date()
    const ayer = new Date(hoy)
    ayer.setDate(ayer.getDate() - 1)

    if (date.toDateString() === hoy.toDateString()) {
      return 'Hoy'
    } else if (date.toDateString() === ayer.toDateString()) {
      return 'Ayer'
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== hoy.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  const formatearHora = (fecha) => {
    return new Date(fecha).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <Text style={styles.title}>Historial</Text>

        {/* Estadísticas generales */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{estadisticas.totalEntrenamientos}</Text>
            <Text style={styles.statLabel}>Entrenamientos</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{estadisticas.estaSemana}</Text>
            <Text style={styles.statLabel}>Esta semana</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Math.floor(estadisticas.totalMinutos / 60)}h</Text>
            <Text style={styles.statLabel}>Total tiempo</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{estadisticas.totalCalorias}</Text>
            <Text style={styles.statLabel}>Calorías</Text>
          </View>
        </View>

        {/* XP Total */}
        <View style={styles.xpCard}>
          <View style={styles.xpIcon}>
            <Text style={styles.xpIconText}>⭐</Text>
          </View>
          <View style={styles.xpInfo}>
            <Text style={styles.xpLabel}>XP Total Ganada</Text>
            <Text style={styles.xpValue}>+{estadisticas.totalXP} XP</Text>
          </View>
        </View>

        {/* Lista de entrenamientos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entrenamientos Recientes</Text>

          {entrenamientos.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Sin entrenamientos aún</Text>
              <Text style={styles.emptyText}>
                Completa tu primer entrenamiento para verlo aquí
              </Text>
            </View>
          ) : (
            entrenamientos.map((entrenamiento) => (
              <View key={entrenamiento.id} style={styles.entrenamientoCard}>
                <View style={styles.entrenamientoHeader}>
                  <View style={styles.entrenamientoFecha}>
                    <Text style={styles.entrenamientoDia}>
                      {formatearFecha(entrenamiento.fecha)}
                    </Text>
                    <Text style={styles.entrenamientoHora}>
                      {formatearHora(entrenamiento.fecha)}
                    </Text>
                  </View>

                  {entrenamiento.xp_ganada > 0 && (
                    <View style={styles.xpBadge}>
                      <Text style={styles.xpBadgeText}>+{entrenamiento.xp_ganada} XP</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.entrenamientoNombre}>
                  {entrenamiento.rutinas_predefinidas?.nombre || 'Entrenamiento'}
                </Text>

                <View style={styles.entrenamientoStats}>
                  <View style={styles.entrenamientoStat}>
                    <Text style={styles.entrenamientoStatIcon}>⏱️</Text>
                    <Text style={styles.entrenamientoStatText}>
                      {entrenamiento.duracion_minutos} min
                    </Text>
                  </View>

                  <View style={styles.entrenamientoStat}>
                    <Text style={styles.entrenamientoStatIcon}>🔥</Text>
                    <Text style={styles.entrenamientoStatText}>
                      {entrenamiento.calorias_quemadas || 0} kcal
                    </Text>
                  </View>

                  {entrenamiento.ejercicios_completados && (
                    <View style={styles.entrenamientoStat}>
                      <Text style={styles.entrenamientoStatIcon}>💪</Text>
                      <Text style={styles.entrenamientoStatText}>
                        {Array.isArray(entrenamiento.ejercicios_completados)
                          ? entrenamiento.ejercicios_completados.length
                          : 0} ejercicios
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.bottomSpacer} />
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
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  xpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  xpIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  xpIconText: {
    fontSize: 24,
  },
  xpInfo: {
    flex: 1,
  },
  xpLabel: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 4,
  },
  xpValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
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
  entrenamientoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  entrenamientoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entrenamientoFecha: {
    flex: 1,
  },
  entrenamientoDia: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  entrenamientoHora: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  xpBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  entrenamientoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  entrenamientoStats: {
    flexDirection: 'row',
    gap: 16,
  },
  entrenamientoStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entrenamientoStatIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  entrenamientoStatText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 20,
  },
})