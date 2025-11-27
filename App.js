import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { Text, View, ActivityIndicator } from 'react-native'
import { 
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins'
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat'
import { AuthProvider, useAuth } from './components/AuthProvider'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'
import DashboardScreen from './screens/DashboardScreen'
import RutinasScreen from './screens/RutinasScreen'
import AlimentacionScreen from './screens/AlimentacionScreen'
import PerfilScreen from './screens/PerfilScreen'
import RutinaDetalleScreen from './screens/RutinaDetalleScreen'
import { COLORS } from './constants/colors'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

// Navegación por tabs (menú inferior)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="Inicio" 
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="🏠" color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Rutinas" 
        component={RutinasScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="💪" color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Alimentación" 
        component={AlimentacionScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="🍎" color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Perfil" 
        component={PerfilScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="👤" color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

// Componente para iconos del tab
function TabIcon({ icon, color }) {
  return (
    <Text style={{ fontSize: 24, opacity: color === COLORS.primary ? 1 : 0.5 }}>
      {icon}
    </Text>
  )
}

// Navegación con verificación de autenticación
function Navigation() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.text, marginTop: 16, fontSize: 16 }}>Cargando...</Text>
      </View>
    )
  }

  return (
    <Stack.Navigator 
      initialRouteName={user ? "Dashboard" : "Login"}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {!user ? (
        // Pantallas de autenticación
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        // Pantallas autenticadas
        <>
          <Stack.Screen name="Dashboard" component={MainTabs} />
          <Stack.Screen 
            name="RutinaDetalle" 
            component={RutinaDetalleScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  )
}

// App principal
export default function App() {
  let [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  })

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.text, marginTop: 16 }}>Cargando fuentes...</Text>
      </View>
    )
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Navigation />
      </NavigationContainer>
    </AuthProvider>
  )
}