import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { COLORS } from '../constants/colors'
import { supabase } from '../lib/supabase'

const { width } = Dimensions.get('window')
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;

// OPCIÓN 1: TARJETAS CON ICONOS MODERNOS Y GRADIENTES SUAVES
const DetailCard = ({ icon, label, value, gradient = [COLORS.primary + '15', COLORS.primary + '05'] }) => (
  <View style={styles.detailCard}>
    <LinearGradient colors={gradient} style={styles.detailCardGradient}>
      <View style={styles.detailCardIcon}>
        <MaterialIcons name={icon} size={24} color={COLORS.primary} />
      </View>
      <View style={styles.detailCardContent}>
        <Text style={styles.detailCardLabel}>{label}</Text>
        <Text style={styles.detailCardValue}>{value}</Text>
      </View>
    </LinearGradient>
  </View>
)

const StatCard = ({ icon, label, value, color = COLORS.primary }) => (
  <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
    <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
      <MaterialIcons name={icon} size={20} color={color} />
    </View>
    <View style={styles.statContent}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  </View>
)

const OptionItem = ({ icon, text, onPress, isLast = false, isDestructive = false, iconBg }) => (
  <TouchableOpacity
    style={[styles.optionButton, isLast && { borderBottomWidth: 0 }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.optionIconContainer, { backgroundColor: iconBg || (isDestructive ? COLORS.error + '15' : COLORS.primary + '15') }]}>
      <MaterialIcons name={icon} size={22} color={isDestructive ? COLORS.error : COLORS.primary} />
    </View>
    <Text style={[styles.optionText, isDestructive && { color: COLORS.error }]}>{text}</Text>
    <MaterialIcons name="chevron-right" size={24} color={COLORS.textSecondary} style={{ opacity: 0.5 }} />
  </TouchableOpacity>
)

export default function PerfilScreen({ navigation }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [puedeSubir, setPuedeSubir] = useState(false)
  const [checkingNivel, setCheckingNivel] = useState(false)

  useEffect(() => { loadUserData() }, [])
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => loadUserData())
    return unsubscribe
  }, [navigation])

  const loadUserData = async () => { 
    setLoading(true); 
    try { 
      const { data: { user } } = await supabase.auth.getUser(); 
      if (!user) { 
        navigation.replace('Login'); 
        return; 
      } 
      setUser(user); 
      const { data: info, error } = await supabase 
        .from('usuarios_info') 
        .select('*') 
        .eq('user_id', user.id) 
        .single(); 
      if (error && error.code !== 'PGRST116') throw error; 
      setUserInfo(info); 
      checkNivelProgress(user.id); 
    } catch (error) { 
      console.log('Error cargando datos:', error) 
    } finally { 
      setLoading(false) 
    } 
  }

  const checkNivelProgress = async (userId) => { 
    setPuedeSubir(false); 
    try { 
      const { data, error } = await supabase.rpc('puede_subir_nivel', { usuario_id: userId }); 
      if (!error && data === true) setPuedeSubir(true); 
    } catch (error) { 
      console.log(error) 
    } 
  }

  const handleSubirNivel = async () => { 
    setCheckingNivel(true); 
    try { 
      const { data, error } = await supabase.rpc('subir_nivel', { usuario_id: user.id }); 
      if (error) throw error; 
      Alert.alert('¡Nivel Subido! 🚀', `¡Felicidades! Ahora eres nivel ${data}.`, [{ text: 'Genial', onPress: () => loadUserData() }]); 
    } catch (error) { 
      Alert.alert('Error', 'No se pudo subir de nivel.'); 
      loadUserData(); 
    } finally { 
      setCheckingNivel(false); 
    } 
  }

  const actualizarNivel = async (nuevoNivel) => { 
    try { 
      const { error } = await supabase 
        .from('usuarios_info') 
        .update({ nivel: nuevoNivel, updated_at: new Date().toISOString() }) 
        .eq('user_id', user.id); 
      if (error) throw error; 
      Alert.alert('✅ Actualizado', `Tu nivel ahora es: ${nuevoNivel}`); 
      loadUserData(); 
    } catch (error) { 
      Alert.alert('Error', 'No se pudo actualizar.'); 
    } 
  }

  const showLevelOptions = () => { 
    const options = [ 
      { text: 'Cancelar', style: 'cancel' }, 
      { text: 'Principiante', onPress: () => actualizarNivel('Principiante') }, 
      { text: 'Intermedio', onPress: () => actualizarNivel('Intermedio') }, 
      { text: 'Avanzado', onPress: () => actualizarNivel('Avanzado') } 
    ]; 
    if (puedeSubir && userInfo?.nivel !== 'Avanzado') { 
      options.splice(1, 0, { text: '🚀 Subir de Nivel (Automático)', onPress: () => Alert.alert('Confirmar', '¿Subir de nivel?', [{ text: 'No' }, { text: 'Sí', onPress: handleSubirNivel }]) }); 
    } 
    Alert.alert('Gestión de Nivel', 'Selecciona una acción', options) 
  }

  const handleLogout = () => { 
    Alert.alert('Cerrar Sesión', '¿Estás seguro?', [ 
      { text: 'Cancelar', style: 'cancel' }, 
      { text: 'Salir', style: 'destructive', onPress: async () => { 
        await supabase.auth.signOut(); 
        navigation.replace('Login') 
      } } 
    ]); 
  }

  const calcularIMC = () => { 
    if (userInfo?.peso_actual && userInfo?.altura) { 
      const h = userInfo.altura / 100; 
      return (userInfo.peso_actual / (h * h)).toFixed(1); 
    } 
    return '--'; 
  }

  const getImcClassification = (imc) => { 
    const value = parseFloat(imc); 
    if (isNaN(value)) { 
      return { text: 'N/A', color: COLORS.textSecondary }; 
    } 
    if (value < 18.5) { 
      return { text: 'Bajo Peso', color: '#ffb74d' }; 
    } 
    if (value >= 18.5 && value <= 24.9) { 
      return { text: 'Saludable', color: '#4CAF50' }; 
    } 
    if (value >= 25.0 && value <= 29.9) { 
      return { text: 'Sobrepeso', color: '#ff9800' }; 
    } 
    if (value >= 30.0) { 
      return { text: 'Obesidad', color: COLORS.error }; 
    } 
    return { text: 'Indefinido', color: COLORS.textSecondary }; 
  };

  const showTermsAndConditions = () => {
    const terms = `Términos y Condiciones de FITFLOW (v1.0.0)

1. Aceptación de Términos
Al usar esta aplicación, aceptas estos términos y condiciones. Si no estás de acuerdo, no uses la aplicación.

2. Descargo de Responsabilidad Médica
La información proporcionada en esta aplicación es solo para fines informativos y de fitness. NO sustituye el consejo, diagnóstico o tratamiento médico profesional. Siempre consulta a un médico antes de comenzar cualquier programa de ejercicios o hacer cambios en tu dieta.

3. Datos del Usuario
Tus datos personales, incluyendo métricas y progreso, se almacenan de forma segura (usando Supabase) únicamente para proporcionarte el servicio de rutinas personalizadas.

4. Modificaciones del Servicio
Nos reservamos el derecho de modificar o descontinuar el servicio (o cualquier parte de su contenido) sin previo aviso en cualquier momento.

5. Derechos de Autor
Todo el contenido de la aplicación es propiedad nuestra y está protegido por derechos de autor.

Al continuar usando la app, confirmas que has leído y aceptado estos términos.`

    Alert.alert(
      'Términos y Condiciones',
      terms,
      [{ text: 'Entendido' }]
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const imcValue = calcularIMC();
  const imcClassification = getImcClassification(imcValue);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* HEADER CON DISEÑO MINIMALISTA MODERNO */}
        <LinearGradient
          colors={[COLORS.primary, '#2A9D8F']} 
          style={styles.headerBackground}
        >
          <View style={{ paddingTop: STATUS_BAR_HEIGHT + 20 }}> 
            <View style={styles.profileHeaderContent}>
              
              {/* Avatar más grande y moderno */}
              <View style={styles.avatarContainer}>
                <View style={styles.avatarBorder}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {userInfo?.nombre_completo?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.editAvatarButton} 
                    onPress={() => navigation.navigate('EditarPerfil')}
                  >
                    <MaterialIcons name="edit" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Información del usuario centrada */}
              <View style={styles.userInfoContainer}>
                <Text style={styles.userName}>{userInfo?.nombre_completo || 'Usuario'}</Text>
                {/* <Text style={styles.userEmail}>{user?.email || ''}</Text> */}
              </View>

            </View>
          </View>
        </LinearGradient>

        {/* MÉTRICAS (SIN CAMBIOS - TE GUSTA COMO ESTÁ) */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>PESO</Text>
            <Text style={styles.metricValue}>{userInfo?.peso_actual || '--'} <Text style={styles.metricUnit}>kg</Text></Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>ALTURA</Text>
            <Text style={styles.metricValue}>{userInfo?.altura || '--'} <Text style={styles.metricUnit}>cm</Text></Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>IMC</Text>
            <Text style={[styles.metricValue, { color: imcClassification.color }]}>{imcValue}</Text>
            <Text style={[styles.imcClassification, { color: imcClassification.color }]}>{imcClassification.text}</Text>
          </View>
        </View>

        {/* ESTADÍSTICAS DE ENTRENAMIENTO - DISEÑO NUEVO */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>💪 Tu Entrenamiento</Text>
          <View style={styles.statsGrid}>
            <StatCard 
              icon="calendar-today" 
              label="Frecuencia semanal" 
              value={`${userInfo?.dias_semana || 0} días`}
              color="#4CAF50"
            />
            <StatCard 
              icon="timer" 
              label="Duración por sesión preferida" 
              value={`${userInfo?.tiempo_sesion || 0} min`}
              color="#FF9800"
            />
          </View>
        </View>

        {/* PERFIL FITNESS - TARJETAS CON GRADIENTES */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🎯 Tu Perfil Fitness</Text>
          <View style={styles.detailCardsContainer}>
            <DetailCard 
              icon="flag" 
              label="Mi objetivo" 
              value={userInfo?.objetivo || 'No definido'}
              gradient={['#4CAF5015', '#4CAF5005']}
            />
            <DetailCard 
              icon="location-on" 
              label="Lugar de entrenamiento favorito" 
              value={userInfo?.lugar_entrenamiento || 'No definido'}
              gradient={['#2196F315', '#2196F305']}
            />
            <DetailCard 
              icon="cake" 
              label="Edad" 
              value={`${userInfo?.edad || '--'} años`}
              gradient={['#FF980015', '#FF980005']}
            />
            <DetailCard 
              icon="person" 
              label="Género" 
              value={userInfo?.genero || '--'}
              gradient={['#9C27B015', '#9C27B005']}
            />
          </View>
        </View>

        {/* OPCIONES CON ICONOS DE COLORES */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>⚙️ Configuración</Text>
          <View style={styles.optionsCard}>
            <OptionItem 
              icon="edit" 
              text="Editar Perfil" 
              onPress={() => navigation.navigate('EditarPerfil')}
              iconBg="#4CAF5015"
            />
            <OptionItem 
              icon="description" 
              text="Términos y Condiciones" 
              onPress={showTermsAndConditions}
              iconBg="#2196F315"
              isLast
            />
          </View>
        </View>

        {/* BOTÓN DE CERRAR SESIÓN MODERNO */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <View style={styles.logoutIconContainer}>
            <MaterialIcons name="logout" size={20} color={COLORS.error} />
          </View>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>FitFlow v1.0.0</Text>

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
  
  // HEADER REDISEÑADO - MÁS MODERNO Y CENTRADO
  headerBackground: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  profileHeaderContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarBorder: {
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 70,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  avatarText: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.primary,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  userInfoContainer: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 12,
    textAlign: 'center',
  },
  levelBadgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    gap: 6,
  },
  levelTextNew: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5252',
  },

  // MÉTRICAS (SIN CAMBIOS)
  metricsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 10,
    marginTop: -25,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: 'normal',
    color: COLORS.textSecondary,
  },
  metricDivider: {
    width: 1,
    height: '70%',
    backgroundColor: COLORS.border,
  },
  imcClassification: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // SECCIONES
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 16,
    letterSpacing: 0.3,
  },

  // STATS GRID - NUEVO DISEÑO
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.3,
  },

  // DETAIL CARDS - NUEVO DISEÑO CON GRADIENTES
  detailCardsContainer: {
    gap: 12,
  },
  detailCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  detailCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  detailCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: COLORS.border + '40',
  },
  detailCardContent: {
    flex: 1,
  },
  detailCardLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailCardValue: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.2,
  },

  // OPCIONES
  optionsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '40',
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },

  // LOGOUT BUTTON MEJORADO
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: COLORS.error + '12',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  logoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoutText: {
    color: COLORS.error,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  versionText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 24,
    opacity: 0.6,
    fontWeight: '600',
  },
})