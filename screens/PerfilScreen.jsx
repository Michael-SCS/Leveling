import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions, // Para cambiar el color de la barra
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

// Definimos la altura del Status Bar para usarla en el padding
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;

// --- COMPONENTES MODULARES (Sin cambios) ---

const DetailGridItem = ({ icon, label, value }) => (
  <View style={styles.detailItem}>
    <View style={styles.detailIconBox}>
      <Text style={styles.detailEmoji}>{icon}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
    </View>
  </View>
)

const OptionItem = ({ icon, text, onPress, isLast = false, isDestructive = false }) => (
  <TouchableOpacity
    style={[
      styles.optionButton,
      isLast && { borderBottomWidth: 0 }
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.optionIconContainer, isDestructive && styles.optionIconDestructive]}>
      <MaterialIcons name={icon} size={22} color={isDestructive ? COLORS.error : COLORS.primary} />
    </View>
    <Text style={[styles.optionText, isDestructive && { color: COLORS.error }]}>{text}</Text>
    <MaterialIcons name="chevron-right" size={24} color={COLORS.textSecondary} style={{ opacity: 0.5 }} />
  </TouchableOpacity>
)

// --- FUNCIÓN PRINCIPAL ---

export default function PerfilScreen({ navigation }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [puedeSubir, setPuedeSubir] = useState(false)
  const [checkingNivel, setCheckingNivel] = useState(false)

  // --- LÓGICA DE DATOS (Mantenida) ---

  useEffect(() => { loadUserData() }, [])
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => loadUserData())
    return unsubscribe
  }, [navigation])

  const loadUserData = async () => { /* ... */ setLoading(true); try { const { data: { user } } = await supabase.auth.getUser(); if (!user) { navigation.replace('Login'); return; } setUser(user); const { data: info, error } = await supabase .from('usuarios_info') .select('*') .eq('user_id', user.id) .single(); if (error && error.code !== 'PGRST116') throw error; setUserInfo(info); checkNivelProgress(user.id); } catch (error) { console.log('Error cargando datos:', error) } finally { setLoading(false) } }
  const checkNivelProgress = async (userId) => { /* ... */ setPuedeSubir(false); try { const { data, error } = await supabase.rpc('puede_subir_nivel', { usuario_id: userId }); if (!error && data === true) setPuedeSubir(true); } catch (error) { console.log(error) } }
  const handleSubirNivel = async () => { /* ... */ setCheckingNivel(true); try { const { data, error } = await supabase.rpc('subir_nivel', { usuario_id: user.id }); if (error) throw error; Alert.alert('¡Nivel Subido! 🚀', `¡Felicidades! Ahora eres nivel ${data}.`, [{ text: 'Genial', onPress: () => loadUserData() }]); } catch (error) { Alert.alert('Error', 'No se pudo subir de nivel.'); loadUserData(); } finally { setCheckingNivel(false); } }
  const actualizarNivel = async (nuevoNivel) => { /* ... */ try { const { error } = await supabase .from('usuarios_info') .update({ nivel: nuevoNivel, updated_at: new Date().toISOString() }) .eq('user_id', user.id); if (error) throw error; Alert.alert('✅ Actualizado', `Tu nivel ahora es: ${nuevoNivel}`); loadUserData(); } catch (error) { Alert.alert('Error', 'No se pudo actualizar.'); } }
  const showLevelOptions = () => { /* ... */ const options = [ { text: 'Cancelar', style: 'cancel' }, { text: 'Principiante', onPress: () => actualizarNivel('Principiante') }, { text: 'Intermedio', onPress: () => actualizarNivel('Intermedio') }, { text: 'Avanzado', onPress: () => actualizarNivel('Avanzado') } ]; if (puedeSubir && userInfo?.nivel !== 'Avanzado') { options.splice(1, 0, { text: '🚀 Subir de Nivel (Automático)', onPress: () => Alert.alert('Confirmar', '¿Subir de nivel?', [{ text: 'No' }, { text: 'Sí', onPress: handleSubirNivel }]) }); } Alert.alert('Gestión de Nivel', 'Selecciona una acción', options) }
  const handleLogout = () => { /* ... */ Alert.alert('Cerrar Sesión', '¿Estás seguro?', [ { text: 'Cancelar', style: 'cancel' }, { text: 'Salir', style: 'destructive', onPress: async () => { await supabase.auth.signOut(); navigation.replace('Login') } } ]); }
  const calcularIMC = () => { /* ... */ if (userInfo?.peso_actual && userInfo?.altura) { const h = userInfo.altura / 100; return (userInfo.peso_actual / (h * h)).toFixed(1); } return '--'; }
  const getImcClassification = (imc) => { /* ... */ const value = parseFloat(imc); if (isNaN(value)) { return { text: 'N/A', color: COLORS.textSecondary }; } if (value < 18.5) { return { text: 'Bajo Peso', color: '#ffb74d' }; } if (value >= 18.5 && value <= 24.9) { return { text: 'Saludable', color: '#4CAF50' }; } if (value >= 25.0 && value <= 29.9) { return { text: 'Sobrepeso', color: '#ff9800' }; } if (value >= 30.0) { return { text: 'Obesidad', color: COLORS.error }; } return { text: 'Indefinido', color: COLORS.textSecondary }; };

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
      {/* 1. STATUS BAR */}
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* 2. HEADER - Ya NO es absoluto y se integra al ScrollView */}
        <LinearGradient
          colors={[COLORS.primary, '#2A9D8F']} 
          style={styles.headerBackground}
        >
          {/* Este padding empuja el contenido debajo de la barra de estado */}
          <View style={{ paddingTop: STATUS_BAR_HEIGHT + 10 }}> 
            <View style={styles.profileHeaderContent}>
              
              <View style={styles.avatarContainerLeft}>
                <View style={styles.avatarBorder}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {userInfo?.nombre_completo?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.editAvatarButton} onPress={() => navigation.navigate('EditarPerfil')}>
                    <MaterialIcons name="edit" size={14} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.textContainerRight}>
                <Text style={styles.userName} numberOfLines={1}>{userInfo?.nombre_completo || 'Usuario'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* --- DIVISOR PARA CLARIDAD --- */}
        
        {/* 3. MÉTRICAS DENTRO DEL SCROLLVIEW (diseño en tarjeta) */}
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
            {/* Diseño IMC mejorado */}
            <Text style={[styles.metricValue, { color: imcClassification.color }]}>{imcValue}</Text>
            <Text style={[styles.imcClassification, { color: imcClassification.color }]}>{imcClassification.text}</Text>
          </View>
        </View>

        {/* --- DIVISOR PARA CLARIDAD --- */}

        {/* 4. INFORMACIÓN EN GRID (Tu Perfil Fitness) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Tu Perfil Fitness</Text>
          <View style={styles.gridContainer}>
            <DetailGridItem icon="🎯" label="Objetivo" value={userInfo?.objetivo || 'No definido'} />
            <DetailGridItem icon="📍" label="Lugar" value={userInfo?.lugar_entrenamiento || 'No definido'} />
            <DetailGridItem icon="📅" label="Frecuencia" value={`${userInfo?.dias_semana || 0} días/sem`} />
            <DetailGridItem icon="⏱️" label="Duración" value={`${userInfo?.tiempo_sesion || 0} min`} />
            <DetailGridItem icon="🎂" label="Edad" value={`${userInfo?.edad || '--'} años`} />
            <DetailGridItem icon="👤" label="Género" value={userInfo?.genero || '--'} />
          </View>
        </View>

        {/* 5. OPCIONES DE CONFIGURACIÓN */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Cuenta y Ajustes</Text>
          <View style={styles.optionsCard}>
            <OptionItem 
              icon="person" 
              text="Editar Perfil" 
              onPress={() => navigation.navigate('EditarPerfil')} 
            />
            <OptionItem 
              icon="info" 
              text="Acerca de la App / Términos" 
              onPress={showTermsAndConditions} 
              isLast 
            />
          </View>
        </View>

        {/* Botón Salir y Versión */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>v1.0.0</Text>

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
  
  // HEADER (YA NO ABSOLUTO)
  headerBackground: {
    paddingHorizontal: 20,
    paddingBottom: 25, // Reducido para acercar el contenido de abajo
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    // El padding superior se maneja directamente en el <View> interno para incluir STATUS_BAR_HEIGHT
  },
  profileHeaderContent: {
    flexDirection: 'row', 
    alignItems: 'center',
    marginTop: 10, // Espacio entre el padding superior y el contenido
  },
  avatarContainerLeft: {
    marginRight: 20,
  },
  textContainerRight: {
    flex: 1, 
    justifyContent: 'center',
  },

  // Avatar y Badge (Sin cambios significativos)
  avatarBorder: {
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 60,
    position: 'relative',
  },
  avatar: {
    width: 90, 
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.text,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: 22, 
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'flex-start', 
  },
  levelEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  levelText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5252',
    marginLeft: 6,
  },

  // MÉTRICAS (AHORA INTEGRADO EN SCROLL)
  metricsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 10,
    // El margen negativo es más pequeño y menos problemático
    marginTop: -20, 
    zIndex: 1, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: 'normal',
    color: COLORS.textSecondary,
  },
  metricDivider: {
    width: 1,
    height: '60%',
    backgroundColor: COLORS.border,
  },
  imcClassification: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },

  // SECCIONES
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 30, // Espacio normal después de la tarjeta de métricas
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    marginLeft: 4,
  },
  
  // GRID DETALLES (Sin cambios)
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%', 
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  detailEmoji: {
    fontSize: 18,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },

  // OPCIONES (Sin cambios)
  optionsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '40', 
  },
  optionIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionIconDestructive: {
    backgroundColor: COLORS.error + '15',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },

  // FOOTER (Sin cambios)
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    padding: 15,
    backgroundColor: COLORS.error + '10', 
    marginHorizontal: 20,
    borderRadius: 12,
  },
  logoutText: {
    color: COLORS.error,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  versionText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 20,
    opacity: 0.5,
  },
})