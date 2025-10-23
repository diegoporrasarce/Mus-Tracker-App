import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import GroupScreen from './screens/GroupScreen';
import RegisterMatchScreen from './screens/RegisterMatchScreen';
import AddPlayersScreen from './screens/AddPlayersScreen';
import StatsScreen from './screens/StatsScreen';
import RandomPairsScreen from './screens/RandomPairsScreen';


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Inicio" component={HomeScreen} />
        <Stack.Screen name="Grupo" component={GroupScreen} />
        <Stack.Screen name="RegistrarPartida" component={RegisterMatchScreen} />
        <Stack.Screen name="AñadirJugadores" component={AddPlayersScreen} />
        <Stack.Screen name="Estadísticas" component={StatsScreen} />
        <Stack.Screen name="ParejasAleatorias" component={RandomPairsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

