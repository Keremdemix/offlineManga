import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import MangaScreen from '../screens/MangaScreen';

export type RootStackParamList = {
  Home: undefined;
  Manga: { mangaLink: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Manga" component={MangaScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;