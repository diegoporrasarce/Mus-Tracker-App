import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GroupScreen({ route, navigation }) {
  const { name } = route.params;
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Estados para controlar la edición de la partida
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editPointsA, setEditPointsA] = useState('');
  const [editPointsB, setEditPointsB] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadGroupData);
    return unsubscribe;
  }, [navigation]);

  const loadGroupData = async () => {
    const data = await AsyncStorage.getItem(`data-${name}`);
    if (data) {
      const parsed = JSON.parse(data);
      setPlayers(parsed.players || []);
      
      // Ordenación: Las más recientes arriba, las más antiguas abajo
      const sortedMatches = (parsed.matches || []).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setMatches(sortedMatches);
    }
  };

  const deleteMatch = async (indexToDelete) => {
    Alert.alert(
      '¿Eliminar partida?',
      '¿Estás seguro de que quieres eliminar esta partida?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const data = await AsyncStorage.getItem(`data-${name}`);
            if (!data) return;

            const parsed = JSON.parse(data);
            const updatedMatches = matches.filter((_, index) => index !== indexToDelete);
            
            parsed.matches = updatedMatches;
            await AsyncStorage.setItem(`data-${name}`, JSON.stringify(parsed));
            setMatches(updatedMatches);
          },
        },
      ]
    );
  };

  // Abre el modal cargando el resultado actual
  const openEditModal = (item, index) => {
    setEditingIndex(index);
    const [scoreA, scoreB] = item.result.split('-');
    setEditPointsA(scoreA || '');
    setEditPointsB(scoreB || '');
    setIsModalVisible(true);
  };

  // Guarda el nuevo resultado editado
  const saveEditedMatch = async () => {
    const pa = parseInt(editPointsA);
    const pb = parseInt(editPointsB);

    if (isNaN(pa) || editPointsA.trim() === '' || isNaN(pb) || editPointsB.trim() === '') {
      Alert.alert('Error', 'Introduce una puntuación válida.');
      return;
    }

    const data = await AsyncStorage.getItem(`data-${name}`);
    if (!data) return;
    const parsed = JSON.parse(data);

    const updatedMatches = [...matches];
    updatedMatches[editingIndex] = {
      ...updatedMatches[editingIndex],
      result: `${pa}-${pb}`,
      winner: pa > pb ? 'A' : pb > pa ? 'B' : 'Empate'
    };

    parsed.matches = updatedMatches;
    await AsyncStorage.setItem(`data-${name}`, JSON.stringify(parsed));
    
    setMatches(updatedMatches);
    setIsModalVisible(false);
    setEditingIndex(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grupo: {name}</Text>

      <Button
        title="Editar jugadores"
        onPress={() => navigation.navigate('AñadirJugadores', { groupName: name })}
      />
      <Text style={styles.sectionText}>
        Jugadores: {players.length > 0 ? players.join(', ') : 'Ninguno'}
      </Text>

      <View style={{ marginVertical: 10 }}>
        <Button
          title="Registrar Partida"
          onPress={() => navigation.navigate('RegistrarPartida', { groupName: name })}
        />
      </View>

      <View style={{ marginBottom: 10 }}>
        <Button
          title="Estadísticas"
          onPress={() => navigation.navigate('Estadísticas', { groupName: name })}
        />
      </View>

      <View style={{ marginBottom: 10 }}>
        <Button
          title="Elegir parejas aleatorias"
          onPress={() => navigation.navigate('ParejasAleatorias', { groupName: name })}
        />
      </View>

      <Button
        title={showHistory ? 'Ocultar historial' : 'Ver historial'}
        onPress={() => setShowHistory(!showHistory)}
      />

      {showHistory && (
        <>
          <Text style={styles.sectionTitle}>Historial de partidas</Text>
          <FlatList
            data={matches}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => {
              // Desglosamos el resultado original (ej: "1-3")
              const [scoreA, scoreB] = item.result.split('-');

              // 🔀 Lógica dinámica: Si ganó la Pareja B, invertimos el orden visualmente
              const isWinnerB = item.winner === 'B';
              
              const firstTeam = isWinnerB ? item.teamB : item.teamA;
              const secondTeam = isWinnerB ? item.teamA : item.teamB;
              
              const firstScore = isWinnerB ? scoreB : scoreA;
              const secondScore = isWinnerB ? scoreA : scoreB;

              // Destacamos en negrita al primero siempre que no sea un empate
              const isFirstBold = item.winner === 'A' || item.winner === 'B';

              return (
                <View style={styles.matchItem}>
                  <TouchableOpacity 
                    onPress={() => openEditModal(item, index)} 
                    style={{ flex: 1 }}
                    activeOpacity={0.7}
                  >
                    <Text>
                      <Text style={styles.dateText}>
                        {new Date(item.date).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                      {/* El resultado ahora se ajusta mostrando siempre la puntuación del ganador primero */}
                      {' - Resultado: '}{`${firstScore}-${secondScore}`}
                    </Text>
                    
                    {/* El ganador siempre sale impreso al principio y en negrita */}
                    <Text style={styles.teamsRow}>
                      <Text style={isFirstBold ? styles.boldText : styles.normalText}>
                        {firstTeam.join(' y ')}
                      </Text>
                      <Text style={styles.normalText}> vs </Text>
                      <Text style={styles.normalText}>
                        {secondTeam.join(' y ')}
                      </Text>
                    </Text>

                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => deleteMatch(index)}
                    style={styles.deleteButton}
                  >
                    <Text style={{ color: 'red' }}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={{ marginTop: 10 }}>Aún no hay partidas</Text>}
          />
        </>
      )}

      {/* MODAL DE EDICIÓN */}
      <Modal visible={isModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Resultado</Text>
            <View style={styles.modalRow}>
              <View style={styles.modalInputBox}>
                <Text style={{ marginBottom: 5 }}>Pareja A</Text>
                <TextInput
                  keyboardType="numeric"
                  value={editPointsA}
                  onChangeText={setEditPointsA}
                  style={styles.modalInput}
                />
              </View>
              <View style={styles.modalInputBox}>
                <Text style={{ marginBottom: 5 }}>Pareja B</Text>
                <TextInput
                  keyboardType="numeric"
                  value={editPointsB}
                  onChangeText={setEditPointsB}
                  style={styles.modalInput}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 15, marginTop: 10 }}>
              <Button title="Cancelar" color="#888" onPress={() => setIsModalVisible(false)} />
              <Button title="Guardar" onPress={saveEditedMatch} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 10, paddingBottom: 60, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  sectionText: { marginTop: 10, fontStyle: 'italic', color: '#444' },
  matchItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 5, paddingVertical: 5 },
  deleteButton: { marginLeft: 10, padding: 10 },
  dateText: { color: '#007AFF', fontWeight: 'bold' },
  teamsRow: { marginTop: 4, fontSize: 14 },
  boldText: { fontWeight: 'bold', color: '#000' },
  normalText: { fontWeight: 'normal', color: '#555' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 8, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20 },
  modalInputBox: { alignItems: 'center', width: '40%' },
  modalInput: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 5, width: '100%', textAlign: 'center', fontSize: 16 },
});