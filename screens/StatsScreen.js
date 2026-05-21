import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Button, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function StatsScreen({ route }) {
  const { groupName } = route.params;
  const [playerStats, setPlayerStats] = useState([]);
  const [pairStats, setPairStats] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [showPairs, setShowPairs] = useState(false);
  
  // 🔄 Estado para rotar la última columna: 'partidas' -> 'juegos' -> 'dif'
  const [columnMode, setColumnMode] = useState('partidas');

  // 🔀 Estado para controlar el ordenamiento de los jugadores: 'normal' (% Vic) o 'dif' (Diferencia)
  const [sortMode, setSortMode] = useState('normal');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await AsyncStorage.getItem(`data-${groupName}`);
    if (!data) return;

    const parsed = JSON.parse(data);
    const players = parsed.players || [];
    const matches = parsed.matches || [];

    setTotalMatches(matches.length);

    // Estadísticas individuales
    const playerData = players.map(player => {
      let wins = 0;
      let losses = 0;
      let gamesWon = 0;

      matches.forEach(match => {
        const isInTeamA = match.teamA.includes(player);
        const isInTeamB = match.teamB.includes(player);

        const isWinner =
          (match.winner === 'A' && isInTeamA) ||
          (match.winner === 'B' && isInTeamB);
        const isLoser =
          (match.winner === 'A' && isInTeamB) ||
          (match.winner === 'B' && isInTeamA);

        if (isWinner) wins++;
        else if (isLoser) losses++;

        // Calcular juegos ganados
        if (match.result) {
          const [scoreA, scoreB] = match.result.split('-').map(Number);
          if (isInTeamA && !isNaN(scoreA)) {
            gamesWon += scoreA;
          } else if (isInTeamB && !isNaN(scoreB)) {
            gamesWon += scoreB;
          }
        }
      });

      const total = wins + losses;
      const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '—';
      
      // Calcular diferencia numérica y en texto
      const diff = wins - losses;
      const diffStr = diff > 0 ? `+${diff}` : `${diff}`;

      return {
        player,
        winRate,
        wins,
        losses,
        total,
        gamesWon,
        diffStr,
        diff, // ← Guardamos el número limpio para poder ordenar por él
      };
    });

    // Guardamos los datos base
    setPlayerStats(playerData);

    // Estadísticas por pareja
    const pairMap = {};

    matches.forEach(match => {
      const pairs = [match.teamA, match.teamB];
      pairs.forEach((team, i) => {
        const sortedTeam = [...team].sort();
        const key = sortedTeam.join(' & ');

        if (!pairMap[key]) {
          pairMap[key] = { wins: 0, total: 0 };
        }

        const won = (i === 0 && match.winner === 'A') || (i === 1 && match.winner === 'B');
        if (won) pairMap[key].wins++;
        pairMap[key].total++;
      });
    });

    const pairArray = Object.entries(pairMap).map(([pair, { wins, total }]) => {
      const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '—';
      return {
        pair,
        winRate,
        total,
      };
    });

    setPairStats(pairArray.sort((a, b) => b.winRate - a.winRate));
  };

  // Función para alternar el orden al pulsar "Jugador"
  const toggleJugadorSort = () => {
    setSortMode(prev => (prev === 'normal' ? 'dif' : 'normal'));
  };

  // Función para rotar de modo al hacer click en el título de la última columna
  const rotateColumnMode = () => {
    setColumnMode(prev => {
      if (prev === 'partidas') return 'juegos';
      if (prev === 'juegos') return 'dif';
      return 'partidas';
    });
  };

  // 📊 Ordenamos dinámicamente la lista de jugadores antes de pintarla según el modo activo
  const sortedPlayerStats = [...playerStats].sort((a, b) => {
    if (sortMode === 'dif') {
      return b.diff - a.diff; // Ordena por diferencia de partidas ganadas-perdidas
    }
    // Modo normal: Ordena por % de victorias
    const rateA = a.winRate === '—' ? -1 : parseFloat(a.winRate);
    const rateB = b.winRate === '—' ? -1 : parseFloat(b.winRate);
    return rateB - rateA;
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Estadísticas - {groupName}</Text>

      {/* Cabecera de la Tabla de Jugadores */}
      <View style={styles.tableHeader}>
        {/* Ahora "Jugador" es un botón interactivo, pero mantiene tu formato original negro y limpio */}
        <TouchableOpacity style={styles.cell} onPress={toggleJugadorSort} activeOpacity={0.8}>
          <Text style={styles.bold}>Jugador</Text>
        </TouchableOpacity>
        
        <Text style={[styles.stylesCellcustom || styles.cell, styles.bold]}>% V</Text>
        <Text style={[styles.cell, styles.bold]}>V / D</Text>
        
        <TouchableOpacity style={styles.cell} onPress={rotateColumnMode} activeOpacity={0.8}>
          <Text style={styles.bold}>
            {columnMode === 'partidas' ? 'Partidas' : columnMode === 'juegos' ? 'Juegos' : 'Dif'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filas de la Tabla de Jugadores (Usa la lista ordenada dinámicamente) */}
      {sortedPlayerStats.length > 0 ? (
        sortedPlayerStats.map(item => (
          <View style={styles.tableRow} key={item.player}>
            <Text style={styles.cell}>{item.player}</Text>
            <Text style={styles.cell}>{item.winRate}%</Text>
            <Text style={styles.cell}>{item.wins} / {item.losses}</Text>
            
            <Text style={styles.cell}>
              {columnMode === 'partidas' ? item.total : columnMode === 'juegos' ? item.gamesWon : item.diffStr}
            </Text>
          </View>
        ))
      ) : (
        <Text style={{ marginTop: 10 }}>Sin estadísticas de jugadores</Text>
      )}

      <Text style={styles.totalText}>Partidas totales jugadas: {totalMatches}</Text>

      {/* Botón Ver estadísticas parejas */}
      <View style={{ marginVertical: 5 }}>
        <Button
          title={showPairs ? 'Ocultar estadísticas parejas' : 'Ver estadísticas parejas'}
          onPress={() => setShowPairs(!showPairs)}
        />
      </View>

      {/* Sección expandible de Parejas */}
      {showPairs && (
        <View style={{ marginTop: 15 }}>
          <Text style={styles.subtitle}>Todas las parejas</Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.bold]}>Pareja</Text>
            <Text style={[styles.cell, styles.bold]}>% V</Text>
            <Text style={[styles.cell, styles.bold]}>Partidas</Text>
          </View>

          {pairStats.length > 0 ? (
            pairStats.map(item => (
              <View style={styles.tableRow} key={item.pair}>
                <Text style={styles.cell}>{item.pair}</Text>
                <Text style={styles.cell}>{item.winRate}%</Text>
                <Text style={styles.cell}>{item.total}</Text>
              </View>
            ))
          ) : (
            <Text style={{ marginTop: 10 }}>Aún no hay parejas registradas</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  totalText: {
    fontSize: 16,
    marginTop: 20,
    marginBottom: 15,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    paddingBottom: 5,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  cell: {
    flex: 1,
    fontSize: 14,
  },
  bold: {
    fontWeight: 'bold',
  },
});