import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { COLORS } from '../constants/colors'
import { supabase } from '../lib/supabase'

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24

export default function EditarPerfilScreen({ navigation, route }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)

  // Estados del formulario
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [edad, setEdad] = useState('')
  const [genero, setGenero] = useState('')
  const [pesoActual, setPesoActual] = useState('')
  const [altura, setAltura] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [lugarEntrenamiento, setLugarEntrenamiento] = useState('')
  const [diasSemana, setDiasSemana] = useState('')
  const [tiempoSesion, setTiempoSesion] = useState('')

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    setLoading(true)
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

      if (error && error.code !== 'PGRST116') throw error

      if (info) {
        setNombreCompleto(info.nombre_completo || '')
        setEdad(info.edad?.toString() || '')
        setGenero(info.genero || '')
        setPesoActual(info.peso_actual?.toString() || '')
        setAltura(info.altura?.toString() || '')
        setObjetivo(info.objetivo || '')
        setLugarEntrenamiento(info.lugar_entrenamiento || '')
        setDiasSemana(info.dias_semana?.toString() || '')
        setTiempoSesion(info.tiempo_sesion?.toString() || '')
      }
    } catch (error) {
      console.log('Error cargando datos:', error)
      Alert.alert('Error', 'No se pudo cargar tu información')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!nombreCompleto.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio')
      return
    }

    setSaving(true)
    try {
      const dataToUpdate = {
        nombre_completo: nombreCompleto.trim(),
        edad: edad ? parseInt(edad) : null,
        genero: genero || null,
        peso_actual: pesoActual ? parseFloat(pesoActual) : null,
        altura: altura ? parseFloat(altura) : null,
        objetivo: objetivo || null,
        lugar_entrenamiento: lugarEntrenamiento || null,
        dias_semana: diasSemana ? parseInt(diasSemana) : null,
        tiempo_sesion: tiempoSesion ? parseInt(tiempoSesion) : null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('usuarios_info')
        .update(dataToUpdate)
        .eq('user_id', user.id)

      if (error) throw error

      // Notificar a otras pantallas que se actualizó el perfil
      if (route.params?.onUpdate) {
        route.params.onUpdate()
      }

      Alert.alert(
        '✅ Perfil Actualizado',
        'Tus datos se han guardado correctamente',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
    } catch (error) {
      console.log('Error guardando:', error)
      Alert.alert('Error', 'No se pudo guardar la información')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    Alert.alert(
      'Cancelar Edición',
      '¿Descartar los cambios realizados?',
      [
        { text: 'Continuar Editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => navigation.goBack() }
      ]
    )
  }

  const QuickOption = ({ value, onPress, selected }) => (
    <TouchableOpacity
      style={[styles.quickOption, selected && styles.quickOptionSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.quickOptionText, selected && styles.quickOptionTextSelected]}>
        {value}
      </Text>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header con gradiente */}
      <LinearGradient colors={[COLORS.primary, '#2A9D8F']} style={styles.header}>
        <View style={{ paddingTop: STATUS_BAR_HEIGHT }}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={handleCancel} style={styles.backButton} activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Editar Perfil</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Información Personal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name="person" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Información Personal</Text>
          </View>
          
          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre Completo *</Text>
              <TextInput
                style={styles.input}
                value={nombreCompleto}
                onChangeText={setNombreCompleto}
                placeholder="Ej: Juan Pérez"
                placeholderTextColor={COLORS.textSecondary + '60'}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Edad</Text>
                <TextInput
                  style={styles.input}
                  value={edad}
                  onChangeText={setEdad}
                  placeholder="25"
                  keyboardType="numeric"
                  maxLength={2}
                  placeholderTextColor={COLORS.textSecondary + '60'}
                />
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Género</Text>
                <View style={styles.genderButtons}>
                  <TouchableOpacity
                    style={[styles.genderButton, genero === 'Masculino' && styles.genderButtonActive]}
                    onPress={() => setGenero('Masculino')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.genderButtonText, genero === 'Masculino' && styles.genderButtonTextActive]}>
                      M
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderButton, genero === 'Femenino' && styles.genderButtonActive]}
                    onPress={() => setGenero('Femenino')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.genderButtonText, genero === 'Femenino' && styles.genderButtonTextActive]}>
                      F
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderButton, genero === 'Prefiero no decirlo' && styles.genderButtonActive]}
                    onPress={() => setGenero('Prefiero no decirlo')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.genderButtonText, genero === 'Prefiero no decirlo' && styles.genderButtonTextActive]}>
                      N/A
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Métricas Físicas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name="monitor-weight" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Métricas Físicas</Text>
          </View>
          
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Peso (kg)</Text>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={[styles.input, styles.inputWithIconText]}
                    value={pesoActual}
                    onChangeText={setPesoActual}
                    placeholder="70"
                    keyboardType="decimal-pad"
                    placeholderTextColor={COLORS.textSecondary + '60'}
                  />
                  <View style={styles.inputIcon}>
                    <MaterialIcons name="fitness-center" size={18} color={COLORS.textSecondary} />
                  </View>
                </View>
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Altura (cm)</Text>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={[styles.input, styles.inputWithIconText]}
                    value={altura}
                    onChangeText={setAltura}
                    placeholder="175"
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.textSecondary + '60'}
                  />
                  <View style={styles.inputIcon}>
                    <MaterialIcons name="height" size={18} color={COLORS.textSecondary} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Objetivo */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name="flag" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Objetivo de Entrenamiento</Text>
          </View>
          
          <View style={styles.card}>
            <View style={styles.quickOptionsContainer}>
              <QuickOption 
                value="Bajar de peso" 
                selected={objetivo === 'Bajar de peso'} 
                onPress={() => setObjetivo('Bajar de peso')} 
              />
              <QuickOption 
                value="Aumentar músculo" 
                selected={objetivo === 'Aumentar músculo'} 
                onPress={() => setObjetivo('Aumentar músculo')} 
              />
              <QuickOption 
                value="Mantener estado físico" 
                selected={objetivo === 'Mantener estado físico'} 
                onPress={() => setObjetivo('Mantener estado físico')} 
              />
            </View>
          </View>
        </View>

        {/* Lugar de Entrenamiento */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name="location-on" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Lugar de Entrenamiento</Text>
          </View>
          
          <View style={styles.card}>
            <View style={styles.quickOptionsContainer}>
              <QuickOption 
                value="Casa" 
                selected={lugarEntrenamiento === 'Casa'} 
                onPress={() => setLugarEntrenamiento('Casa')} 
              />
              <QuickOption 
                value="Gimnasio" 
                selected={lugarEntrenamiento === 'Gimnasio'} 
                onPress={() => setLugarEntrenamiento('Gimnasio')} 
              />
              <QuickOption 
                value="Parque" 
                selected={lugarEntrenamiento === 'Parque'} 
                onPress={() => setLugarEntrenamiento('Parque')} 
              />
            </View>
          </View>
        </View>

        {/* Frecuencia */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name="calendar-today" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Frecuencia y Duración</Text>
          </View>
          
          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Días por semana</Text>
              <View style={styles.quickOptionsContainer}>
                {[3, 4, 5, 6, 7].map(day => (
                  <QuickOption
                    key={day}
                    value={day.toString()}
                    selected={diasSemana === day.toString()}
                    onPress={() => setDiasSemana(day.toString())}
                  />
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Duración por sesión (minutos)</Text>
              <View style={styles.quickOptionsContainer}>
                {[30, 45, 60, 90].map(time => (
                  <QuickOption
                    key={time}
                    value={time.toString()}
                    selected={tiempoSesion === time.toString()}
                    onPress={() => setTiempoSesion(time.toString())}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Botones de Acción */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <View style={styles.saveButtonIcon}>
                  <MaterialIcons name="check" size={22} color={COLORS.white} />
                </View>
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={20} color={COLORS.text} />
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputWithIconText: {
    paddingRight: 45,
  },
  inputIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  genderButtonTextActive: {
    color: COLORS.white,
  },
  quickOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickOption: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  quickOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },
  quickOptionTextSelected: {
    color: COLORS.white,
  },
  actionsContainer: {
    marginTop: 10,
    gap: 12,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cancelButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
})