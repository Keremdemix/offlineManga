// navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import MangaScreen from '../screens/MangaScreen';
import AllMangasScreen from '../screens/AllMangasScreen';
import ChaptersScreen from '../screens/ChaptersScreen';

export type RootStackParamList = {
  Home: undefined;
  Manga: {
    mangaLink: string;
    localPages?: string[]; // indirilmişse local dosyalar
  };
  Chapters: { mangaTitle: string };
  AllMangas: { mangas: any[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0a0a0a' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#0a0a0a' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Chapters"
          component={ChaptersScreen}
          options={({ route }) => ({ title: route.params.mangaTitle })}
        />
        <Stack.Screen
          name="Manga"
          component={MangaScreen}
          options={{ title: 'Okuma' }}
        />
        <Stack.Screen
          name="AllMangas"
          component={AllMangasScreen}
          options={{ title: 'Tüm Mangalar' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
