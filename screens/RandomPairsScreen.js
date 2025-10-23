import React, { useState, useEffect } from 'react';
import {
  View, Text, Button, StyleSheet, TouchableOpacity, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RandomPairsScreen({ route }) {
  const { groupName } = route.params;
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [pairs, setPairs] = useState(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    const data = await AsyncStorage.getItem(`data-${groupName}`);
    if (data) {
      const parsed = JSON.parse(data);
      setPlayers(parsed.players || []);
    }
  };

  const togglePlayer = (name) => {
    if (selected.includes(name)) {
      setSelected(selected.filter(p => p !== name));
    } else if (selected.length < 4) {
      setSelected([...selected, name]);
    }
  };

  const generatePairs = () => {
    if (selected.length !== 4) return;

    const shuffled = [...selected].sort(() => Math.random() - 0.5);
    setPairs({
      teamA: [shuffled[0], shuffled[1]],
      teamB: [shuffled[2], shuffled[3]],
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Elegir 4 jugadores</Text>

      {players.map(player => (
        <TouchableOpacity
          key={player}
          onPress={() => togglePlayer(player)}
          style={[
            styles.listItem,
            selected.includes(player) && styles.selectedItem
          ]}
        >
          <Text>{player}</Text>
        </TouchableOpacity>
      ))}

      <View style={{ marginVertical: 20 }}>
        <Button
          title="Generar parejas"
          onPress={generatePairs}
        />
      </View>

      {pairs && (
        <View>
          <Text style={styles.result}>Pareja A: {pairs.teamA.join(' & ')}</Text>
          <Text style={styles.result}>Pareja B: {pairs.teamB.join(' & ')}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  listItem: {
    padding: 10,
    marginVertical: 5,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  selectedItem: {
    backgroundColor: '#c0ffc0',
  },
  result: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 5,
    textAlign: 'center',
  },
});
