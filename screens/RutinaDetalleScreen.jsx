import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'
import { COLORS } from '../constants/colors'

export default function RutinaDetalleScreen({ route, navigation }) {
  const { rutinaId } = route.params
  const [loading, setLoading] = useState(true)
  const [rutina, setRutina] = useState(null)
  const [ejercicios, setEjercicios] = useState([])
  const [diaSeleccionado, setDiaSeleccionado] = useState(1)
  const [ejercicioExpandido, setEjercicioExpandido] = useState(null)

  useEffect(() => {
    loadRutinaDetalle()
  }, [])

  const loadRutinaDetalle = async () => {
    try {
      const { data: rutinaData, error: rutinaError } = await supabase
        .from('rutinas_predefinidas')
        .select('*')
        .eq('id', rutinaId)
        .single()

      if (rutinaError) throw rutinaError
      setRutina(rutinaData)

      const { data: ejerciciosData, error: ejerciciosError } = await supabase
        .from('rutina_predefinida_ejercicios')
        .select(`
          *,
          ejercicios (*)
        `)
        .eq('rutina_id', rutinaId)
        .order('dia_semana', { ascending: true })
        .order('orden', { ascending: true })

      if (ejerciciosError) throw ejerciciosError
      setEjercicios(ejerciciosData || [])
    } catch (error) {
      console.log('Error cargando detalle:', error)
      Alert.alert('Error', 'No se pudo cargar la rutina')
    } finally {
      setLoading(false)
    }
  }

  const handleIniciarRutina = () => {
    Alert.alert(
      '¡Vamos! 💪',
      '¿Listo para empezar tu entrenamiento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          onPress: () => {
            // Aquí iría la lógica para iniciar el entrenamiento
            console.log('Iniciar rutina:', rutina.nombre, 'Día:', diaSeleccionado)
            Alert.alert('¡Éxito!', 'Entrenamiento iniciado. ¡Dale con todo!')
          }
        }
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const dias = [...new Set(ejercicios.map(e => e.dia_semana))].sort((a, b) => a - b)
  const ejerciciosDia = ejercicios.filter(e => e.dia_semana === diaSeleccionado)

  return (
    <View style={styles.container}>
      {/* Header con imagen */}
      <View style={styles.headerContainer}>
        {rutina.imagen_url && (
          <Image 
            source={{ uri: rutina.imagen_url }} 
            style={styles.headerImage}
            resizeMode="cover"
          />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
          style={styles.headerGradient}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{rutina.nivel}</Text>
            </View>
            <Text style={styles.headerTitle}>{rutina.nombre}</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statIcon}>📅</Text>
                <Text style={styles.statValue}>{rutina.dias_semana}</Text>
                <Text style={styles.statLabel}>días</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statIcon}>⏱️</Text>
                <Text style={styles.statValue}>{rutina.duracion_minutos}</Text>
                <Text style={styles.statLabel}>min</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statIcon}>📍</Text>
                <Text style={styles.statValue}>{rutina.lugar}</Text>
                <Text style={styles.statLabel}>lugar</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Selector de días mejorado */}
      <View style={styles.diasContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.diasScroll}
        >
          {dias.map((dia) => (
            <TouchableOpacity
              key={dia}
              style={[
                styles.diaChip,
                diaSeleccionado === dia && styles.diaChipActive
              ]}
              onPress={() => setDiaSeleccionado(dia)}
            >
              <Text style={[
                styles.diaChipText,
                diaSeleccionado === dia && styles.diaChipTextActive
              ]}>
                Día {dia}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista de ejercicios rediseñada */}
      <ScrollView 
        style={styles.ejerciciosScroll}
        contentContainerStyle={styles.ejerciciosContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>
          {ejerciciosDia.length} ejercicios
        </Text>

        {ejerciciosDia.map((item, index) => {
          const isExpanded = ejercicioExpandido === item.id
          
          return (
            <View key={item.id} style={styles.ejercicioCard}>
              {/* Header del ejercicio */}
              <TouchableOpacity 
                style={styles.ejercicioHeader}
                onPress={() => setEjercicioExpandido(isExpanded ? null : item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.ejercicioNumero}>
                  <Text style={styles.ejercicioNumeroText}>{index + 1}</Text>
                </View>
                
                <View style={styles.ejercicioInfo}>
                  <Text style={styles.ejercicioNombre}>
                    {item.ejercicios.nombre}
                  </Text>
                  <Text style={styles.ejercicioCategoria}>
                    {item.ejercicios.categoria}
                  </Text>
                </View>

                <Text style={styles.expandIcon}>
                  {isExpanded ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {/* Stats siempre visibles */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statItemValue}>{item.series}</Text>
                  <Text style={styles.statItemLabel}>series</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statItemValue}>{item.repeticiones}</Text>
                  <Text style={styles.statItemLabel}>reps</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statItemValue}>{item.descanso_segundos}s</Text>
                  <Text style={styles.statItemLabel}>descanso</Text>
                </View>
              </View>

              {/* Contenido expandible */}
              {isExpanded && (
                <View style={styles.ejercicioExpandido}>
                  {item.ejercicios.instrucciones && (
                    <View style={styles.instruccionesBox}>
                      <Text style={styles.instruccionesTitle}>
                        📋 Cómo hacerlo
                      </Text>
                      <Text style={styles.instruccionesText}>
                        {item.ejercicios.instrucciones}
                      </Text>
                    </View>
                  )}

                  {item.notas && (
                    <View style={styles.notasBox}>
                      <Text style={styles.notasIcon}>💡</Text>
                      <Text style={styles.notasText}>{item.notas}</Text>
                    </View>
                  )}

                  {item.ejercicios.musculos_trabajados && (
                    <View style={styles.musculosBox}>
                      <Text style={styles.musculosTitle}>
                        💪 Músculos trabajados
                      </Text>
                      <View style={styles.musculosTags}>
                        {item.ejercicios.musculos_trabajados.map((musculo, i) => (
                          <View key={i} style={styles.musculoTag}>
                            <Text style={styles.musculoTagText}>{musculo}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )
        })}

        {/* Botón de iniciar rutina */}
        <TouchableOpacity 
          style={styles.iniciarButton}
          onPress={handleIniciarRutina}
          activeOpacity={0.8}
        >
          <Text style={styles.iniciarButtonText}>Iniciar Entrenamiento</Text>
          <Text style={styles.iniciarButtonIcon}>🔥</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  
  // Header
  headerContainer: {
    height: 260,
  },
  headerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '600',
  },
  headerInfo: {
    paddingHorizontal: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.white,
    opacity: 0.8,
  },

  // Selector de días
  diasContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  diasScroll: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  diaChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  diaChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  diaChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  diaChipTextActive: {
    color: COLORS.white,
  },

  // Ejercicios
  ejerciciosScroll: {
    flex: 1,
  },
  ejerciciosContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  ejercicioCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ejercicioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  ejercicioNumero: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ejercicioNumeroText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  ejercicioInfo: {
    flex: 1,
  },
  ejercicioNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  ejercicioCategoria: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  expandIcon: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statItemLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  ejercicioExpandido: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  instruccionesBox: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
  },
  instruccionesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  instruccionesText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  notasBox: {
    backgroundColor: COLORS.primary + '15',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notasIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  notasText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
  },
  musculosBox: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
  },
  musculosTitle: {
    fontSize: 12,
    color: COLORS.text,
    marginBottom: 8,
  },
  musculosTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  musculoTag: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  musculoTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  iniciarButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iniciarButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginRight: 8,
  },
  iniciarButtonIcon: {
    fontSize: 20,
  },
  bottomSpacer: {
    height: 20,
  },
})