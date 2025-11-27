import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS } from '../constants/colors'

export default function AlimentacionScreen() {
  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.surface]}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Alimentación</Text>
        <Text style={styles.subtitle}>Powered by IA</Text>

        <View style={styles.comingSoonCard}>
          <Text style={styles.comingSoonIcon}>🤖</Text>
          <Text style={styles.comingSoonTitle}>Próximamente</Text>
          <Text style={styles.comingSoonText}>
            Aquí podrás obtener planes de alimentación personalizados con ayuda de Inteligencia Artificial
          </Text>
          
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🍎</Text>
              <Text style={styles.featureText}>Planes personalizados</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📊</Text>
              <Text style={styles.featureText}>Seguimiento de macros</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🥗</Text>
              <Text style={styles.featureText}>Recetas saludables</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>💡</Text>
              <Text style={styles.featureText}>Consejos con IA</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  comingSoonCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  comingSoonIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  comingSoonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresContainer: {
    width: '100%',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
})