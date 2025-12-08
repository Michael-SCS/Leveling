import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import AuthInput from '../components/AuthInput'
import Button from '../components/Button'
import { COLORS } from '../constants/colors'
import { supabase } from '../lib/supabase'

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  
  // Paso 1: Credenciales
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Paso 2: Datos personales
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [edad, setEdad] = useState('')
  const [genero, setGenero] = useState('')
  
  // Paso 3: Datos físicos
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  
  // Paso 4: Objetivos
  const [objetivo, setObjetivo] = useState('')
  const [diasSemana, setDiasSemana] = useState('')
  const [tiempoSesion, setTiempoSesion] = useState('')
  const [lugarEntrenamiento, setLugarEntrenamiento] = useState('')
  
  // Paso 5: Equipamiento
  const [equipamiento, setEquipamiento] = useState([])

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      navigation.replace('Dashboard')
    }
  }

  const validateStep1 = () => {
    const newErrors = {}
    
    if (!email) {
      newErrors.email = 'El email es requerido'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email inválido'
    }
    
    if (!password) {
      newErrors.password = 'La contraseña es requerida'
    } else if (password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres'
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors = {}
    
    if (!nombreCompleto) newErrors.nombreCompleto = 'El nombre es requerido'
    if (!edad) newErrors.edad = 'La edad es requerida'
    if (!genero) newErrors.genero = 'Selecciona tu género'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep3 = () => {
    const newErrors = {}
    
    if (!peso) newErrors.peso = 'El peso es requerido'
    if (!altura) newErrors.altura = 'La altura es requerida'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep4 = () => {
    const newErrors = {}
    
    if (!objetivo) newErrors.objetivo = 'Selecciona tu objetivo'
    if (!diasSemana) newErrors.diasSemana = 'Indica cuántos días entrenarás'
    if (!tiempoSesion) newErrors.tiempoSesion = 'Indica el tiempo por sesión'
    if (!lugarEntrenamiento) newErrors.lugarEntrenamiento = 'Selecciona dónde entrenarás'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep5 = () => {
    const newErrors = {}
    
    if (equipamiento.length === 0) {
      newErrors.equipamiento = 'Selecciona al menos una opción'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNextStep = () => {
    setErrors({})
    
    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      setStep(3)
    } else if (step === 3 && validateStep3()) {
      setStep(4)
    } else if (step === 4 && validateStep4()) {
      setStep(5)
    } else if (step === 5 && validateStep5()) {
      handleRegister()
    }
  }

  const toggleEquipamiento = (item) => {
    // Si selecciona "Sin material", limpiar todo lo demás
    if (item === 'Sin material') {
      setEquipamiento(['Sin material'])
      return
    }
    
    // Si ya tiene "Sin material" y selecciona otra cosa, removerlo
    if (equipamiento.includes('Sin material')) {
      setEquipamiento([item])
      return
    }
    
    // Toggle normal
    if (equipamiento.includes(item)) {
      setEquipamiento(equipamiento.filter(e => e !== item))
    } else {
      setEquipamiento([...equipamiento, item])
    }
  }

  const handleRegister = async () => {
    setLoading(true)
    try {
      console.log('=== INICIANDO REGISTRO ===')
      
      // 1. Registrar usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      })

      if (authError) {
        console.error('❌ Error en Auth:', authError)
        throw authError
      }

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario en Authentication')
      }

      console.log('✅ Usuario creado en Auth:', authData.user.id)

      // 2. Guardar información adicional del usuario
      const perfilData = {
        user_id: authData.user.id,
        nombre_completo: nombreCompleto.trim(),
        edad: parseInt(edad),
        genero: genero,
        peso_actual: parseFloat(peso),
        altura: parseFloat(altura),
        objetivo: objetivo,
        dias_semana: parseInt(diasSemana),
        tiempo_sesion: parseInt(tiempoSesion),
        lugar_entrenamiento: lugarEntrenamiento,
        equipamiento: equipamiento, // Array directo para text[]
      }

      console.log('📝 Intentando guardar perfil:', JSON.stringify(perfilData, null, 2))

      const { data: insertData, error: profileError } = await supabase
        .from('usuarios_info')
        .insert([perfilData])
        .select()

      if (profileError) {
        console.error('❌ Error guardando en usuarios_info:', profileError)
        console.error('Detalles del error:', JSON.stringify(profileError, null, 2))
        throw new Error(`Error al guardar perfil: ${profileError.message}`)
      }

      console.log('✅ Perfil guardado exitosamente:', insertData)

      // Hacer login automático después del registro
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (signInError) {
        console.log('⚠️ Error al iniciar sesión automática:', signInError)
        // No es crítico, el usuario puede hacer login manualmente
      } else {
        console.log('✅ Sesión iniciada automáticamente')
      }

      Alert.alert(
        '¡Registro exitoso!', 
        'Bienvenido a FitFlow',
        [{ 
          text: 'Comenzar', 
          onPress: () => {
            // El AuthProvider detectará la sesión y navegará automáticamente
            // o forzamos la navegación si es necesario
            navigation.replace('Dashboard')
          }
        }]
      )
      
    } catch (error) {
      console.error('❌ ERROR GENERAL:', error)
      Alert.alert(
        'Error en el registro', 
        error.message || 'No se pudo completar el registro. Por favor intenta de nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Crea tu cuenta</Text>
      <Text style={styles.stepSubtitle}>Paso 1 de 5</Text>

      <AuthInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />

      <AuthInput
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="Mínimo 6 caracteres"
        secureTextEntry
        error={errors.password}
      />

      <AuthInput
        label="Confirmar contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Repite tu contraseña"
        secureTextEntry
        error={errors.confirmPassword}
      />
    </View>
  )

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Cuéntanos sobre ti</Text>
      <Text style={styles.stepSubtitle}>Paso 2 de 5</Text>

      <AuthInput
        label="Nombre completo"
        value={nombreCompleto}
        onChangeText={setNombreCompleto}
        placeholder="Juan Pérez"
        error={errors.nombreCompleto}
      />

      <AuthInput
        label="Edad"
        value={edad}
        onChangeText={setEdad}
        placeholder="25"
        keyboardType="numeric"
        error={errors.edad}
      />

      <Text style={styles.label}>Género</Text>
      <View style={styles.optionsRow}>
        <OptionButton 
          title="Masculino" 
          selected={genero === 'Masculino'}
          onPress={() => setGenero('Masculino')}
        />
        <OptionButton 
          title="Femenino" 
          selected={genero === 'Femenino'}
          onPress={() => setGenero('Femenino')}
        />
        <OptionButton 
          title="Otro" 
          selected={genero === 'Otro'}
          onPress={() => setGenero('Otro')}
        />
      </View>
      {errors.genero && <Text style={styles.errorText}>{errors.genero}</Text>}
    </View>
  )

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Datos físicos</Text>
      <Text style={styles.stepSubtitle}>Paso 3 de 5</Text>

      <AuthInput
        label="Peso actual (kg)"
        value={peso}
        onChangeText={setPeso}
        placeholder="70"
        keyboardType="decimal-pad"
        error={errors.peso}
      />

      <AuthInput
        label="Altura (cm)"
        value={altura}
        onChangeText={setAltura}
        placeholder="170"
        keyboardType="decimal-pad"
        error={errors.altura}
      />
    </View>
  )

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tus objetivos</Text>
      <Text style={styles.stepSubtitle}>Paso 4 de 5</Text>

      <Text style={styles.label}>¿Cuál es tu objetivo principal?</Text>
      <View style={styles.optionsColumn}>
        <OptionButton 
          title="Bajar de peso" 
          selected={objetivo === 'Bajar de peso'}
          onPress={() => setObjetivo('Bajar de peso')}
          fullWidth
        />
        <OptionButton 
          title="Aumentar músculo" 
          selected={objetivo === 'Aumentar músculo'}
          onPress={() => setObjetivo('Aumentar músculo')}
          fullWidth
        />
        <OptionButton 
          title="Mantener estado físico" 
          selected={objetivo === 'Mantener estado físico'}
          onPress={() => setObjetivo('Mantener estado físico')}
          fullWidth
        />
      </View>
      {errors.objetivo && <Text style={styles.errorText}>{errors.objetivo}</Text>}

      <AuthInput
        label="¿Cuántos días a la semana entrenarás?"
        value={diasSemana}
        onChangeText={setDiasSemana}
        placeholder="3"
        keyboardType="numeric"
        error={errors.diasSemana}
      />

      <AuthInput
        label="¿Cuánto tiempo por sesión? (minutos)"
        value={tiempoSesion}
        onChangeText={setTiempoSesion}
        placeholder="45"
        keyboardType="numeric"
        error={errors.tiempoSesion}
      />

      <Text style={styles.label}>¿Dónde entrenarás?</Text>
      <View style={styles.optionsRow}>
        <OptionButton 
          title="Casa" 
          selected={lugarEntrenamiento === 'Casa'}
          onPress={() => setLugarEntrenamiento('Casa')}
        />
        <OptionButton 
          title="Gimnasio" 
          selected={lugarEntrenamiento === 'Gimnasio'}
          onPress={() => setLugarEntrenamiento('Gimnasio')}
        />
        <OptionButton 
          title="Ambos" 
          selected={lugarEntrenamiento === 'Ambos'}
          onPress={() => setLugarEntrenamiento('Ambos')}
        />
      </View>
      {errors.lugarEntrenamiento && <Text style={styles.errorText}>{errors.lugarEntrenamiento}</Text>}
    </View>
  )

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tu equipamiento</Text>
      <Text style={styles.stepSubtitle}>Paso 5 de 5</Text>

      <Text style={styles.labelWithEmoji}>
        💪 ¿Qué equipo de entrenamiento tienes disponible?
      </Text>
      <Text style={styles.helperText}>
        Selecciona todo lo que tengas. ¡No hay excusas para no entrenar!
      </Text>

      <View style={styles.equipmentGrid}>
        <EquipmentButton 
          title="🏋️ Mancuernas" 
          selected={equipamiento.includes('Mancuernas')}
          onPress={() => toggleEquipamiento('Mancuernas')}
        />
        <EquipmentButton 
          title="🎯 Bandas elásticas" 
          selected={equipamiento.includes('Bandas elásticas')}
          onPress={() => toggleEquipamiento('Bandas elásticas')}
        />
        <EquipmentButton 
          title="⚫ Pesa rusa" 
          selected={equipamiento.includes('Pesa rusa')}
          onPress={() => toggleEquipamiento('Pesa rusa')}
        />
        <EquipmentButton 
          title="🎒 Bolso con peso" 
          selected={equipamiento.includes('Bolso con peso')}
          onPress={() => toggleEquipamiento('Bolso con peso')}
        />
        <EquipmentButton 
          title="🏋️‍♀️ Barra y discos" 
          selected={equipamiento.includes('Barra y discos')}
          onPress={() => toggleEquipamiento('Barra y discos')}
        />
        <EquipmentButton 
          title="🪑 Silla" 
          selected={equipamiento.includes('Silla ')}
          onPress={() => toggleEquipamiento('Silla')}
        />
        <EquipmentButton 
          title="💧 Botella con agua" 
          selected={equipamiento.includes('Botella con agua')}
          onPress={() => toggleEquipamiento('Botella con agua')}
        />
        <EquipmentButton 
          title="🤸 Colchoneta" 
          selected={equipamiento.includes('Colchoneta')}
          onPress={() => toggleEquipamiento('Colchoneta')}
        />
        <EquipmentButton 
          title="🪢 Cuerda saltar" 
          selected={equipamiento.includes('Cuerda saltar')}
          onPress={() => toggleEquipamiento('Cuerda saltar')}
        />
        <EquipmentButton 
          title="🏀 Balón" 
          selected={equipamiento.includes('Balón')}
          onPress={() => toggleEquipamiento('Balón')}
        />

        
      </View>

      <View style={styles.noEquipmentContainer}>
        <EquipmentButton 
          title="💪 Sin material (Solo peso corporal)" 
          selected={equipamiento.includes('Sin material')}
          onPress={() => toggleEquipamiento('Sin material')}
          fullWidth
          noEquipment
        />
      </View>

      {errors.equipamiento && <Text style={styles.errorText}>{errors.equipamiento}</Text>}

      {equipamiento.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedTitle}>✅ Has seleccionado:</Text>
          <Text style={styles.selectedText}>{equipamiento.join(', ')}</Text>
        </View>
      )}
    </View>
  )

  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.surface, COLORS.background]}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress Bar */}
          <View style={styles.progressBar}>
            {[1, 2, 3, 4, 5].map((s) => (
              <View 
                key={s}
                style={[
                  styles.progressDot,
                  step >= s && styles.progressDotActive
                ]}
              />
            ))}
          </View>

          {/* Steps */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            {step > 1 && (
              <Button
                title="Atrás"
                onPress={() => setStep(step - 1)}
                variant="secondary"
                style={styles.backButton}
              />
            )}
            
            <Button
              title={step === 5 ? 'Finalizar' : 'Continuar'}
              onPress={handleNextStep}
              loading={loading}
              style={styles.nextButton}
            />
          </View>

          {step === 1 && (
            <Button
              title="¿Ya tienes cuenta? Inicia sesión"
              onPress={() => navigation.goBack()}
              variant="outline"
              style={styles.loginButton}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

// Componente para opciones simples
function OptionButton({ title, selected, onPress, fullWidth }) {
  return (
    <TouchableOpacity
      style={[
        styles.optionButton,
        selected && styles.optionButtonSelected,
        fullWidth && styles.optionButtonFull
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.optionText,
        selected && styles.optionTextSelected
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  )
}

// Componente especial para equipamiento
function EquipmentButton({ title, selected, onPress, fullWidth, noEquipment }) {
  return (
    <TouchableOpacity
      style={[
        styles.equipmentButton,
        selected && styles.equipmentButtonSelected,
        fullWidth && styles.equipmentButtonFull,
        noEquipment && styles.noEquipmentButton,
        noEquipment && selected && styles.noEquipmentButtonSelected
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.equipmentText,
        selected && styles.equipmentTextSelected,
        noEquipment && styles.noEquipmentText
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  progressDot: {
    width: 32,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepContainer: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 8,
  },
  labelWithEmoji: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 8,
  },
  helperText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  optionsColumn: {
    gap: 8,
    marginBottom: 16,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  optionButtonFull: {
    flex: 'none',
    width: '100%',
  },
  optionButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDark + '20',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  optionTextSelected: {
    color: COLORS.primary,
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  equipmentButton: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    minWidth: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  equipmentButtonFull: {
    width: '100%',
    minWidth: '100%',
  },
  equipmentButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDark + '15',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
  },
  equipmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  equipmentTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  noEquipmentContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  noEquipmentButton: {
    borderColor: COLORS.textSecondary,
    backgroundColor: COLORS.background,
    borderStyle: 'dashed',
  },
  noEquipmentButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDark + '10',
    borderStyle: 'solid',
  },
  noEquipmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedContainer: {
    backgroundColor: COLORS.primary + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    marginTop: 8,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6,
  },
  selectedText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  loginButton: {
    marginTop: 12,
  },
})