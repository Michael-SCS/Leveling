import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
  Alert,
  Animated,
  Image,
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

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const fadeAnim = useState(new Animated.Value(0))[0]
  const slideAnim = useState(new Animated.Value(50))[0]

  useEffect(() => {
    checkSession()
    
    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      navigation.replace('Dashboard')
    }
  }

  const validateForm = () => {
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
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (error) throw error

      Alert.alert('¡Éxito!', 'Has iniciado sesión correctamente')
      
    } catch (error) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

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
          {/* Header con Logo - Animado */}
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.logoContainer}>
              <View style={styles.logoGlow} />
              <Image 
                source={require('../assets/images/FITFLOW.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            
            <Text style={styles.title}>Bienvenido de nuevo</Text>
            <Text style={styles.appName}>FITFLOW</Text>
            <View style={styles.subtitleContainer}>
              <View style={styles.accentLine} />
              <Text style={styles.subtitle}>
                Transforma tu cuerpo, transforma tu vida
              </Text>
              <View style={styles.accentLine} />
            </View>
          </Animated.View>

          {/* Form Card - Animado */}
          <Animated.View 
            style={[
              styles.formCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Iniciar Sesión</Text>
              <View style={styles.formAccent} />
            </View>
            
            <View style={styles.inputsContainer}>
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

              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={() => {/* Navegar a recuperar contraseña */}}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title="Iniciar Sesión"
                onPress={handleLogin}
                loading={loading}
                style={styles.loginButton}
              />
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerCircle}>
                <Text style={styles.dividerText}>o</Text>
              </View>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="Crear cuenta nueva"
              onPress={() => navigation.navigate('Register')}
              variant="outline"
              style={styles.registerButton}
            />
          </Animated.View>

          {/* Footer */}
          <View style={styles.footerContainer}>
            <Text style={styles.footer}>
              Al continuar, aceptas nuestros{' '}
              <Text 
                style={styles.footerLink}
                onPress={() => {
                  Alert.alert(
                    'Términos y Condiciones',
                    'Términos y Condiciones de FITFLOW (v1.0.0)\n\n' +
                    '1. Aceptación de Términos\n' +
                    'Al usar esta aplicación, aceptas estos términos y condiciones. Si no estás de acuerdo, no uses la aplicación.\n\n' +
                    '2. Descargo de Responsabilidad Médica\n' +
                    'La información proporcionada en esta aplicación es solo para fines informativos y de fitness. NO sustituye el consejo, diagnóstico o tratamiento médico profesional. Siempre consulta a un médico antes de comenzar cualquier programa de ejercicios o hacer cambios en tu dieta.\n\n' +
                    '3. Datos del Usuario\n' +
                    'Tus datos personales, incluyendo métricas y progreso, se almacenan de forma segura (usando Supabase) únicamente para proporcionarte el servicio de rutinas personalizadas.\n\n' +
                    '4. Modificaciones del Servicio\n' +
                    'Nos reservamos el derecho de modificar o descontinuar el servicio (o cualquier parte de su contenido) sin previo aviso en cualquier momento.\n\n' +
                    '5. Derechos de Autor\n' +
                    'Todo el contenido de la aplicación es propiedad nuestra y está protegido por derechos de autor.\n\n' +
                    'Al continuar usando la app, confirmas que has leído y aceptado estos términos.',
                    [{ text: 'Entendido', style: 'default' }],
                    { cancelable: true }
                  )
                }}
              >
                términos y condiciones
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    marginBottom: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    opacity: 0.15,
    transform: [{ scale: 1.1 }],
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 3,
    marginBottom: 12,
    textShadowColor: COLORS.primary + '40',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  accentLine: {
    width: 30,
    height: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '10',
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  formAccent: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  inputsContainer: {
    marginBottom: 20,
    gap: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  buttonContainer: {
    marginTop: 12,
  },
  loginButton: {
    height: 58,
    borderRadius: 18,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
    position: 'relative',
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: COLORS.textMuted + '30',
  },
  dividerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: -18,
    zIndex: 1,
  },
  dividerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  registerButton: {
    height: 58,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  footerContainer: {
    marginTop: 'auto',
    paddingTop: 24,
    paddingBottom: 8,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
})