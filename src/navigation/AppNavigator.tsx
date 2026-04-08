import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import MangaScreen from '../screens/MangaScreen';
import AllMangasScreen from '../screens/AllMangasScreen'; 


export type RootStackParamList = {
  Home: undefined;
  Manga: { mangaLink: string };
  AllMangas: { mangas: any[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Manga" component={MangaScreen} />
        <Stack.Screen name="AllMangas" component={AllMangasScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;