// ProgressHistoryScreen.jsx
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import { COLORS } from '../constants/colors'
import { supabase } from '../lib/supabase'

// IMPORTAR LIBRERÍA DE GRÁFICOS
// Para usar gráficos reales, debes instalar una librería como react-native-chart-kit:
// npm install react-native-chart-kit react-native-svg

// Si quieres una implementación sencilla, puedes simular los datos del gráfico:
// import { LineChart } from 'react-native-chart-kit' 

const { width } = Dimensions.get('window')
const chartWidth = width - 40; // Ancho de la pantalla menos el padding

export default function ProgressHistoryScreen() {
  const [loading, setLoading] = useState(true)
  const [historial, setHistorial] = useState([])
  const [metricasGlobales, setMetricasGlobales] = useState({
    totalEntrenamientos: 0,
    totalCalorias: 0,
    rachaMaxima: 0,
  })

  useEffect(() => {
    loadHistorial()
  }, [])

  const calcularRachaMaxima = (entrenamientos) => {
    if (!entrenamientos || entrenamientos.length === 0) return 0;

    // Obtener las fechas únicas y ordenarlas cronológicamente
    const fechasUnicas = Array.from(new Set(entrenamientos.map(e => e.fecha)))
      .sort((a, b) => new Date(a) - new Date(b));
    
    let maxStreak = 0;
    let currentStreak = 0;
    let previousDate = null;

    fechasUnicas.forEach(currentDateStr => {
      const currentDate = new Date(currentDateStr);
      
      if (previousDate) {
        // Calcular la diferencia en días
        const diffTime = currentDate.getTime() - previousDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Día consecutivo
          currentStreak++;
        } else if (diffDays > 1) {
          // Ruptura de racha
          currentStreak = 1;
        }
      } else {
        // Primer día registrado
        currentStreak = 1;
      }

      maxStreak = Math.max(maxStreak, currentStreak);
      previousDate = currentDate;
    });

    return maxStreak;
  }


  const loadHistorial = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // 1. OBTENER TODO EL HISTORIAL COMPLETO
      // Nota: Si usaste un ID de la rutina como TEXT en entrenamientos_completados, 
      // necesitarás cambiar 'rutina_id' a algo que se pueda mostrar (ej. un JOIN a rutinas(nombre))
      const { data: entrenamientos, error } = await supabase
        .from('entrenamientos_completados')
        .select(`
          id, 
          fecha, 
          duracion_minutos, 
          calorias_quemadas, 
          xp_ganada, 
          rutinas (nombre)
        `)
        .eq('user_id', user.id)
        .order('fecha', { ascending: false })

      if (error) throw error
      
      setHistorial(entrenamientos || [])
      
      // 2. CALCULAR MÉTRICAS GLOBALES
      const totalEntrenamientos = (entrenamientos || []).length
      const totalCalorias = (entrenamientos || []).reduce(
        (sum, item) => sum + (item.calorias_quemadas || 0), 0
      )
      
      const rachaMaxima = calcularRachaMaxima(entrenamientos);
      
      setMetricasGlobales({
        totalEntrenamientos,
        totalCalorias,
        rachaMaxima,
      })

    } catch (error) {
      console.log('Error cargando historial:', error)
      Alert.alert('Error', 'No se pudo cargar el historial de progreso.')
    } finally {
      setLoading(false)
    }
  }

  // Componente para renderizar cada item del historial
  const renderHistorialItem = ({ item }) => (
    <LinearGradient
        colors={[COLORS.card, COLORS.card + 'aa']}
        style={styles.historialCard}
    >
        <Text style={styles.historialDate}>📅 {item.fecha}</Text>
        <Text style={styles.historialTitle}>
            {item.rutinas ? item.rutinas.nombre : 'Rutina Eliminada'}
        </Text>
        <View style={styles.historialStats}>
            <Text style={styles.historialDetail}>⏱️ {item.duracion_minutos} min</Text>
            <Text style={styles.historialDetail}>🔥 {item.calorias_quemadas} Kcal</Text>
            <Text style={styles.historialXP}>⭐ +{item.xp_ganada} XP</Text>
        </View>
    </LinearGradient>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando tu historial...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Mi Progreso 📈</Text>

      {/* Resumen de Métricas */}
      <View style={styles.metricsContainer}>
        <View style={[styles.metricCard, { borderBottomColor: COLORS.primary }]}>
          <Text style={styles.metricNumber}>{metricasGlobales.totalEntrenamientos}</Text>
          <Text style={styles.metricLabel}>Total Entrenos</Text>
        </View>
        <View style={[styles.metricCard, { borderBottomColor: '#FFD93D' }]}>
          <Text style={styles.metricNumber}>{metricasGlobales.totalCalorias}</Text>
          <Text style={styles.metricLabel}>Total Calorías</Text>
        </View>
        <View style={[styles.metricCard, { borderBottomColor: '#4ECDC4' }]}>
          <Text style={styles.metricNumber}>{metricasGlobales.rachaMaxima}</Text>
          <Text style={styles.metricLabel}>Racha Máxima (días)</Text>
        </View>
      </View>

      {/* Sección de Gráficos (Simulación) */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Tendencia de Esfuerzo</Text>
        
        {/*
          // COMENTAR ESTO HASTA QUE INSTALES 'react-native-chart-kit'
          {historial.length >= 3 ? (
             <LineChart
                data={{
                  labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'], // Debes generar las etiquetas de forma dinámica
                  datasets: [
                    {
                      data: [20, 45, 28, 80, 99, 43], // Debes agregar las calorías/XP por mes
                    },
                  ],
                }}
                width={chartWidth}
                height={220}
                yAxisLabel="Cal"
                chartConfig={{
                  backgroundColor: COLORS.card,
                  backgroundGradientFrom: COLORS.card,
                  backgroundGradientTo: COLORS.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.8})`,
                  style: { borderRadius: 16 },
                  propsForDots: { r: '6', strokeWidth: '2', stroke: COLORS.primary },
                }}
                bezier
                style={{ marginVertical: 8, borderRadius: 16 }}
              />
          ) : (
            <Text style={styles.emptyChartText}>
                {historial.length} / 3 registros necesarios para mostrar el gráfico de tendencia.
            </Text>
          )}
        */}
        
        <Text style={styles.emptyChartText}>
            Instala 'react-native-chart-kit' para habilitar el gráfico.
        </Text>

      </View>
      
      {/* Historial Detallado */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Entrenamientos Recientes</Text>
        {historial.length === 0 ? (
            <Text style={styles.emptyText}>¡No has completado ningún entrenamiento aún!</Text>
        ) : (
            <FlatList 
                data={historial}
                renderItem={renderHistorialItem}
                // Usamos el ID del entrenamiento_completado para la key
                keyExtractor={(item) => item.id.toString()} 
                scrollEnabled={false} 
            />
        )}
      </View>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 16, fontSize: 16, color: COLORS.textSecondary },
  
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, marginBottom: 20 },
  
  metricsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, marginHorizontal: -5 },
  metricCard: { 
    flex: 1, 
    backgroundColor: COLORS.card, 
    padding: 15, 
    borderRadius: 12, 
    marginHorizontal: 5, 
    alignItems: 'center', 
    borderBottomWidth: 4, // Para darle un toque de color basado en la métrica
  },
  metricNumber: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  metricLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  
  section: { marginBottom: 30 },
  chartSection: { marginBottom: 30, padding: 15, backgroundColor: COLORS.card, borderRadius: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 15 },
  emptyChartText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 20 },
  
  historialCard: { 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 10, 
    borderLeftWidth: 4, 
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  historialDate: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  historialTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  historialStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  historialDetail: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  historialXP: { fontSize: 13, color: '#FFD93D', fontWeight: 'bold' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20 },
})