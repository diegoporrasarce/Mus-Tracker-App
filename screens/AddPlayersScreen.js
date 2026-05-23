import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AddPlayersScreen({ route, navigation }) {
  const { groupName } = route.params;
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]); 
  const [newPlayer, setNewPlayer] = useState('');

  // Estados para el Modal de edición de nombre
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [oldName, setOldName] = useState('');
  const [editName, setEditName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await AsyncStorage.getItem(`data-${groupName}`);
    if (data) {
      const parsed = JSON.parse(data);
      setPlayers(parsed.players || []);
      setMatches(parsed.matches || []); 
    }
  };

  const addPlayer = () => {
    const trimmed = newPlayer.trim();
    if (!trimmed) return;
    if (players.includes(trimmed)) {
      Alert.alert('Error', 'Ese jugador ya existe en el grupo.');
      return;
    }
    setPlayers([...players, trimmed]);
    setNewPlayer('');
  };

  const deletePlayer = (name) => {
    Alert.alert(
      '¿Eliminar jugador?',
      `¿Seguro que quieres eliminar a ${name} del grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setPlayers(players.filter(p => p !== name));
          }
        }
      ]
    );
  };

  // Abrir ventana para editar el nombre
  const openEditModal = (name) => {
    setOldName(name);
    setEditName(name);
    setIsEditModalVisible(true);
  };

  // Guardar el nuevo nombre del jugador
  const saveEditedPlayer = () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === oldName) {
      setIsEditModalVisible(false);
      return;
    }
    if (players.includes(trimmed)) {
      Alert.alert('Error', 'Ya existe otro jugador con ese nombre.');
      return;
    }

    const updatedPlayers = players.map(p => (p === oldName ? trimmed : p));
    setPlayers(updatedPlayers);

    const updatedMatches = matches.map(match => {
      return {
        ...match,
        teamA: match.teamA.map(p => (p === oldName ? trimmed : p)),
        teamB: match.teamB.map(p => (p === oldName ? trimmed : p))
      };
    });
    setMatches(updatedMatches);

    setIsEditModalVisible(false);
  };

  const finishSetup = async () => {
    if (players.length < 4) {
      Alert.alert('Atención', 'Debes añadir al menos 4 jugadores para jugar al Mus.');
      return;
    }

    await AsyncStorage.setItem(`data-${groupName}`, JSON.stringify({
      players,
      matches 
    }));

    const groups = await AsyncStorage.getItem('musGroups');
    const parsed = groups ? JSON.parse(groups) : [];
    if (!parsed.includes(groupName)) {
      parsed.push(groupName);
      await AsyncStorage.setItem('musGroups', JSON.stringify(parsed));
    }

    navigation.navigate('Grupo', { name: groupName });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Jugadores para "{groupName}"</Text>

      <TextInput
        placeholder="Nombre del jugador"
        value={newPlayer}
        onChangeText={setNewPlayer}
        style={styles.input}
        onSubmitEditing={addPlayer} 
      />
      <Button title="Añadir jugador" onPress={addPlayer} />

      <FlatList
        data={players}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.playerItem}>
            {/* Si pulsas en el nombre, lo editas, aunque ahora visualmente sea texto normal */}
            <TouchableOpacity onPress={() => openEditModal(item)} style={{ flex: 1 }} activeOpacity={0.6}>
              <Text style={styles.playerName}>{item}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => deletePlayer(item)}>
              <Text style={styles.deleteText}>X</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={{ marginTop: 10 }}>Sin jugadores aún.</Text>}
        style={{ marginTop: 20 }}
      />

      <View style={{ marginTop: 30 }}>
        <Button title="Guardar grupo" onPress={finishSetup} />
      </View>

      {/* MODAL PARA EDITAR NOMBRE */}
      <Modal visible={isEditModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Nombre</Text>
            
            <TextInput
              value={editName}
              onChangeText={setEditName}
              style={styles.modalInput}
              autoFocus={true}
            />
            
            <View style={{ flexDirection: 'row', gap: 15, marginTop: 20 }}>
              <Button title="Cancelar" color="#888" onPress={() => setIsEditModalVisible(false)} />
              <Button title="Guardar" onPress={saveEditedPlayer} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 10, paddingBottom: 80, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5, fontSize: 16 },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  playerName: {
    fontSize: 16,
    color: '#000', // Negro como pedías
  },
  deleteText: {
    fontSize: 18,
    color: 'black', // X normal y negra
    paddingHorizontal: 15,
  },
  
  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    width: '100%',
    fontSize: 16,
  },
});