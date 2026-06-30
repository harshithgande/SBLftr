import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { AppProvider, useApp } from './src/state/AppContext';
import { RootStackParams, TabParams } from './src/types';
import { C } from './src/theme';

import OnboardingScreen from './src/screens/Onboarding';
import TodayScreen from './src/screens/Today';
import PlanScreen from './src/screens/Plan';
import ProgressScreen from './src/screens/Progress';
import ProfileScreen from './src/screens/Profile';
import ActiveWorkoutScreen from './src/screens/ActiveWorkout';
import BuilderScreen from './src/screens/Builder';
import WhatsNewScreen from './src/screens/WhatsNew';

const Stack = createNativeStackNavigator<RootStackParams>();
const Tab = createBottomTabNavigator<TabParams>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Today: '🏠', Plan: '📅', Progress: '📊', Profile: '👤',
  };
  return <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>{icons[name]}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: C.surface, borderTopColor: C.border, borderTopWidth: 1 },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textSec,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Plan" component={PlanScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { state } = useApp();

  if (!state.user) {
    return <OnboardingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="ActiveWorkout"
        component={ActiveWorkoutScreen}
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Builder"
        component={BuilderScreen}
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="WhatsNew"
        component={WhatsNewScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AppProvider>
  );
}
