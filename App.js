import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { Text, View } from 'react-native'

import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'
import DashboardScreen from './screens/DashboardScreen'
import RutinasScreen from './screens/RutinasScreen'
import AlimentacionScreen from './screens/AlimentacionScreen'
import PerfilScreen from './screens/PerfilScreen'
import { COLORS } from './constants/colors'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

// -------------------------------------------
// 1) Cargar las fuentes
// -------------------------------------------

export default function App() {
  const [fontsLoaded] = useFonts({
    Montserrat: require('./assets/fonts/Montserrat.ttf'),
    Oswald: require('./assets/fonts/Oswald.ttf'),
    Poppins: require('./assets/fonts/Poppins.ttf'),
  })

  if (!fontsLoaded) return null // evita parpadeo y errores

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Dashboard" component={MainTabs} />
          
        </Stack.Navigator>
      </NavigationContainer>
    </>
  )
}

// -------------------------------------------
// Tabs (menú inferior)
// -------------------------------------------

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
          fontFamily: 'Poppins', // ← ya usa tu fuente
        },
      }}
    >
      <Tab.Screen 
        name="Inicio" 
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <TabIcon icon="🏠" color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Rutinas" 
        component={RutinasScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <TabIcon icon="💪" color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Alimentación" 
        component={AlimentacionScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <TabIcon icon="🍎" color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Perfil" 
        component={PerfilScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <TabIcon icon="👤" color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

// -------------------------------------------
// Iconos
// -------------------------------------------

function TabIcon({ icon, color }) {
  return (
    <Text style={{ 
      fontSize: 24, 
      opacity: color === COLORS.primary ? 1 : 0.5,
      fontFamily: 'Oswald' // ← Fuente bonita para los iconos
    }}>
      {icon}
    </Text>
  )
}
