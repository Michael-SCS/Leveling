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

export default function EditarPerfilScreen({ navigation }) {
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
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <LinearGradient colors={[COLORS.primary, '#2A9D8F']} style={styles.header}>
        <View style={{ paddingTop: STATUS_BAR_HEIGHT }}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
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
          <Text style={styles.sectionTitle}>👤 Información Personal</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nombre Completo *</Text>
            <TextInput
              style={styles.input}
              value={nombreCompleto}
              onChangeText={setNombreCompleto}
              placeholder="Ej: Juan Pérez"
              placeholderTextColor={COLORS.textSecondary + '80'}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Edad (años)</Text>
              <TextInput
                style={styles.input}
                value={edad}
                onChangeText={setEdad}
                placeholder="25"
                keyboardType="numeric"
                maxLength={2}
                placeholderTextColor={COLORS.textSecondary + '80'}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Género</Text>
              <View style={styles.genderButtons}>
                <TouchableOpacity
                  style={[styles.genderButton, genero === 'Masculino' && styles.genderButtonActive]}
                  onPress={() => setGenero('Masculino')}
                >
                  <Text style={[styles.genderText, genero === 'Masculino' && styles.genderTextActive]}>M</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderButton, genero === 'Femenino' && styles.genderButtonActive]}
                  onPress={() => setGenero('Femenino')}
                >
                  <Text style={[styles.genderText, genero === 'Femenino' && styles.genderTextActive]}>F</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderButton, genero === 'Prefiero no decirlo' && styles.genderButtonActive]}
                  onPress={() => setGenero('Prefiero no decirlo')}
                >
                  <Text style={[styles.genderText, genero === 'Prefiero no decirlo' && styles.genderTextActive]}>N</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Métricas Físicas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Métricas Físicas</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Peso (kg)</Text>
              <TextInput
                style={styles.input}
                value={pesoActual}
                onChangeText={setPesoActual}
                placeholder="70"
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textSecondary + '80'}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Altura (cm)</Text>
              <TextInput
                style={styles.input}
                value={altura}
                onChangeText={setAltura}
                placeholder="175"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textSecondary + '80'}
              />
            </View>
          </View>
        </View>

        {/* Objetivo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Objetivo de Entrenamiento</Text>
          <View style={styles.quickOptionsRow}>
            <QuickOption value="Perder peso" selected={objetivo === 'Perder peso'} onPress={() => setObjetivo('Perder peso')} />
            <QuickOption value="Ganar masa" selected={objetivo === 'Ganar masa'} onPress={() => setObjetivo('Ganar masa')} />
            <QuickOption value="Mantener" selected={objetivo === 'Mantener'} onPress={() => setObjetivo('Mantener')} />
          </View>
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={objetivo}
            onChangeText={setObjetivo}
            placeholder="O escribe tu objetivo personalizado"
            placeholderTextColor={COLORS.textSecondary + '80'}
          />
        </View>

        {/* Lugar de Entrenamiento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Lugar de Entrenamiento</Text>
          <View style={styles.quickOptionsRow}>
            <QuickOption value="Casa" selected={lugarEntrenamiento === 'Casa'} onPress={() => setLugarEntrenamiento('Casa')} />
            <QuickOption value="Gimnasio" selected={lugarEntrenamiento === 'Gimnasio'} onPress={() => setLugarEntrenamiento('Gimnasio')} />
            <QuickOption value="Parque" selected={lugarEntrenamiento === 'Parque'} onPress={() => setLugarEntrenamiento('Parque')} />
          </View>
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={lugarEntrenamiento}
            onChangeText={setLugarEntrenamiento}
            placeholder="O especifica otro lugar"
            placeholderTextColor={COLORS.textSecondary + '80'}
          />
        </View>

        {/* Frecuencia */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Frecuencia y Duración</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Días por semana</Text>
            <View style={styles.quickOptionsRow}>
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
            <View style={styles.quickOptionsRow}>
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

        {/* Botones de Acción */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <MaterialIcons name="check" size={20} color={COLORS.white} />
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
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
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  genderTextActive: {
    color: COLORS.white,
  },
  quickOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickOption: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  quickOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  quickOptionTextSelected: {
    color: COLORS.white,
  },
  actionsContainer: {
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
})