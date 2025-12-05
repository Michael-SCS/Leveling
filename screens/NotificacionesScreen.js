import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as Notifications from 'expo-notifications'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { COLORS } from '../constants/colors'
import { supabase } from '../lib/supabase'

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export default function NotificacionesScreen({ navigation }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [permisosHabilitados, setPermisosHabilitados] = useState(false)

  // Estados de notificaciones
  const [notifRutinas, setNotifRutinas] = useState(false)
  const [notifProgreso, setNotifProgreso] = useState(false)
  const [notifMotivacion, setNotifMotivacion] = useState(false)
  const [notifRecordatorios, setNotifRecordatorios] = useState(false)
  const [notifNivel, setNotifNivel] = useState(false)
  const [notifSemanal, setNotifSemanal] = useState(false)
  const [horaRecordatorio, setHoraRecordatorio] = useState('08:00')

  useEffect(() => {
    checkNotificationPermissions()
    loadNotificationSettings()
  }, [])

  const checkNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync()
    setPermisosHabilitados(status === 'granted')
  }

  const requestNotificationPermissions = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permisos Necesarios',
        'Para recibir notificaciones, necesitas habilitar los permisos en la configuración de tu dispositivo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Configuración', onPress: () => Linking.openSettings() }
        ]
      )
      return false
    }
    
    setPermisosHabilitados(true)
    return true
  }

  const loadNotificationSettings = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigation.replace('Login')
        return
      }
      setUser(user)

      const { data: settings, error } = await supabase
        .from('notificaciones_config')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.log('Error cargando notificaciones:', error)
      }

      if (settings) {
        setNotifRutinas(settings.rutinas_nuevas ?? false)
        setNotifProgreso(settings.progreso_semanal ?? false)
        setNotifMotivacion(settings.mensajes_motivacion ?? false)
        setNotifRecordatorios(settings.recordatorios_entrenamiento ?? false)
        setNotifNivel(settings.cambio_nivel ?? false)
        setNotifSemanal(settings.resumen_semanal ?? false)
        setHoraRecordatorio(settings.hora_recordatorio || '08:00')
      }
    } catch (error) {
      console.log('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const scheduleNotifications = async () => {
    if (!permisosHabilitados) {
      const granted = await requestNotificationPermissions()
      if (!granted) return
    }

    // Cancelar todas las notificaciones programadas anteriormente
    await Notifications.cancelAllScheduledNotificationsAsync()

    // Programar recordatorios diarios
    if (notifRecordatorios) {
      const [hours, minutes] = horaRecordatorio.split(':').map(Number)
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💪 ¡Hora de Entrenar!',
          body: 'No olvides completar tu rutina de hoy. ¡Tú puedes!',
          sound: true,
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      })
    }

    // Notificación motivacional diaria (9 AM)
    if (notifMotivacion) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 Mensaje del Día',
          body: 'El único entrenamiento malo es el que no hiciste. ¡Vamos!',
          sound: true,
        },
        trigger: {
          hour: 9,
          minute: 0,
          repeats: true,
        },
      })
    }

    // Resumen semanal (Domingos 8 PM)
    if (notifSemanal) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📊 Resumen Semanal',
          body: 'Revisa tu progreso de esta semana en la app',
          sound: true,
        },
        trigger: {
          weekday: 1, // Domingo
          hour: 20,
          minute: 0,
          repeats: true,
        },
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const configData = {
        user_id: user.id,
        rutinas_nuevas: notifRutinas,
        progreso_semanal: notifProgreso,
        mensajes_motivacion: notifMotivacion,
        recordatorios_entrenamiento: notifRecordatorios,
        cambio_nivel: notifNivel,
        resumen_semanal: notifSemanal,
        hora_recordatorio: horaRecordatorio,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('notificaciones_config')
        .upsert(configData, { onConflict: 'user_id' })

      if (error) throw error

      // Programar las notificaciones locales
      await scheduleNotifications()

      Alert.alert(
        '✅ Configuración Guardada',
        'Tus notificaciones han sido configuradas correctamente',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
    } catch (error) {
      console.log('Error guardando:', error)
      Alert.alert('Error', 'No se pudieron guardar las preferencias')
    } finally {
      setSaving(false)
    }
  }

  const sendTestNotification = async () => {
    if (!permisosHabilitados) {
      const granted = await requestNotificationPermissions()
      if (!granted) return
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 Notificación de Prueba',
        body: '¡Las notificaciones funcionan correctamente!',
        sound: true,
      },
      trigger: { seconds: 2 },
    })

    Alert.alert('✅ Enviada', 'Recibirás la notificación en 2 segundos')
  }

  const NotificationOption = ({ icon, title, description, value, onValueChange, iconColor }) => (
    <View style={styles.notificationItem}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
        <MaterialIcons name={icon} size={24} color={iconColor || COLORS.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.border, true: COLORS.primary + '60' }}
        thumbColor={value ? COLORS.primary : COLORS.card}
        ios_backgroundColor={COLORS.border}
      />
    </View>
  )

  const TimeOption = ({ time, onPress, selected }) => (
    <TouchableOpacity
      style={[styles.timeOption, selected && styles.timeOptionSelected]}
      onPress={onPress}
    >
      <Text style={[styles.timeText, selected && styles.timeTextSelected]}>{time}</Text>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const allDisabled = !notifRutinas && !notifProgreso && !notifMotivacion && !notifRecordatorios && !notifNivel && !notifSemanal

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <LinearGradient colors={[COLORS.primary, '#2A9D8F']} style={styles.header}>
        <View style={{ paddingTop: STATUS_BAR_HEIGHT }}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notificaciones</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Estado de Permisos */}
        {!permisosHabilitados && (
          <TouchableOpacity 
            style={styles.permissionCard}
            onPress={requestNotificationPermissions}
          >
            <MaterialIcons name="notifications-off" size={24} color={COLORS.error} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.permissionTitle}>Permisos Desactivados</Text>
              <Text style={styles.permissionText}>Toca aquí para habilitar las notificaciones</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.error} />
          </TouchableOpacity>
        )}

        {permisosHabilitados && (
          <View style={styles.infoCard}>
            <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
            <Text style={[styles.infoText, { color: '#4CAF50' }]}>
              Permisos habilitados correctamente
            </Text>
          </View>
        )}

        {/* Botón de Prueba */}
        <TouchableOpacity 
          style={styles.testButton}
          onPress={sendTestNotification}
        >
          <MaterialIcons name="notifications-active" size={20} color={COLORS.primary} />
          <Text style={styles.testButtonText}>Enviar Notificación de Prueba</Text>
        </TouchableOpacity>

        {/* Notificaciones de Entrenamiento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏋️ Entrenamiento</Text>
          
          <NotificationOption
            icon="fitness-center"
            title="Nuevas Rutinas"
            description="Te avisaremos cuando tengamos rutinas nuevas (Manual)"
            value={notifRutinas}
            onValueChange={setNotifRutinas}
            iconColor="#FF6B6B"
          />

          <NotificationOption
            icon="alarm"
            title="Recordatorios Diarios"
            description="Recordatorio diario para entrenar (Local)"
            value={notifRecordatorios}
            onValueChange={setNotifRecordatorios}
            iconColor="#4ECDC4"
          />
        </View>

        {/* Horario de Recordatorios */}
        {notifRecordatorios && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ Hora de Recordatorio</Text>
            <View style={styles.timeOptionsContainer}>
              <TimeOption time="06:00" selected={horaRecordatorio === '06:00'} onPress={() => setHoraRecordatorio('06:00')} />
              <TimeOption time="08:00" selected={horaRecordatorio === '08:00'} onPress={() => setHoraRecordatorio('08:00')} />
              <TimeOption time="12:00" selected={horaRecordatorio === '12:00'} onPress={() => setHoraRecordatorio('12:00')} />
              <TimeOption time="18:00" selected={horaRecordatorio === '18:00'} onPress={() => setHoraRecordatorio('18:00')} />
              <TimeOption time="20:00" selected={horaRecordatorio === '20:00'} onPress={() => setHoraRecordatorio('20:00')} />
            </View>
          </View>
        )}

        {/* Notificaciones de Progreso */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Progreso</Text>
          
          <NotificationOption
            icon="trending-up"
            title="Progreso Semanal"
            description="Análisis de tu progreso (Próximamente)"
            value={notifProgreso}
            onValueChange={setNotifProgreso}
            iconColor="#95E1D3"
          />

          <NotificationOption
            icon="emoji-events"
            title="Cambios de Nivel"
            description="Te avisaremos cuando puedas subir (Manual)"
            value={notifNivel}
            onValueChange={setNotifNivel}
            iconColor="#FFD93D"
          />

          <NotificationOption
            icon="assessment"
            title="Resumen Semanal"
            description="Estadísticas cada domingo (Local)"
            value={notifSemanal}
            onValueChange={setNotifSemanal}
            iconColor="#A8E6CF"
          />
        </View>

        {/* Notificaciones Motivacionales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💪 Motivación</Text>
          
          <NotificationOption
            icon="favorite"
            title="Mensajes Motivacionales"
            description="Frases inspiradoras diarias (Local)"
            value={notifMotivacion}
            onValueChange={setNotifMotivacion}
            iconColor="#FF8C94"
          />
        </View>

        {/* Estado Actual */}
        {allDisabled && (
          <View style={[styles.infoCard, { backgroundColor: COLORS.error + '10', borderColor: COLORS.error + '30' }]}>
            <MaterialIcons name="notifications-off" size={20} color={COLORS.error} />
            <Text style={[styles.infoText, { color: COLORS.error }]}>
              Todas las notificaciones están desactivadas
            </Text>
          </View>
        )}

        {/* Botón Guardar */}
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
              <Text style={styles.saveButtonText}>Guardar y Programar</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Nota sobre tipos de notificaciones */}
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>ℹ️ Tipos de Notificaciones:</Text>
          <Text style={styles.legendItem}>• <Text style={styles.legendBold}>Local:</Text> Se programan en tu dispositivo</Text>
          <Text style={styles.legendItem}>• <Text style={styles.legendBold}>Manual:</Text> Las enviamos cuando ocurra el evento</Text>
          <Text style={styles.legendItem}>• <Text style={styles.legendBold}>Próximamente:</Text> Función en desarrollo</Text>
        </View>
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
  permissionCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.error + '10',
    borderWidth: 1,
    borderColor: COLORS.error + '30',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: 2,
  },
  permissionText: {
    fontSize: 13,
    color: COLORS.error,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  testButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
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
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 3,
  },
  optionDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  timeOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeOption: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  timeOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  timeTextSelected: {
    color: COLORS.white,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
  legendCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  legendItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  legendBold: {
    fontWeight: '600',
    color: COLORS.text,
  },
})