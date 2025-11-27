import React, { useState } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  TouchableOpacity
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'
import AuthInput from '../components/AuthInput'
import Button from '../components/Button'
import { COLORS } from '../constants/colors'

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
  const [nivel, setNivel] = useState('')
  const [diasSemana, setDiasSemana] = useState('')
  const [tiempoSesion, setTiempoSesion] = useState('')
  const [lugarEntrenamiento, setLugarEntrenamiento] = useState('')

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
    if (!nivel) newErrors.nivel = 'Selecciona tu nivel'
    if (!diasSemana) newErrors.diasSemana = 'Indica cuántos días entrenarás'
    if (!tiempoSesion) newErrors.tiempoSesion = 'Indica el tiempo por sesión'
    if (!lugarEntrenamiento) newErrors.lugarEntrenamiento = 'Selecciona dónde entrenarás'
    
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
      handleRegister()
    }
  }

  const handleRegister = async () => {
    setLoading(true)
    try {
      // 1. Registrar usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      })

      if (authError) throw authError

      // 2. Guardar información adicional del usuario
      const { error: profileError } = await supabase
        .from('usuarios_info')
        .insert([{
          user_id: authData.user.id,
          nombre_completo: nombreCompleto,
          edad: parseInt(edad),
          genero: genero,
          peso_actual: parseFloat(peso),
          altura: parseFloat(altura),
          objetivo: objetivo,
          nivel: nivel,
          dias_semana: parseInt(diasSemana),
          tiempo_sesion: parseInt(tiempoSesion),
          lugar_entrenamiento: lugarEntrenamiento,
        }])

      if (profileError) throw profileError

      Alert.alert(
        '¡Registro exitoso!', 
        'Tu cuenta ha sido creada. Por favor verifica tu email.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      )
      
    } catch (error) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Crea tu cuenta</Text>
      <Text style={styles.stepSubtitle}>Paso 1 de 4</Text>

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
      <Text style={styles.stepSubtitle}>Paso 2 de 4</Text>

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
      <Text style={styles.stepSubtitle}>Paso 3 de 4</Text>

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
      <Text style={styles.stepSubtitle}>Paso 4 de 4</Text>

      <Text style={styles.label}>¿Cuál es tu objetivo principal?</Text>
      <View style={styles.optionsColumn}>
        <OptionButton 
          title="Perder peso" 
          selected={objetivo === 'Perder peso'}
          onPress={() => setObjetivo('Perder peso')}
          fullWidth
        />
        <OptionButton 
          title="Ganar músculo" 
          selected={objetivo === 'Ganar músculo'}
          onPress={() => setObjetivo('Ganar músculo')}
          fullWidth
        />
        <OptionButton 
          title="Mejorar resistencia" 
          selected={objetivo === 'Mejorar resistencia'}
          onPress={() => setObjetivo('Mejorar resistencia')}
          fullWidth
        />
        <OptionButton 
          title="Mantenerme en forma" 
          selected={objetivo === 'Mantenerme en forma'}
          onPress={() => setObjetivo('Mantenerme en forma')}
          fullWidth
        />
      </View>
      {errors.objetivo && <Text style={styles.errorText}>{errors.objetivo}</Text>}

      <Text style={styles.label}>¿Cuál es tu nivel?</Text>
      <View style={styles.optionsRow}>
        <OptionButton 
          title="Principiante" 
          selected={nivel === 'Principiante'}
          onPress={() => setNivel('Principiante')}
        />
        <OptionButton 
          title="Intermedio" 
          selected={nivel === 'Intermedio'}
          onPress={() => setNivel('Intermedio')}
        />
        <OptionButton 
          title="Avanzado" 
          selected={nivel === 'Avanzado'}
          onPress={() => setNivel('Avanzado')}
        />
      </View>
      {errors.nivel && <Text style={styles.errorText}>{errors.nivel}</Text>}

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
        >
          {/* Progress Bar */}
          <View style={styles.progressBar}>
            {[1, 2, 3, 4].map((s) => (
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
              title={step === 4 ? 'Finalizar' : 'Continuar'}
              onPress={handleNextStep}
              loading={loading}
              style={styles.nextButton}
            />
          </View>

          {step === 1 && (
            <Button
              title="¿Ya tienes cuenta? Inicia sesión"
              onPress={() => navigation.navigate('Login')}
              variant="outline"
              style={styles.loginButton}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

// Componente para opciones
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
    width: 40,
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